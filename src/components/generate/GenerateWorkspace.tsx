import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  Download,
  RefreshCw,
  Wand2,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PromptSurface } from "@/components/PromptSurface";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { lovable } from "@/integrations/lovable";
import { trackEvent } from "@/lib/analytics";
import { CTA, ROUTES } from "@/lib/product";
import { MODEL_COPY } from "@/lib/generation/models";
import { resolveGenerationSize } from "@/lib/generation/aspect-ratio";
import { consumeGenerationHandoff, saveGenerationHandoff } from "@/lib/generation/handoff";
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
} from "@/lib/generation/client";
import type { RoutingHints } from "@/lib/generation/model-router";
import { MAX_REFERENCE_IMAGES_V1 } from "@/lib/generation/models";

type Phase = "idle" | "starting" | "polling" | "result" | "error";

interface ReferenceEntry {
  local: ReferenceImageState;
  uploadedPath: string | null;
  uploading: boolean;
}

const ERROR_COPY: Record<string, string> = {
  insufficient_credit: "You don't have enough credits for this.",
  auth: "Sign in to generate images.",
  rejected: "The image request was rejected.",
  rate_limited: "Generation is temporarily unavailable. Try again in a moment.",
  unknown: "Generation failed.",
};

export function GenerateWorkspace() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState("");
  const [references, setReferences] = useState<ReferenceEntry[]>([]);
  const [structuredRatio, setStructuredRatio] = useState<string | null>(null);
  const [routingHints, setRoutingHints] = useState<RoutingHints | null>(null);
  const [sourceContext, setSourceContext] = useState<{ type: string; id?: string | null }>({
    type: "direct",
  });

  const [credits, setCredits] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatusResponse | null>(null);
  const [versions, setVersions] = useState<SessionVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStart = useRef<number>(0);
  const pendingSubmit = useRef(false);

  // One-shot: pick up a handoff from Library/Gallery/Prompt, then restore auth-return state the same way.
  useEffect(() => {
    const handoff = consumeGenerationHandoff();
    if (handoff) {
      setPrompt(handoff.prompt);
      if (handoff.routingHints) setRoutingHints(handoff.routingHints);
      if (handoff.structuredAspectRatio) setStructuredRatio(handoff.structuredAspectRatio);
      setSourceContext({ type: handoff.sourceType, id: handoff.sourceId ?? null });
      trackEvent("generate_opened", { source: handoff.sourceType });
      for (const ref of handoff.references) void restoreReference(ref.dataUrl);
    } else {
      trackEvent("generate_opened", { source: "direct" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Shared by the file picker (handleAddReference) and a Library/Gallery/
  // Prompt handoff (already-processed data URLs, no File object to re-derive).
  async function restoreReference(dataUrl: string) {
    if (references.length >= MAX_REFERENCE_IMAGES_V1) return;
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
    try {
      const { path } = await uploadReferenceImage(dataUrl);
      setReferences((prev) =>
        prev.map((r) => (r === entry ? { ...r, uploadedPath: path, uploading: false } : r)),
      );
    } catch {
      toast.error("Could not attach the reference image");
      setReferences((prev) => prev.filter((r) => r !== entry));
    }
  }

  // Load the authoritative balance once signed in.
  useEffect(() => {
    if (!user) return;
    getCreditBalance()
      .then((r) => setCredits(r.availableCredits))
      .catch(() => setCredits(null));
  }, [user, phase]);

  // If sign-in just completed and a submission was waiting on it, resume automatically.
  useEffect(() => {
    if (user && pendingSubmit.current) {
      pendingSubmit.current = false;
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(
    () => () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    },
    [],
  );

  const resolvedSize = resolveGenerationSize({
    promptText: prompt,
    structuredAspectRatio: structuredRatio,
    referenceRatio:
      references[0]?.local.meta?.width && references[0]?.local.meta?.height
        ? { width: references[0].local.meta.width, height: references[0].local.meta.height }
        : null,
  });

  async function handleAddReference(file: File) {
    if (references.length >= MAX_REFERENCE_IMAGES_V1) {
      toast.error(`Up to ${MAX_REFERENCE_IMAGES_V1} reference images`);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Image too large (max 10MB)");
      return;
    }
    const local = await fileToReferenceState(file, "auto");
    const entry: ReferenceEntry = { local, uploadedPath: null, uploading: true };
    setReferences((prev) => [...prev, entry]);
    try {
      const { path } = await uploadReferenceImage(local.dataUrl);
      setReferences((prev) =>
        prev.map((r) => (r === entry ? { ...r, uploadedPath: path, uploading: false } : r)),
      );
      trackEvent("reference_added", {});
    } catch {
      toast.error("Could not upload reference image");
      setReferences((prev) => prev.filter((r) => r !== entry));
    }
  }

  function removeReference(index: number) {
    setReferences((prev) => prev.filter((_, i) => i !== index));
  }

  function pollJob(jobId: string) {
    pollStart.current = Date.now();
    const tick = async () => {
      try {
        const res = await getGenerationJob(jobId);
        setJob(res);
        if (isTerminalStatus(res.status)) {
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

  async function submit(overridePrompt?: string, sourceVersionId?: string) {
    const effectivePrompt = overridePrompt ?? prompt;
    if (!effectivePrompt.trim()) {
      toast.error("Describe what you want to create");
      return;
    }
    if (!user) {
      pendingSubmit.current = true;
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: typeof window !== "undefined" ? window.location.href : undefined,
      });
      if (result.error) {
        pendingSubmit.current = false;
        toast.error("Sign-in failed");
      }
      trackEvent("generate_auth_requested", {});
      return; // OAuth redirects; on return, the effect above resumes the submission.
    }

    setPhase("starting");
    setErrorMessage(null);
    trackEvent("generate_submitted", { source: sourceContext.type });
    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await createGenerationJob({
        operation: sourceVersionId ? "edit" : "generate",
        prompt: effectivePrompt,
        referenceAssetIds: references.map((r) => r.uploadedPath).filter((p): p is string => !!p),
        sourceVersionId: sourceVersionId ?? null,
        sourceContext,
        idempotencyKey,
        structuredAspectRatio: structuredRatio,
        routingHints: routingHints ?? undefined,
      });
      pollJob(res.jobId);
    } catch (err) {
      setPhase("error");
      if (err instanceof GenerationApiError && err.status === 402) {
        setErrorMessage(ERROR_COPY.insufficient_credit);
      } else if (err instanceof GenerationApiError && err.status === 401) {
        setErrorMessage(ERROR_COPY.auth);
      } else {
        setErrorMessage("Generation is temporarily unavailable.");
      }
    }
  }

  function regenerate() {
    trackEvent("regenerate_submitted", {});
    void submit();
  }

  function applyEdit() {
    if (!editPrompt.trim() || !activeVersionId) return;
    trackEvent("edit_submitted", {});
    setEditing(false);
    void submit(editPrompt, activeVersionId);
    setEditPrompt("");
  }

  function download() {
    const url = job?.result?.url ?? versions.find((v) => v.id === activeVersionId)?.url;
    if (!url) return;
    trackEvent("image_downloaded", {});
    const a = document.createElement("a");
    a.href = url;
    a.download = `depikt-${new Date().toISOString().slice(0, 10)}-${(activeVersionId ?? "").slice(0, 8)}.png`;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  }

  function improveInPrompt() {
    saveGenerationHandoff({
      prompt,
      references: references.map((r) => ({ dataUrl: r.local.dataUrl })),
      structuredAspectRatio: structuredRatio,
      routingHints,
      sourceType: "direct",
    });
    void navigate({ to: ROUTES.prompt, search: { mode: "build" } });
  }

  const activeVersion = versions.find((v) => v.id === activeVersionId);
  const resultUrl = job?.result?.url ?? activeVersion?.url ?? null;
  const displayModel = activeVersion?.model ?? job?.model ?? null;

  // ---------- result / loading state ----------
  if (
    phase === "starting" ||
    phase === "polling" ||
    phase === "result" ||
    (phase === "error" && job)
  ) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
        {(phase === "starting" || phase === "polling") && (
          <GenerationLoadingState
            ratioLabel={resolvedSize.ratioLabel}
            orientation={resolvedSize.orientation}
            phase={phase}
          />
        )}

        {phase === "result" && resultUrl && (
          <div className="space-y-6">
            <div
              className="mx-auto overflow-hidden rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)]"
              style={{
                maxWidth: 640,
                aspectRatio: `${resolvedSize.width} / ${resolvedSize.height}`,
              }}
            >
              <img
                src={resultUrl}
                alt="Generated result"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" onClick={download}>
                <Download className="mr-1.5 h-4 w-4" /> Download
              </Button>
              <Button variant="outline" onClick={() => setEditing((e) => !e)}>
                <Wand2 className="mr-1.5 h-4 w-4" /> Edit
              </Button>
              <Button variant="outline" onClick={regenerate}>
                <RefreshCw className="mr-1.5 h-4 w-4" /> Regenerate · 1 credit
              </Button>
            </div>

            {editing && (
              <div className="mx-auto max-w-[560px] space-y-3 rounded-md border border-[color:var(--border-subtle)] p-4">
                <p className="text-body-sm font-medium">What do you want to change?</p>
                <Textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Make the jacket dark blue and keep everything else unchanged."
                  rows={3}
                />
                <Button onClick={applyEdit} disabled={!editPrompt.trim()}>
                  Apply edit → · 1 credit
                </Button>
              </div>
            )}

            <details
              className="mx-auto max-w-[640px]"
              open={detailsOpen}
              onToggle={(e) => setDetailsOpen((e.target as HTMLDetailsElement).open)}
            >
              <summary className="flex cursor-pointer items-center gap-1 text-body-sm text-[color:var(--text-secondary)]">
                {detailsOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Prompt & details
              </summary>
              <PromptSurface label="Prompt" className="mt-2">
                {job?.errorMessage ?? prompt}
              </PromptSurface>
              <p className="mt-2 text-body-sm text-[color:var(--text-secondary)]">
                {displayModel && `${MODEL_COPY[displayModel].title} · `}
                {resolvedSize.ratioLabel} · {resolvedSize.orientation}
              </p>
            </details>

            {versions.length > 1 && (
              <VersionStrip
                versions={versions}
                activeId={activeVersionId}
                onSelect={setActiveVersionId}
              />
            )}

            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={improveInPrompt}>
                {CTA.improveInPrompt} →
              </Button>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className="mx-auto max-w-[480px] space-y-4 text-center">
            <p className="text-body-md">{errorMessage}</p>
            <Button onClick={() => setPhase("idle")}>Try again</Button>
          </div>
        )}
      </div>
    );
  }

  // ---------- empty / composer state ----------
  return (
    <div className="mx-auto max-w-[640px] px-4 py-10 sm:px-6">
      <p className="eyebrow mb-2 text-center">Generate</p>
      <h1 className="text-heading-lg mb-6 text-center">Create an image.</h1>

      {phase === "error" && errorMessage && (
        <p className="mb-4 text-center text-body-sm text-red-600">{errorMessage}</p>
      )}

      <div className="space-y-4">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to create..."
          rows={5}
          aria-label="Image prompt"
        />

        <div className="flex flex-wrap items-center gap-2">
          {references.map((r, i) => (
            <div
              key={i}
              className="relative h-16 w-16 overflow-hidden rounded border border-[color:var(--border-subtle)]"
            >
              <img src={r.local.dataUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Remove reference"
                onClick={() => removeReference(i)}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="h-3 w-3" />
              </button>
              {r.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-[10px]">
                  …
                </div>
              )}
            </div>
          ))}
          {references.length < MAX_REFERENCE_IMAGES_V1 && (
            <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded border border-dashed border-[color:var(--border-subtle)] text-[color:var(--text-secondary)]">
              <Plus className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleAddReference(f);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>

        {resolvedSize.source !== "fallback" && (
          <p className="text-center text-body-sm text-[color:var(--text-secondary)]">
            {resolvedSize.ratioLabel} ·{" "}
            {resolvedSize.orientation[0].toUpperCase() + resolvedSize.orientation.slice(1)}
          </p>
        )}

        <div className="text-center text-body-sm text-[color:var(--text-secondary)]">
          {authLoading ? null : user && credits !== null ? `${credits} credits remaining` : null}
        </div>

        <Button className="w-full" size="lg" onClick={() => submit()}>
          <Sparkles className="mr-1.5 h-4 w-4" />
          Generate image → · 1 credit
        </Button>

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={improveInPrompt}>
            {CTA.improveInPrompt} →
          </Button>
        </div>
      </div>
    </div>
  );
}

function GenerationLoadingState({
  ratioLabel,
  orientation,
  phase,
}: {
  ratioLabel: string;
  orientation: string;
  phase: Phase;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mx-auto max-w-[480px] space-y-4 text-center">
      <div
        className="mx-auto flex items-center justify-center rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)]"
        style={{ maxWidth: 400, aspectRatio: ratioLabel.replace(":", " / ") }}
      >
        <Sparkles className="h-6 w-6 animate-pulse text-[color:var(--text-secondary)]" />
      </div>
      <p className="text-body-md">{phase === "starting" ? "Starting..." : "Generating image..."}</p>
      <p className="text-body-sm text-[color:var(--text-secondary)]">
        {ratioLabel} · {orientation} {elapsed > 0 ? `· ${elapsed}s` : ""}
      </p>
    </div>
  );
}

function VersionStrip({
  versions,
  activeId,
  onSelect,
}: {
  versions: SessionVersion[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {versions.map((v, i) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onSelect(v.id)}
          className={`shrink-0 overflow-hidden rounded border ${
            v.id === activeId
              ? "border-[color:var(--text-primary)]"
              : "border-[color:var(--border-subtle)]"
          }`}
        >
          {v.url && <img src={v.url} alt={`Version ${i + 1}`} className="h-16 w-16 object-cover" />}
          <span className="sr-only">Version {i + 1}</span>
        </button>
      ))}
    </div>
  );
}
