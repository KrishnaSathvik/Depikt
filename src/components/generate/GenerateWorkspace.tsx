import { useCreatorDraft } from "@/components/CreatorDraft";
import { ReferencePackPicker } from "./ReferencePackPicker";
import { useEffect, useState, type ReactNode } from "react";
import { Sparkles, ImagePlus, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PromptSurface } from "@/components/PromptSurface";
import {
  CreationComposer,
  ComposerChips,
  COMPOSER_TEXTAREA_CLASS,
} from "@/components/composer/CreationComposer";
import { GENERATE_EXAMPLES } from "@/data/composer-examples";
import { MODEL_COPY } from "@/lib/generation/models";
import { resolveGenerationSize } from "@/lib/generation/aspect-ratio";
import { consumeGenerationHandoff } from "@/lib/generation/handoff";
import { MAX_REFERENCE_IMAGES_V1 } from "@/lib/generation/models";
import { simplifyRatioLabel, type ReferenceEntry } from "@/lib/generation/use-generation";
import type { RoutingHints } from "@/lib/generation/model-router";
import type { SourceContextType } from "@/lib/generation/job-request";
import type { SessionVersion } from "@/lib/generation/client";
import { GenerationCanvas } from "@/components/generate/GenerationCanvas";
import { GenerationActions } from "@/components/generate/GenerationActions";
import { GenerationEditForm } from "@/components/generate/GenerationEditForm";
import { SeriesConfirmPanel } from "@/components/generate/SeriesConfirmPanel";
import { SeriesJobsGrid } from "@/components/generate/SeriesJobsGrid";
import { trackEvent } from "@/lib/analytics";
import { GenerationCreditGate } from "@/components/billing/GenerationCreditGate";
import { ModeHero } from "@/components/prompt/ModeHero";
import { PROMPT_MODE_COPY, REFERENCES_COPY, RESULT_STATUS } from "@/lib/product";
import { resultStatusLines, versionLineageLabel } from "@/lib/generation/result-status";
import { userFacingPrompt } from "@/lib/generation/user-facing-prompt";

/**
 * /generate — the direct creation workspace.
 *
 * Idle: one focused single-column composer — no generation visual of any
 * kind is shown before the user has actually started something (see
 * docs/plans/2026-09-10-inline-generation-workspace.md and its visual-QA
 * follow-up: a static "ready" canvas read as a premature loading state, not
 * an empty canvas, so it's gone).
 *
 * Once generation starts: the prompt/context and GenerationCanvas stay stacked. Library handoffs populate the composer for review before submission.
 */
export function GenerateWorkspace({
  active: isActive = true,
  prefill,
  clearSearch,
  hideHero = false,
}: {
  active?: boolean;
  prefill?: string;
  clearSearch?: () => void;
  hideHero?: boolean;
}) {
  const { prompt, setPrompt, selectedEntities, setSelectedEntities, gen } = useCreatorDraft();
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

  useEffect(() => {
    if (!isActive || !prefill) return;
    setPrompt(prefill);
    clearSearch?.();
    // Consume a URL draft once, without submitting it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, prefill]);

  // One-shot: pick up a handoff from Library/Gallery/Prompt.
  useEffect(() => {
    if (!isActive) return;
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
      // Only explicitly requested submissions auto-start. Browse actions prefill.
      if (handoff.autoStart && handoff.prompt.trim()) {
        void gen.submit({
          prompt: handoff.prompt,
          sourceContext: { type: handoff.sourceType, id: handoff.sourceId ?? null },
          structuredAspectRatio: handoff.structuredAspectRatio ?? null,
          routingHints: handoff.routingHints ?? null,
        });
      }
    } else {
      trackEvent("generate_opened", { source: "direct" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

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
    void gen.submit({
      prompt,
      sourceContext,
      entityIds: selectedEntities.map((e) => e.id),
      structuredAspectRatio: structuredRatio,
      routingHints,
    });
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
    setSelectedEntities([]);
    setPrompt("");
    setStructuredRatio(null);
    setRoutingHints(null);
    setSourceContext({ type: "direct" });
    setEditing(false);
    setEditPrompt("");
  }

  // No generation visual before the user has actually started one — the
  // idle composer is a plain creation entry point, not half of a workspace.
  const isIdle = gen.phase === "idle" || (gen.phase === "error" && !gen.job);

  if (isIdle) {
    return (
      <>
        {!hideHero && (
          <ModeHero title={PROMPT_MODE_COPY.generate.title} body={PROMPT_MODE_COPY.generate.body} />
        )}
        <GenerationCreditGate gen={gen} className="mt-4" />
        {gen.errorMessage && gen.creditState !== "exhausted" && (
          <p className="mt-3 text-body-sm text-red-600">{gen.errorMessage}</p>
        )}
        <div className="space-y-4">
          <ComposerSurface
            prompt={prompt}
            onPromptChange={setPrompt}
            references={gen.references}
            onAddReference={gen.addReference}
            onRemoveReference={gen.removeReference}
            onRetryReference={gen.retryReferenceUpload}
            onSubmit={submitComposer}
            canSubmit={Boolean(prompt.trim())}
            controls={
              <>
                <ReferencePackPicker
                  selected={selectedEntities}
                  onChange={setSelectedEntities}
                  prompt={prompt}
                  adhocCount={gen.references.length}
                />
              </>
            }
            caption={
              <div className="flex items-center gap-2">
                <select
                  aria-label="Aspect ratio"
                  value={structuredRatio ?? "auto"}
                  onChange={(event) =>
                    setStructuredRatio(event.target.value === "auto" ? null : event.target.value)
                  }
                  className="rounded-md bg-transparent py-1 pr-1 text-body-sm"
                >
                  <option value="auto">Auto</option>
                  {["1:1", "3:2", "2:3", "16:9", "9:16"].map((ratio) => (
                    <option key={ratio} value={ratio}>
                      {ratio}
                    </option>
                  ))}
                </select>
                <span>· 1 credit</span>
              </div>
            }
          />
          <ComposerChips
            label="Try an example"
            compact
            chips={GENERATE_EXAMPLES}
            onSelect={useChip}
          />
        </div>
      </>
    );
  }

  // A plan came back needing a count decision before any job (or credit
  // reservation) exists yet -- no canvas, no composer, just the choice.
  if (gen.phase === "confirm") {
    return (
      <>
        {!hideHero && (
          <ModeHero title={PROMPT_MODE_COPY.generate.title} body={PROMPT_MODE_COPY.generate.body} />
        )}
        <GenerationCreditGate gen={gen} className="mt-6" />
        <PromptSurface label="Prompt" className="mt-8">
          {prompt}
        </PromptSurface>
        <SeriesConfirmPanel gen={gen} className="mt-6" />
      </>
    );
  }

  // ---------- generating / result / edit / error-with-job: stacked workspace ----------
  const canvasState = gen.resultUrl
    ? "result"
    : gen.phase === "starting" || gen.phase === "polling"
      ? "generating"
      : gen.phase === "result" || gen.phase === "awaiting_result_url"
        ? "result"
        : "error";
  const active = gen.versions.find((v) => v.id === gen.activeVersionId);

  return (
    <>
      <div className="space-y-8">
        {/* Prompt/context, or the edit form once Edit is pressed */}
        <div>
          <GenerationCreditGate gen={gen} className="mb-6" />
          {editing ? (
            <GenerationEditForm
              value={editPrompt}
              onChange={setEditPrompt}
              onApply={({ maskPng }) => {
                void gen.applyEdit(editPrompt, { maskPng }).then((ok) => {
                  if (!ok) return;
                  setEditing(false);
                  setEditPrompt("");
                });
              }}
              onCancel={() => setEditing(false)}
              imageUrl={gen.resultUrl}
              sourceWidth={active?.width}
              sourceHeight={active?.height}
            />
          ) : (
            <div className="space-y-3">
              <PromptSurface label="Prompt">
                {gen.job?.errorMessage ??
                  userFacingPrompt(
                    prompt || gen.requestPrompt || active?.prompt || "Your image request",
                  )}
              </PromptSurface>
              {gen.references.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {gen.references.map((r, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-2 rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-subtle)] px-2.5 py-1.5"
                    >
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded">
                        <img src={r.local.dataUrl} alt="" className="h-full w-full object-cover" />
                      </div>
                      <span className="text-[12px] font-mono text-[color:var(--text-secondary)]">
                        Reference image
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {selectedEntities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedEntities.map((entity) => (
                    <span
                      key={entity.id}
                      className="inline-flex items-center gap-2 rounded-md border border-[color:var(--border-default)] px-2.5 py-1.5 text-[12px]"
                    >
                      {entity.name}
                      <span className="text-[color:var(--text-tertiary)]">
                        {REFERENCES_COPY.locked}
                      </span>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-body-sm text-[color:var(--text-secondary)]">
                {gen.displayModel && `${MODEL_COPY[gen.displayModel].title} · `}
                {resolvedSize.ratioLabel} · {resolvedSize.orientation}
              </p>

              {gen.researching && (
                <p role="status" className="text-body-sm">
                  Preparing your request…
                </p>
              )}
              {gen.grounding && gen.grounding.sources.length > 0 && (
                <details className="text-body-sm">
                  <summary>
                    {RESULT_STATUS.grounded}
                    {gen.grounding.sources.length > 0
                      ? ` · ${RESULT_STATUS.sources(gen.grounding.sources.length)}`
                      : ""}
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {gen.grounding.sources.map((source) => (
                      <li key={source.id}>
                        <a href={source.url} target="_blank" rel="noopener noreferrer">
                          {source.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                  {gen.phase === "result" && (
                    <button type="button" onClick={gen.refreshResearch} className="mt-2 underline">
                      {RESULT_STATUS.refreshResearch}
                    </button>
                  )}
                </details>
              )}
              {gen.phase === "result" && gen.jobs.length <= 1 && gen.versions.length > 1 && (
                <VersionStrip
                  versions={gen.versions}
                  jobs={gen.jobs}
                  activeId={gen.activeVersionId}
                  onSelect={gen.setActiveVersionId}
                />
              )}
            </div>
          )}
        </div>

        {/* Series and individual images share the same canvas and controls. */}
        {gen.jobs.length > 1 && !editing ? (
          <SeriesJobsGrid
            jobs={gen.jobs}
            onDownload={(id) => gen.download(id)}
            onEdit={(id) => {
              gen.setActiveVersionId(id);
              setEditing(true);
              setEditPrompt("");
            }}
            onRegenerate={(id) => gen.regenerate(id)}
            onNew={startNew}
          />
        ) : (
          <GenerationCanvas
            state={canvasState}
            aspectRatio={resolvedSize.ratioLabel}
            orientation={resolvedSize.orientation}
            imageUrl={gen.resultUrl}
            refining={gen.job?.refining}
            statusLines={resultStatusLines({
              sourceCount: gen.grounding?.sources.length,
              temporalSupport:
                gen.grounding?.temporalSupport ?? gen.job?.validation?.temporalSupport,
              validation: gen.job?.validation,
            })}
            errorMessage={gen.errorMessage}
            onRetry={gen.reset}
            jobStatus={
              gen.job?.status === "queued" || gen.job?.status === "running"
                ? gen.job.status
                : gen.phase === "starting"
                  ? "queued"
                  : "running"
            }
            actions={
              editing ? undefined : (
                <GenerationActions
                  onDownload={() => gen.download()}
                  onEdit={() => setEditing((e) => !e)}
                  onRegenerate={() => gen.regenerate()}
                  onNew={startNew}
                />
              )
            }
          />
        )}
      </div>
    </>
  );
}

function ComposerSurface({
  prompt,
  onPromptChange,
  references,
  onAddReference,
  onRemoveReference,
  onRetryReference,
  onSubmit,
  canSubmit,
  caption,
  controls,
}: {
  prompt: string;
  onPromptChange: (v: string) => void;
  references: ReferenceEntry[];
  onAddReference: (file: File) => void;
  onRemoveReference: (index: number) => void;
  onRetryReference: (index: number) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  caption: ReactNode;
  controls: ReactNode;
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
                Reference image
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
              <ImagePlus className="h-3.5 w-3.5" />+ Reference
              <span className="text-[color:var(--text-tertiary)]">
                {references.length}/{MAX_REFERENCE_IMAGES_V1}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Add reference image"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onAddReference(f);
                  e.target.value = "";
                }}
              />
            </label>
          )}
          {controls}
        </>
      }
      submit={
        <Button onClick={onSubmit} disabled={!canSubmit} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generate image →
        </Button>
      }
    >
      <Textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder="Describe your image..."
        rows={5}
        aria-label="Image prompt"
        className={`${COMPOSER_TEXTAREA_CLASS} h-[200px] min-h-[180px]`}
      />
    </CreationComposer>
  );
}

function VersionStrip({
  versions,
  jobs,
  activeId,
  onSelect,
}: {
  versions: SessionVersion[];
  jobs: Array<{
    jobId?: string;
    operation?: string;
    result?: { versionId: string } | null;
  }>;
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {versions.map((v, i) => {
        const label = versionLineageLabel(v, versions, jobs);
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelect(v.id)}
            aria-current={v.id === activeId ? "true" : undefined}
            className={`shrink-0 overflow-hidden rounded border text-left ${
              v.id === activeId
                ? "border-[color:var(--text-primary)]"
                : "border-[color:var(--border-subtle)]"
            }`}
          >
            {v.url && <img src={v.url} alt={label} className="h-16 w-16 object-cover" />}
            <span className="block max-w-16 truncate px-1 py-0.5 text-[10px] leading-tight text-[color:var(--text-secondary)]">
              {label}
            </span>
            <span className="sr-only">
              {label}, version {i + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}
