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
import { downloadFile } from "@/lib/download-file";
import {
  fileToReferenceState,
  MAX_UPLOAD_BYTES,
  type ReferenceImageState,
} from "@/lib/reference-image";
import {
  createGenerationPlan,
  createGenerationJobs,
  startGenerationJob,
  getGenerationJob,
  getGenerationSession,
  getCreditBalance,
  uploadReferenceImage,
  nextPollDelayMs,
  isTerminalStatus,
  GenerationApiError,
  type DisplayPlan,
  type JobStatusResponse,
  type SessionVersion,
} from "./client";
import type { RoutingHints } from "./model-router";
import type { SourceContextType } from "./job-request";
import type { Intent } from "@/lib/prompt-engine/intent";
import { MAX_REFERENCE_IMAGES_V1 } from "./models";
import { jobsNeedingStart } from "./series-resume";
import {
  savePendingGeneration,
  readPendingGeneration,
  clearPendingGeneration,
} from "./pending-generation";

export type GenerationPhase =
  | "idle"
  | "starting"
  /** A plan came back with `requiresCountConfirmation` — waiting on confirmSeriesCount(). */
  | "confirm"
  | "polling"
  | "result"
  | "error";

/** One child job of a generation session, with its own status/result — see pollSession. */
export interface GenerationChildJob extends JobStatusResponse {
  label: string | null;
  index: number | null;
}

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

// A generation session (especially a Sunburst child, or a multi-image
// series) can run well past a typical page load; a refresh or accidental
// close must not lose track of it. The active session id is the only thing
// that needs to survive — pollSession's first tick re-fetches everything
// else (every child job's status/result, plus versions) from the session
// itself. Tab-scoped on purpose: resuming a session left running in a
// different, still-open tab would race two pollers against the same jobs.
const ACTIVE_SESSION_KEY = "depikt.generate.activeSessionId";
function saveActiveSession(sessionId: string) {
  try {
    sessionStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
  } catch {
    /* private-mode/storage-blocked: resume just won't work, generation itself still does */
  }
}
function clearActiveSession() {
  try {
    sessionStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    /* see saveActiveSession */
  }
}
function readActiveSession(): string | null {
  try {
    return sessionStorage.getItem(ACTIVE_SESSION_KEY);
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
  /** Original human request, when different from `prompt` (Build/Critique's finished writer output). Series planning must use this, not the writer's PAGE-block output — see decompose-series.ts. */
  userInput?: string | null;
  /** Pre-computed Intent from Build/Critique, when available — skips a redundant analyzeIntent call on /plans. */
  intent?: Intent | null;
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
  // Every child job of the current session, each with its own status/result
  // — length 1 for the overwhelming majority of submissions (single/edit),
  // length > 1 only for a confirmed series. `job` below is jobs[0], kept for
  // every existing single-job consumer (GenerateWorkspace, InlineGenerationPanel).
  const [jobs, setJobs] = useState<GenerationChildJob[]>([]);
  const [versions, setVersions] = useState<SessionVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  // Set only when a plan comes back with requiresCountConfirmation — the
  // display-safe plan shown to the user while phase is "confirm".
  const [planPreview, setPlanPreview] = useState<DisplayPlan | null>(null);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStart = useRef<number>(0);
  const sourceContextRef = useRef(sourceContext);
  sourceContextRef.current = sourceContext;
  // Remembers the params of the last submit() so regenerate()/applyEdit() can
  // resubmit without the caller re-supplying prompt/ratio/hints.
  const lastParamsRef = useRef<SubmitInput | null>(null);
  const referencesRef = useRef<ReferenceEntry[]>([]);
  referencesRef.current = references;
  // Everything confirmSeriesCount() needs to finish a plan that required
  // confirmation — set right before phase becomes "confirm", read (and
  // cleared) the moment the user picks a count.
  const pendingPlanRef = useRef<{
    planToken: string;
    idempotencyKey: string;
    referenceAssetIds: string[];
    structuredAspectRatio: string | null;
  } | null>(null);

  const job = jobs[0] ?? null;

  // Resume a session left running across a refresh/reopen — see
  // ACTIVE_SESSION_KEY. pollSession's own first tick fetches every child
  // job's current status (they may already be done) and clears the key
  // once all are terminal, so this only ever fires the network requests an
  // in-flight session actually needs.
  useEffect(() => {
    const activeSessionId = readActiveSession();
    if (activeSessionId) pollSession(activeSessionId);
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

  // Polls the whole session, not one job — a confirmed series creates
  // several queued children on one session (see jobs.ts's
  // create_generation_jobs), and every one of them needs its own status
  // tracked until it's terminal, not just the first. getGenerationSession
  // gives the current child list (id/status/label/index) and every
  // succeeded version; each child's own richer detail (width/height/model/
  // errorMessage/signed result URL) still comes from getGenerationJob,
  // exactly as the single-job path always fetched it.
  function pollSession(sessionId: string) {
    saveActiveSession(sessionId);
    pollStart.current = Date.now();
    const tick = async () => {
      try {
        const session = await getGenerationSession(sessionId);
        const referenceAssetIds = referencesRef.current
          .map((reference) => reference.uploadedPath)
          .filter((path): path is string => !!path);
        for (const jobId of jobsNeedingStart(session.jobs)) {
          void startGenerationJob(jobId, referenceAssetIds).catch(() => {});
        }
        const detailed = await Promise.all(
          session.jobs.map(async (child): Promise<GenerationChildJob> => {
            const detail = await getGenerationJob(child.id);
            return {
              ...detail,
              label: child.series_label ?? null,
              index: child.series_index ?? null,
            };
          }),
        );
        setJobs(detailed);
        setVersions(session.versions);
        if (detailed.length > 0 && detailed.every((j) => isTerminalStatus(j.status))) {
          clearActiveSession();
          const succeeded = detailed.filter((j) => j.status === "succeeded");
          if (succeeded.length > 0) {
            setPhase("result");
            setActiveVersionId(succeeded[0].result?.versionId ?? null);
            trackEvent("generation_succeeded", {
              model: succeeded[0].model,
              operation: succeeded[0].operation,
            });
          } else {
            setPhase("error");
            setErrorMessage(
              detailed[0]?.errorMessage ?? "Generation failed. Your credit was returned.",
            );
            trackEvent("generation_failed", { model: detailed[0]?.model });
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
        userInput: input.userInput ?? null,
        intent: input.intent ?? null,
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
    setPlanPreview(null);
    trackEvent("generate_submitted", { source: sourceContextRef.current.type });
    try {
      const idempotencyKey = input.idempotencyKey ?? crypto.randomUUID();
      const referenceAssetIds = referencesRef.current
        .map((r) => r.uploadedPath)
        .filter((p): p is string => !!p);
      // Depikt decides generate vs edit server-side, from the plan's own
      // analysis of the request (task / reference_intent) -- see plans.ts
      // and jobs.ts. The browser never chooses an operation; it only
      // forwards what it actually has (prompt, attached references, an
      // existing source version if any) and always via the plan/jobs pair,
      // so a reference attached on a first submission is never dropped --
      // see generate-reference-upload.test.ts.
      const planRes = await createGenerationPlan({
        prompt: effectivePrompt,
        userInput: input.userInput ?? null,
        intent: input.intent ?? null,
        referenceAssetIds,
        sourceVersionId: input.sourceVersionId ?? null,
        sourceContext: sourceContextRef.current,
        structuredAspectRatio: input.structuredAspectRatio ?? null,
      });

      // A series over the auto cap needs the user to pick a count before
      // any job (and any credit reservation) exists -- see
      // confirmSeriesCount below. Nothing is created yet.
      if (planRes.plan.requiresCountConfirmation) {
        pendingPlanRef.current = {
          planToken: planRes.planToken,
          idempotencyKey,
          referenceAssetIds,
          structuredAspectRatio: input.structuredAspectRatio ?? null,
        };
        setPlanPreview(planRes.plan);
        setPhase("confirm");
        return;
      }

      // Known balance beats the auto-count: never let a signed-in user with
      // too few credits reach the (also enforced, but less friendly) server
      // 402 for a batch they could see coming.
      if (credits !== null && credits < planRes.plan.autoCount) {
        setPhase("idle");
        setCreditState("exhausted");
        trackEvent("credits_exhausted", { source: sourceContextRef.current.type, via: "preempt" });
        return;
      }

      await executePlan(
        planRes.planToken,
        planRes.plan.autoCount,
        idempotencyKey,
        referenceAssetIds,
        input.structuredAspectRatio ?? null,
      );
    } catch (err) {
      applyPlanOrJobError(err);
    }
  }

  /** Shared by submit() (plan step) and executePlan() (jobs step) -- same server errors, same handling. */
  function applyPlanOrJobError(err: unknown): void {
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
      userInput: pending.userInput ?? null,
      intent: pending.intent ?? null,
      structuredAspectRatio: pending.structuredAspectRatio,
      routingHints: pending.routingHints,
      sourceVersionId: pending.sourceVersionId,
      idempotencyKey: pending.idempotencyKey,
    });
  }

  // POST /jobs from an already-issued planToken: create the real job(s),
  // start every queued child in parallel, and switch to session polling.
  // Called directly from submit() (auto count, no confirmation needed) or
  // from confirmSeriesCount() once the user has picked a count.
  async function executePlan(
    planToken: string,
    selectedCount: number,
    idempotencyKey: string,
    referenceAssetIds: string[],
    structuredAspectRatio: string | null,
  ): Promise<void> {
    setPhase("starting");
    try {
      const res = await createGenerationJobs({
        planToken,
        selectedCount,
        idempotencyKey,
        structuredAspectRatio,
        sourceContext: sourceContextRef.current,
      });
      if (res.jobs.length === 0) {
        throw new GenerationApiError("Could not create the generation job", 500);
      }
      // A series reserves credits and creates a queued job for every child
      // up front (see jobs.ts) -- every one of them needs its own /run
      // request to actually execute, or the siblings just sit queued
      // forever with credits already spent. Deliberately not awaited: each
      // /run request stays open for the whole generation (that is what
      // keeps the server-side work alive).
      for (const jobId of jobsNeedingStart(res.jobs)) {
        void startGenerationJob(jobId, referenceAssetIds).catch(() => {});
      }
      pollSession(res.sessionId);
    } catch (err) {
      applyPlanOrJobError(err);
    }
  }

  /**
   * The user picked a count from the "confirm" phase (see submit() above).
   * Re-checks the credit gate against the *chosen* count -- a plan's
   * autoCount was already known-affordable when submit() first checked,
   * but "Generate all N" can ask for more than the user actually has.
   */
  function confirmSeriesCount(selectedCount: number): void {
    const pending = pendingPlanRef.current;
    if (!pending) return;
    if (credits !== null && credits < selectedCount) {
      setCreditState("exhausted");
      trackEvent("credits_exhausted", { source: sourceContextRef.current.type, via: "preempt" });
      return;
    }
    pendingPlanRef.current = null;
    setPlanPreview(null);
    void executePlan(
      pending.planToken,
      selectedCount,
      pending.idempotencyKey,
      pending.referenceAssetIds,
      pending.structuredAspectRatio,
    );
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
    const filename = `depikt-${new Date().toISOString().slice(0, 10)}-${(activeVersionId ?? "").slice(0, 8)}.png`;
    void downloadFile(url, filename);
  }

  function reset() {
    setPhase("idle");
    setErrorMessage(null);
    setPlanPreview(null);
    pendingPlanRef.current = null;
  }

  /** Blank composer for "create another image" -- unlike reset() (used for
   *  error-retry, which must keep the same prompt/references so the user
   *  can just try again), this clears everything so the next submission
   *  starts from nothing. */
  function clearReferences() {
    setReferences([]);
  }

  /**
   * "Open in Generate" from an existing creation: seed the canvas with a
   * version that already exists, ready to edit — no job, no re-upload. See
   * GenerationHandoff.sourceVersion and Account → Creations' "Open in
   * Generate" action.
   */
  function hydrateVersion(version: SessionVersion) {
    setJobs([]);
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
    jobs,
    planPreview,
    versions,
    activeVersionId,
    setActiveVersionId,
    errorMessage,
    credits,
    references,
    addReference,
    addReferenceFromDataUrl,
    removeReference,
    clearReferences,
    retryReferenceUpload,
    submit,
    confirmSeriesCount,
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
