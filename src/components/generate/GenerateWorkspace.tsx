import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, ImagePlus, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PromptSurface } from "@/components/PromptSurface";
import { CreationComposer, ComposerChips } from "@/components/composer/CreationComposer";
import { CTA, ROUTES } from "@/lib/product";
import { MODEL_COPY } from "@/lib/generation/models";
import { resolveGenerationSize } from "@/lib/generation/aspect-ratio";
import { consumeGenerationHandoff, saveGenerationHandoff } from "@/lib/generation/handoff";
import { MAX_REFERENCE_IMAGES_V1 } from "@/lib/generation/models";
import {
  useGeneration,
  simplifyRatioLabel,
  type ReferenceEntry,
} from "@/lib/generation/use-generation";
import type { RoutingHints } from "@/lib/generation/model-router";
import type { SourceContextType } from "@/lib/generation/job-request";
import type { SessionVersion } from "@/lib/generation/client";
import { GenerationCanvas } from "@/components/generate/GenerationCanvas";
import { GenerationActions } from "@/components/generate/GenerationActions";
import { trackEvent } from "@/lib/analytics";
import { AuthGateDialog } from "@/components/auth/AuthGateDialog";
import { GenerationCreditGate } from "@/components/billing/GenerationCreditGate";

/**
 * /generate — the direct creation workspace.
 *
 * Idle: one focused single-column composer — no generation visual of any
 * kind is shown before the user has actually started something (see
 * docs/plans/2026-09-10-inline-generation-workspace.md and its visual-QA
 * follow-up: a static "ready" canvas read as a premature loading state, not
 * an empty canvas, so it's gone).
 *
 * Once generation starts: a two-pane workspace at lg+ (prompt/context left,
 * GenerationCanvas right); one column below that. Library additionally
 * auto-starts generation immediately on handoff (it already has a complete
 * prompt).
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
      // "Open in Generate" from an existing creation: hydrate the canvas
      // with that version directly (no job, no re-upload) and open the
      // edit composer so the next action is naturally "edit this".
      if (handoff.sourceVersion) {
        gen.hydrateVersion({
          id: handoff.sourceVersion.id,
          parent_version_id: null,
          storage_path: "",
          width: handoff.sourceVersion.width,
          height: handoff.sourceVersion.height,
          prompt: handoff.sourceVersion.prompt,
          model: handoff.sourceVersion.model,
          created_at: handoff.sourceVersion.createdAt,
          url: handoff.sourceVersion.previewUrl,
        });
        setEditing(true);
      }
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

  function useChip(text: string) {
    setPrompt(text);
  }

  // "New" on a finished result: unlike gen.reset() (error-retry, which
  // must keep the same prompt/references so the user can just try again),
  // this clears everything so the next submission starts from a blank
  // composer -- there was previously no way back to one at all once a
  // result existed.
  function startNew() {
    gen.reset();
    gen.clearReferences();
    setPrompt("");
    setStructuredRatio(null);
    setRoutingHints(null);
    setEditing(false);
    setEditPrompt("");
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

  // No generation visual before the user has actually started one — the
  // idle composer is a plain creation entry point, not half of a workspace.
  const isIdle = gen.phase === "idle" || (gen.phase === "error" && !gen.job);

  if (isIdle) {
    return (
      <>
        <AuthGateDialog gen={gen} />
        <h2 className="text-display-md sm:text-display-lg text-[color:var(--text-primary)]">
          Create an image.
        </h2>
        <p className="mt-4 max-w-[56ch] text-body-lg text-[color:var(--text-secondary)]">
          Describe what you want, optionally add a reference image, and generate.
        </p>
        <GenerationCreditGate gen={gen} className="mt-6" />
        {gen.errorMessage && gen.creditState !== "exhausted" && (
          <p className="mt-4 text-body-sm text-red-600">{gen.errorMessage}</p>
        )}
        <div className="mt-8 space-y-4">
          <ComposerSurface
            prompt={prompt}
            onPromptChange={setPrompt}
            references={gen.references}
            onAddReference={gen.addReference}
            onRemoveReference={gen.removeReference}
            onRetryReference={gen.retryReferenceUpload}
            onSubmit={submitComposer}
            caption={[
              resolvedSize.source !== "fallback"
                ? `${resolvedSize.ratioLabel} · ${resolvedSize.orientation[0].toUpperCase() + resolvedSize.orientation.slice(1)}`
                : "Auto ratio",
              !gen.authLoading && gen.user && gen.credits !== null
                ? `${gen.credits} credits left`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
          <ComposerChips chips={GENERATE_CHIPS} onSelect={useChip} />
          <Button variant="ghost" size="sm" onClick={improveInPrompt}>
            {CTA.improveInPrompt} →
          </Button>
        </div>
      </>
    );
  }

  // ---------- generating / result / edit / error-with-job: two-pane workspace ----------
  const canvasState =
    gen.phase === "starting" || gen.phase === "polling"
      ? "generating"
      : gen.phase === "result"
        ? "result"
        : "error";

  return (
    <>
      <AuthGateDialog gen={gen} />
      <div className="space-y-10 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-12 lg:space-y-0">
        {/* LEFT — prompt/context, or the edit form once Edit is pressed */}
        <div>
          <GenerationCreditGate gen={gen} className="mb-6" />
          <p className="eyebrow mb-2">Prompt</p>
          {editing ? (
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
          ) : (
            <div className="space-y-3">
              <PromptSurface label="Prompt">{gen.job?.errorMessage ?? prompt}</PromptSurface>
              {gen.references.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {gen.references.map((r, i) => (
                    <div
                      key={i}
                      className="h-10 w-10 overflow-hidden rounded border border-[color:var(--border-subtle)]"
                    >
                      <img src={r.local.dataUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <p className="text-body-sm text-[color:var(--text-secondary)]">
                {gen.displayModel && `${MODEL_COPY[gen.displayModel].title} · `}
                {resolvedSize.ratioLabel} · {resolvedSize.orientation}
              </p>

              {gen.phase === "result" && (
                <>
                  {gen.versions.length > 1 && (
                    <VersionStrip
                      versions={gen.versions}
                      activeId={gen.activeVersionId}
                      onSelect={gen.setActiveVersionId}
                    />
                  )}
                  <Button variant="ghost" size="sm" onClick={improveInPrompt}>
                    {CTA.improveInPrompt} →
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — the generation canvas: generating / result / error */}
        <GenerationCanvas
          state={canvasState}
          aspectRatio={resolvedSize.ratioLabel}
          orientation={resolvedSize.orientation}
          imageUrl={gen.resultUrl}
          errorMessage={gen.errorMessage}
          onRetry={gen.reset}
          actions={
            editing ? undefined : (
              <GenerationActions
                onDownload={gen.download}
                onEdit={() => setEditing((e) => !e)}
                onRegenerate={gen.regenerate}
                onNew={startNew}
              />
            )
          }
        />
      </div>
    </>
  );
}

const GENERATE_CHIPS = [
  { label: "editorial poster", text: "minimalist editorial poster, bold type, restrained palette" },
  { label: "product shot", text: "clean studio product photo on white, soft shadow, square crop" },
  {
    label: "cinematic portrait",
    text: "cinematic portrait, natural window light, shallow depth of field",
  },
] as const;

function ComposerSurface({
  prompt,
  onPromptChange,
  references,
  onAddReference,
  onRemoveReference,
  onRetryReference,
  onSubmit,
  caption,
}: {
  prompt: string;
  onPromptChange: (v: string) => void;
  references: ReferenceEntry[];
  onAddReference: (file: File) => void;
  onRemoveReference: (index: number) => void;
  onRetryReference: (index: number) => void;
  onSubmit: () => void;
  caption: string;
}) {
  return (
    <CreationComposer
      caption={caption}
      referencesSlot={
        <>
          {references.map((r, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-2 rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-subtle)] px-2.5 py-1.5"
            >
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded">
                <img src={r.local.dataUrl} alt="" className="h-full w-full object-cover" />
                {r.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-[9px]">
                    …
                  </div>
                )}
                {r.error && (
                  <button
                    type="button"
                    onClick={() => onRetryReference(i)}
                    aria-label="Retry attaching reference"
                    className="absolute inset-0 flex items-center justify-center bg-white/85"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
              </div>
              <span className="text-[12px] font-mono text-[color:var(--text-secondary)]">
                Reference
              </span>
              <button
                type="button"
                aria-label="Remove reference"
                onClick={() => onRemoveReference(i)}
                className="ml-1 rounded p-0.5 text-[color:var(--text-tertiary)] transition-colors hover:bg-[color:var(--bg-elevated)] hover:text-[color:var(--text-primary)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {references.length < MAX_REFERENCE_IMAGES_V1 && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-[color:var(--border-subtle)] px-2.5 py-1.5 text-[12px] font-mono text-[color:var(--text-tertiary)] transition-colors hover:border-[color:var(--border-default)] hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-secondary)]">
              <ImagePlus className="h-3.5 w-3.5" />
              Add reference image
              <span className="text-[color:var(--text-tertiary)]">
                {references.length}/{MAX_REFERENCE_IMAGES_V1}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onAddReference(f);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </>
      }
      submit={
        <Button onClick={onSubmit} className="gap-1.5">
          <Sparkles className="h-4 w-4" />
          Generate image →
        </Button>
      }
    >
      <Textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder="Describe what you want to create..."
        rows={6}
        aria-label="Image prompt"
      />
    </CreationComposer>
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
