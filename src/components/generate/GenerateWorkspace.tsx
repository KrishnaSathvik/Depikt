import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, Plus, X, RefreshCw, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PromptSurface } from "@/components/PromptSurface";
import { CTA, ROUTES } from "@/lib/product";
import { MODEL_COPY } from "@/lib/generation/models";
import { resolveGenerationSize } from "@/lib/generation/aspect-ratio";
import { consumeGenerationHandoff, saveGenerationHandoff } from "@/lib/generation/handoff";
import { MAX_REFERENCE_IMAGES_V1 } from "@/lib/generation/models";
import { useGeneration, simplifyRatioLabel } from "@/lib/generation/use-generation";
import type { RoutingHints } from "@/lib/generation/model-router";
import type { SourceContextType } from "@/lib/generation/job-request";
import type { SessionVersion } from "@/lib/generation/client";
import { GenerationCanvas } from "@/components/generate/GenerationCanvas";
import { GenerationActions } from "@/components/generate/GenerationActions";
import { trackEvent } from "@/lib/analytics";

/**
 * /generate — the direct creation workspace. Two panes at lg+ (composer
 * left, GenerationCanvas right); one column below that. Library/Gallery/
 * Prompt hand off a pre-filled composer via handoff.ts; Library additionally
 * auto-starts generation immediately (it already has a complete prompt —
 * see docs/plans/2026-09-10-inline-generation-workspace.md, "Library single-
 * click Generate").
 */
export function GenerateWorkspace() {
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState("");
  const [structuredRatio, setStructuredRatio] = useState<string | null>(null);
  const [routingHints, setRoutingHints] = useState<RoutingHints | null>(null);
  const [sourceContext, setSourceContext] = useState<{
    type: SourceContextType;
    id?: string | null;
  }>({
    type: "direct",
  });
  const [editing, setEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const gen = useGeneration({ sourceContext });

  // One-shot: pick up a handoff from Library/Gallery/Prompt.
  useEffect(() => {
    const handoff = consumeGenerationHandoff();
    if (handoff) {
      setPrompt(handoff.prompt);
      if (handoff.routingHints) setRoutingHints(handoff.routingHints);
      if (handoff.structuredAspectRatio) setStructuredRatio(handoff.structuredAspectRatio);
      setSourceContext({ type: handoff.sourceType, id: handoff.sourceId ?? null });
      trackEvent("generate_opened", { source: handoff.sourceType });
      for (const ref of handoff.references) void gen.addReferenceFromDataUrl(ref.dataUrl);
      // Library already contains a complete, ready-to-submit prompt — a
      // button labeled "Generate" there must start generation, not just
      // arrive at a pre-filled composer requiring a second click.
      if (handoff.sourceType === "library" && handoff.prompt.trim()) {
        void gen.submit({
          prompt: handoff.prompt,
          structuredAspectRatio: handoff.structuredAspectRatio ?? null,
          routingHints: handoff.routingHints ?? null,
        });
      }
    } else {
      trackEvent("generate_opened", { source: "direct" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A resumed/in-flight job has no local `prompt` to resolve a ratio from —
  // its own real width/height are authoritative once loaded.
  const resolvedSize =
    gen.job?.width && gen.job?.height
      ? {
          width: gen.job.width,
          height: gen.job.height,
          ratioLabel: simplifyRatioLabel(gen.job.width, gen.job.height),
          orientation:
            gen.job.width === gen.job.height
              ? ("square" as const)
              : gen.job.width < gen.job.height
                ? ("portrait" as const)
                : ("landscape" as const),
          source: "structured" as const,
        }
      : resolveGenerationSize({
          promptText: prompt,
          structuredAspectRatio: structuredRatio,
          referenceRatio:
            gen.references[0]?.local.meta?.width && gen.references[0]?.local.meta?.height
              ? {
                  width: gen.references[0].local.meta.width,
                  height: gen.references[0].local.meta.height,
                }
              : null,
        });

  function submitComposer() {
    void gen.submit({ prompt, structuredAspectRatio: structuredRatio, routingHints });
  }

  function improveInPrompt() {
    saveGenerationHandoff({
      prompt,
      references: gen.references.map((r) => ({ dataUrl: r.local.dataUrl })),
      structuredAspectRatio: structuredRatio,
      routingHints,
      sourceType: "direct",
    });
    void navigate({ to: ROUTES.prompt, search: { mode: "build" } });
  }

  const canvasState =
    gen.phase === "starting" || gen.phase === "polling"
      ? "generating"
      : gen.phase === "result"
        ? "result"
        : gen.phase === "error"
          ? "error"
          : "ready";

  const showComposer = gen.phase === "idle" || (gen.phase === "error" && !gen.job);
  const showResultLeft = gen.phase === "result";

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-12">
        {/* LEFT — composer / prompt details / edit */}
        <div>
          <p className="eyebrow mb-2">Generate</p>
          <h1 className="text-heading-lg mb-6">Create an image.</h1>

          {showComposer && (
            <div className="space-y-4">
              {gen.errorMessage && <p className="text-body-sm text-red-600">{gen.errorMessage}</p>}
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to create..."
                rows={6}
                aria-label="Image prompt"
              />
              <ReferenceRow
                references={gen.references}
                onAdd={gen.addReference}
                onRemove={gen.removeReference}
                onRetry={gen.retryReferenceUpload}
              />
              {resolvedSize.source !== "fallback" && (
                <p className="text-body-sm text-[color:var(--text-secondary)]">
                  {resolvedSize.ratioLabel} ·{" "}
                  {resolvedSize.orientation[0].toUpperCase() + resolvedSize.orientation.slice(1)}
                </p>
              )}
              <div className="text-body-sm text-[color:var(--text-secondary)]">
                {gen.authLoading
                  ? null
                  : gen.user && gen.credits !== null
                    ? `${gen.credits} credits remaining`
                    : null}
              </div>
              <Button className="w-full" size="lg" onClick={submitComposer}>
                <Sparkles className="mr-1.5 h-4 w-4" />
                Generate image → · 1 credit
              </Button>
              <div>
                <Button variant="ghost" size="sm" onClick={improveInPrompt}>
                  {CTA.improveInPrompt} →
                </Button>
              </div>
            </div>
          )}

          {(gen.phase === "starting" || gen.phase === "polling") && (
            <p className="text-body-sm text-[color:var(--text-secondary)]">
              Working from your prompt — this stays visible while the image generates.
            </p>
          )}

          {showResultLeft && editing ? (
            <div className="space-y-3 rounded-md border border-[color:var(--border-subtle)] p-4">
              <p className="text-body-sm font-medium">EDIT IMAGE</p>
              <p className="text-body-sm text-[color:var(--text-secondary)]">What should change?</p>
              <Textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="Make the jacket dark blue and keep everything else unchanged."
                rows={4}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    gen.applyEdit(editPrompt);
                    setEditing(false);
                    setEditPrompt("");
                  }}
                  disabled={!editPrompt.trim()}
                >
                  Apply edit → · 1 credit
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : showResultLeft ? (
            <details
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
                {gen.job?.errorMessage ?? prompt}
              </PromptSurface>
              <p className="mt-2 text-body-sm text-[color:var(--text-secondary)]">
                {gen.displayModel && `${MODEL_COPY[gen.displayModel].title} · `}
                {resolvedSize.ratioLabel} · {resolvedSize.orientation}
              </p>
              {gen.versions.length > 1 && (
                <div className="mt-4">
                  <VersionStrip
                    versions={gen.versions}
                    activeId={gen.activeVersionId}
                    onSelect={gen.setActiveVersionId}
                  />
                </div>
              )}
              <div className="mt-4">
                <Button variant="ghost" size="sm" onClick={improveInPrompt}>
                  {CTA.improveInPrompt} →
                </Button>
              </div>
            </details>
          ) : null}
        </div>

        {/* RIGHT — the one generation canvas: ready / generating / result / error */}
        <GenerationCanvas
          state={canvasState}
          aspectRatio={resolvedSize.ratioLabel}
          orientation={resolvedSize.orientation}
          imageUrl={gen.resultUrl}
          errorMessage={gen.errorMessage}
          onRetry={gen.reset}
          actions={
            <GenerationActions
              onDownload={gen.download}
              onEdit={() => setEditing((e) => !e)}
              onRegenerate={gen.regenerate}
            />
          }
        />
      </div>
    </div>
  );
}

function ReferenceRow({
  references,
  onAdd,
  onRemove,
  onRetry,
}: {
  references: ReturnType<typeof useGeneration>["references"];
  onAdd: (file: File) => void;
  onRemove: (index: number) => void;
  onRetry: (index: number) => void;
}) {
  return (
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
            onClick={() => onRemove(i)}
            className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
          >
            <X className="h-3 w-3" />
          </button>
          {r.uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-[10px]">
              …
            </div>
          )}
          {r.error && (
            <button
              type="button"
              onClick={() => onRetry(i)}
              aria-label="Retry attaching reference"
              className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-white/85 text-[9px] font-medium text-[color:var(--text-secondary)]"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
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
              if (f) onAdd(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
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
