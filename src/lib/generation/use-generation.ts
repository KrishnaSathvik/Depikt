// Native image generation — the one shared execution path.
//
// Extracted from GenerateWorkspace so /generate, Prompt Build's inline
// result, and Prompt Critique's inline result all drive the same job
// submission, polling, credit, reference-upload, auth-gate, and job-recovery
// logic instead of three separate implementations. See
// docs/plans/2026-09-10-inline-generation-workspace.md.

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import type { AuthProviderId } from "@/lib/auth/providers";
import { trackEvent } from "@/lib/analytics";
import {
  fileToReferenceState,
  MAX_UPLOAD_BYTES,
  type ReferenceImageState,
} from "@/lib/reference-image";
import {
  createGenerationJob,
  getGenerationJob,
  getGenerationSession,
  getCreditBalance,
  uploadReferenceImage,
  nextPollDelayMs,
  isTerminalStatus,
  GenerationApiError,
  type JobStatusResponse,
  type SessionVersion,
} from "./client";
import type { RoutingHints } from "./model-router";
import type { SourceContextType } from "./job-request";
import { MAX_REFERENCE_IMAGES_V1 } from "./models";
import {
  savePendingGeneration,
  readPendingGeneration,
  clearPendingGeneration,
} from "./pending-generation";

export type GenerationPhase = "idle" | "starting" | "polling" | "result" | "error";

export interface ReferenceEntry {
  local: ReferenceImageState;
  uploadedPath: string | null;
  uploading: boolean;
  /** Upload failed (commonly: not signed in yet). Kept visible, not silently dropped. */
  error?: boolean;
}

export const ERROR_COPY: Record<string, string> = {
  insufficient_credit: "You don't have enough credits for this.",
  auth: "Sign in to generate images.",
  rejected: "The image request was rejected.",
  rate_limited: "Generation is temporarily unavailable. Try again in a moment.",
  unknown: "Generation failed.",
};

// A generation job (especially Sunburst) can run well past a typical page
// load; a refresh or accidental close must not lose track of it. The active
// job id is the only thing that needs to survive — pollJob's first tick
// re-fetches everything else (status, result, model) from the job itself.
// Tab-scoped on purpose: resuming a job left running in a different,
// still-open tab would race two pollers against one job.
const ACTIVE_JOB_KEY = "depikt.generate.activeJobId";
function saveActiveJob(jobId: string) {
  try {
    sessionStorage.setItem(ACTIVE_JOB_KEY, jobId);
  } catch {
    /* private-mode/storage-blocked: resume just won't work, generation itself still does */
  }
}
function clearActiveJob() {
  try {
    sessionStorage.removeItem(ACTIVE_JOB_KEY);
  } catch {
    /* see saveActiveJob */
  }
}
function readActiveJob(): string | null {
  try {
    return sessionStorage.getItem(ACTIVE_JOB_KEY);
  } catch {
    return null;
  }
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
/** e.g. 1024x1280 -> "4:5". Used to label a resumed job's real dimensions. */
export function simplifyRatioLabel(width: number, height: number): string {
  const d = gcd(width, height) || 1;
  return `${width / d}:${height / d}`;
}

export interface SubmitInput {
  prompt: string;
  structuredAspectRatio?: string | null;
  routingHints?: RoutingHints | null;
  sourceVersionId?: string | null;
  /** Reused verbatim only by the pending-auth resume path; omit otherwise. */
  idempotencyKey?: string;
}

export interface UseGenerationOptions {
  sourceContext: { type: SourceContextType; id?: string | null };
}

export function useGeneration({ sourceContext }: UseGenerationOptions) {
  const { user, loading: authLoading, signInWithProvider } = useAuth();
  // Signed-out submit: the provider chooser (AuthGateDialog) is open.
  const [authPrompt, setAuthPrompt] = useState(false);
  // What to show inside the dialog: a muted prompt excerpt and, if the
  // submit had a reference attached, its thumbnail — so a user who is about
  // to authenticate can see Depikt still remembers what they were doing.
  const [authPromptContext, setAuthPromptContext] = useState<{
    sourceType: SourceContextType;
    prompt: string;
    referenceDataUrl: string | null;
  } | null>(null);
  // "exhausted" → the shared OutOfCreditsPanel replaces the generic error.
  const [creditState, setCreditState] = useState<"ok" | "exhausted">("ok");

  const [references, setReferences] = useState<ReferenceEntry[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [phase, setPhase] = useState<GenerationPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatusResponse | null>(null);
  const [versions, setVersions] = useState<SessionVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStart = useRef<number>(0);
  const sourceContextRef = useRef(sourceContext);
  sourceContextRef.current = sourceContext;
  // Remembers the params of the last submit() so regenerate()/applyEdit() can
  // resubmit without the caller re-supplying prompt/ratio/hints.
  const lastParamsRef = useRef<SubmitInput | null>(null);
  const referencesRef = useRef<ReferenceEntry[]>([]);
  referencesRef.current = references;

  // Resume a job left running across a refresh/reopen — see ACTIVE_JOB_KEY.
  // pollJob's own first tick fetches the job's current status (it may
  // already be done) and clears the key once terminal, so this only ever
  // fires the network request an in-flight job actually needs.
  useEffect(() => {
    const activeJobId = readActiveJob();
    if (activeJobId) pollJob(activeJobId);
  }, []);

  // Load the authoritative balance once signed in.
  useEffect(() => {
    if (!user) return;
    getCreditBalance()
      .then((r) => {
        setCredits(r.availableCredits);
        if (r.availableCredits > 0) setCreditState("ok");
      })
      .catch(() => setCredits(null));
  }, [user, phase]);

  // A reference attached before sign-in fails to upload with a 401 and is
  // left flagged `error` rather than dropped — retry it automatically once a
  // session exists, so it doesn't just sit there needing a manual tap.
  useEffect(() => {
    if (!user) return;
    referencesRef.current.forEach((r, i) => {
      if (r.error) retryReferenceUpload(i);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // If a submission was persisted before an OAuth round trip (see
  // submit()'s auth gate below and pending-generation.ts), resume it now
  // that we have a session — even across a hard navigation that remounted
  // this hook entirely. Only the hook instance whose sourceContext matches
  // the pending payload resumes it (Build/Critique/Generate can all be
  // mounted at once, each with its own hook instance).
  useEffect(() => {
    if (!user) return;
    const pending = readPendingGeneration();
    if (!pending || pending.sourceContext.type !== sourceContextRef.current.type) return;
    clearPendingGeneration();
    void resumePendingGeneration(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(
    () => () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    },
    [],
  );

  async function measureDataUrl(
    dataUrl: string,
  ): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  // Upload one reference's data URL and patch its entry in place. On
  // failure (most commonly: not signed in yet) the entry stays visible with
  // its local preview and is flagged for retry rather than silently
  // dropped, so the reference doesn't appear to just vanish.
  async function uploadReference(entry: ReferenceEntry): Promise<boolean> {
    try {
      const { path } = await uploadReferenceImage(entry.local.dataUrl);
      setReferences((prev) =>
        prev.map((r) => (r === entry ? { ...r, uploadedPath: path, uploading: false } : r)),
      );
      return true;
    } catch {
      setReferences((prev) =>
        prev.map((r) => (r === entry ? { ...r, uploading: false, error: true } : r)),
      );
      return false;
    }
  }

  function retryReferenceUpload(index: number) {
    setReferences((prev) => {
      const entry = prev[index];
      if (!entry || !entry.error) return prev;
      const next = prev.map((r, i) => (i === index ? { ...r, uploading: true, error: false } : r));
      void uploadReference(next[index]);
      return next;
    });
  }

  // Shared by the file picker (addReference) and any dataURL source
  // (Library/Gallery/Prompt handoff, pending-generation resume).
  async function addReferenceFromDataUrl(dataUrl: string): Promise<void> {
    if (referencesRef.current.length >= MAX_REFERENCE_IMAGES_V1) return;
    const meta = await measureDataUrl(dataUrl);
    const local: ReferenceImageState = {
      dataUrl,
      file: null,
      intent: "auto",
      meta: meta
        ? { mime: "image/png", width: meta.width, height: meta.height, hasAlpha: false }
        : undefined,
    };
    const entry: ReferenceEntry = { local, uploadedPath: null, uploading: true };
    setReferences((prev) => [...prev, entry]);
    await uploadReference(entry);
  }

  async function addReference(file: File): Promise<void> {
    if (referencesRef.current.length >= MAX_REFERENCE_IMAGES_V1) {
      toast.error(`Up to ${MAX_REFERENCE_IMAGES_V1} reference images`);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Image too large (max 25MB)");
      return;
    }
    const local = await fileToReferenceState(file, "auto");
    const entry: ReferenceEntry = { local, uploadedPath: null, uploading: true };
    setReferences((prev) => [...prev, entry]);
    const ok = await uploadReference(entry);
    if (ok) trackEvent("reference_added", {});
    else toast.error("Couldn't attach the reference image — tap it to retry.");
  }

  function removeReference(index: number) {
    setReferences((prev) => prev.filter((_, i) => i !== index));
  }

  function pollJob(jobId: string) {
    saveActiveJob(jobId);
    pollStart.current = Date.now();
    const tick = async () => {
      try {
        const res = await getGenerationJob(jobId);
        setJob(res);
        if (isTerminalStatus(res.status)) {
          clearActiveJob();
          if (res.status === "succeeded") {
            setPhase("result");
            setActiveVersionId(res.result?.versionId ?? null);
            void getGenerationSession(res.sessionId).then((s) => setVersions(s.versions));
            trackEvent("generation_succeeded", { model: res.model, operation: res.operation });
          } else {
            setPhase("error");
            setErrorMessage(res.errorMessage ?? "Generation failed. Your credit was returned.");
            trackEvent("generation_failed", { model: res.model });
          }
          return;
        }
        pollTimer.current = setTimeout(tick, nextPollDelayMs(Date.now() - pollStart.current));
      } catch {
        pollTimer.current = setTimeout(tick, nextPollDelayMs(Date.now() - pollStart.current));
      }
    };
    setPhase("polling");
    void tick();
  }

  async function submit(input: SubmitInput): Promise<void> {
    const effectivePrompt = input.prompt;
    if (!effectivePrompt.trim()) {
      toast.error("Describe what you want to create");
      return;
    }
    lastParamsRef.current = input;

    if (!user) {
      savePendingGeneration({
        prompt: effectivePrompt,
        referenceDataUrls: referencesRef.current.map((r) => r.local.dataUrl),
        structuredAspectRatio: input.structuredAspectRatio ?? null,
        routingHints: input.routingHints ?? null,
        sourceContext: sourceContextRef.current,
        sourceVersionId: input.sourceVersionId ?? null,
        idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
      });
      // Open the shared provider chooser; chooseAuthProvider() starts OAuth
      // and the pending-generation effect above resumes on return.
      setAuthPromptContext({
        sourceType: sourceContextRef.current.type,
        prompt: effectivePrompt,
        referenceDataUrl: referencesRef.current[0]?.local.dataUrl ?? null,
      });
      setAuthPrompt(true);
      trackEvent("generate_auth_requested", { source: sourceContextRef.current.type });
      return;
    }

    // Pre-empt: a signed-in user with a known zero balance never hits the API.
    if (credits === 0) {
      setCreditState("exhausted");
      trackEvent("credits_exhausted", { source: sourceContextRef.current.type, via: "preempt" });
      return;
    }

    setPhase("starting");
    setErrorMessage(null);
    setCreditState("ok");
    trackEvent("generate_submitted", { source: sourceContextRef.current.type });
    try {
      const idempotencyKey = input.idempotencyKey ?? crypto.randomUUID();
      const referenceAssetIds = referencesRef.current
        .map((r) => r.uploadedPath)
        .filter((p): p is string => !!p);
      // A "generate" operation calls OpenAI's images/generations endpoint,
      // which has no concept of input images at all -- any attached
      // reference would be uploaded, included in the request, and then
      // silently dropped before the actual API call, producing an image
      // unrelated to the reference. Attaching a reference (with or
      // without an existing sourceVersionId) must route through "edit"
      // (images/edits), the only endpoint that accepts image input; the
      // server already supports and expects this (job-request.ts allows
      // "edit" with referenceAssetIds alone, no sourceVersionId needed).
      const res = await createGenerationJob({
        operation: input.sourceVersionId || referenceAssetIds.length > 0 ? "edit" : "generate",
        prompt: effectivePrompt,
        referenceAssetIds,
        sourceVersionId: input.sourceVersionId ?? null,
        sourceContext: sourceContextRef.current,
        idempotencyKey,
        structuredAspectRatio: input.structuredAspectRatio ?? null,
        routingHints: input.routingHints ?? undefined,
      });
      pollJob(res.jobId);
    } catch (err) {
      setPhase("error");
      if (err instanceof GenerationApiError && err.status === 402) {
        // Authoritative: the server refused the reservation.
        setPhase("idle");
        setCreditState("exhausted");
        setCredits(0);
        trackEvent("credits_exhausted", { source: sourceContextRef.current.type, via: "server" });
        return;
      } else if (err instanceof GenerationApiError && err.status === 401) {
        setErrorMessage(ERROR_COPY.auth);
      } else {
        setErrorMessage("Generation is temporarily unavailable.");
      }
    }
  }

  // Re-upload any references the pending payload carried (a hard navigation
  // during OAuth may have remounted this hook, losing the in-memory
  // ReferenceEntry state entirely), then resubmit with the same
  // idempotency key the original click generated.
  async function resumePendingGeneration(pending: ReturnType<typeof readPendingGeneration>) {
    if (!pending) return;
    if (referencesRef.current.length === 0 && pending.referenceDataUrls.length > 0) {
      await Promise.all(pending.referenceDataUrls.map((url) => addReferenceFromDataUrl(url)));
    }
    await submit({
      prompt: pending.prompt,
      structuredAspectRatio: pending.structuredAspectRatio,
      routingHints: pending.routingHints,
      sourceVersionId: pending.sourceVersionId,
      idempotencyKey: pending.idempotencyKey,
    });
  }

  function regenerate() {
    if (!lastParamsRef.current) return;
    trackEvent("regenerate_submitted", {});
    void submit({ ...lastParamsRef.current, sourceVersionId: null, idempotencyKey: undefined });
  }

  function applyEdit(editPrompt: string) {
    if (!editPrompt.trim() || !activeVersionId) return;
    trackEvent("edit_submitted", {});
    void submit({
      prompt: editPrompt,
      structuredAspectRatio: lastParamsRef.current?.structuredAspectRatio ?? null,
      routingHints: lastParamsRef.current?.routingHints ?? null,
      sourceVersionId: activeVersionId,
    });
  }

  function download() {
    const activeVersion = versions.find((v) => v.id === activeVersionId);
    const url = job?.result?.url ?? activeVersion?.url;
    if (!url) return;
    trackEvent("image_downloaded", {});
    const a = document.createElement("a");
    a.href = url;
    a.download = `depikt-${new Date().toISOString().slice(0, 10)}-${(activeVersionId ?? "").slice(0, 8)}.png`;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  }

  function reset() {
    setPhase("idle");
    setErrorMessage(null);
  }

  /**
   * "Open in Generate" from an existing creation: seed the canvas with a
   * version that already exists, ready to edit — no job, no re-upload. See
   * GenerationHandoff.sourceVersion and Account → Creations' "Open in
   * Generate" action.
   */
  function hydrateVersion(version: SessionVersion) {
    setVersions([version]);
    setActiveVersionId(version.id);
    setPhase("result");
  }

  /** Provider picked in AuthGateDialog: start OAuth, keeping the persisted submission. */
  async function chooseAuthProvider(provider: AuthProviderId) {
    const result = await signInWithProvider(
      provider,
      typeof window !== "undefined" ? window.location.href : undefined,
    );
    if (!result.ok) {
      clearPendingGeneration();
      setAuthPrompt(false);
      setAuthPromptContext(null);
      toast.error("Sign-in failed");
      return;
    }
    // In the iframe/popup path the session arrives without a navigation;
    // the resume effect fires on `user` and the dialog closes here.
    if (!result.redirected) {
      setAuthPrompt(false);
      setAuthPromptContext(null);
    }
  }

  /** User closed the chooser without signing in: forget the pending submission. */
  function dismissAuthPrompt() {
    clearPendingGeneration();
    setAuthPrompt(false);
    setAuthPromptContext(null);
  }

  const activeVersion = versions.find((v) => v.id === activeVersionId);
  const resultUrl = job?.result?.url ?? activeVersion?.url ?? null;
  const displayModel = activeVersion?.model ?? job?.model ?? null;

  return {
    authLoading,
    user,
    phase,
    job,
    versions,
    activeVersionId,
    setActiveVersionId,
    errorMessage,
    credits,
    references,
    addReference,
    addReferenceFromDataUrl,
    removeReference,
    retryReferenceUpload,
    submit,
    regenerate,
    applyEdit,
    download,
    reset,
    hydrateVersion,
    resultUrl,
    displayModel,
    authPrompt,
    authPromptContext,
    chooseAuthProvider,
    dismissAuthPrompt,
    creditState,
  };
}
