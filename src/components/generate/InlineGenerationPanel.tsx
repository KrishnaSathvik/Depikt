import { useEffect, useRef, useState, type RefObject } from "react";
import { resolveGenerationSize } from "@/lib/generation/aspect-ratio";
import { simplifyRatioLabel, type useGeneration } from "@/lib/generation/use-generation";
import { GenerationCanvas } from "@/components/generate/GenerationCanvas";
import { GenerationActions } from "@/components/generate/GenerationActions";
import { GenerationEditForm } from "@/components/generate/GenerationEditForm";
import { SeriesJobsGrid } from "@/components/generate/SeriesJobsGrid";
import { cn } from "@/lib/utils";

export interface InlineGenerationPanelProps {
  /** Kept for call-site clarity; the prompt itself stays in Build/Critique above. */
  promptLabel: string;
  promptText: string;
  structuredAspectRatio?: string | null;
  gen: ReturnType<typeof useGeneration>;
  /** When false, skip the top border (parent already has an ink output divider). */
  showDivider?: boolean;
}

/**
 * Inline image generation under Prompt Build's final prompt / Critique's
 * rewritten prompt once Generate has been pressed. Build and Critique already
 * show that prompt above, so this panel is canvas + actions only — never a
 * second copy of the same text. Reuses GenerationCanvas/GenerationActions.
 */
export function InlineGenerationPanel({
  promptText,
  structuredAspectRatio,
  gen,
  showDivider = true,
}: InlineGenerationPanelProps) {
  const [editing, setEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // "confirm" has no job yet either — SeriesConfirmPanel (rendered by the
  // caller, right where GenerationCreditGate is) owns that state.
  if (gen.phase === "idle" || gen.phase === "confirm") return null;

  const resolvedSize =
    gen.job?.width && gen.job?.height
      ? {
          ratioLabel: simplifyRatioLabel(gen.job.width, gen.job.height),
          orientation:
            gen.job.width === gen.job.height
              ? ("square" as const)
              : gen.job.width < gen.job.height
                ? ("portrait" as const)
                : ("landscape" as const),
        }
      : resolveGenerationSize({
          promptText,
          structuredAspectRatio: structuredAspectRatio ?? null,
          referenceRatio: null,
        });
  const active = gen.versions.find((v) => v.id === gen.activeVersionId);

  return (
    <div
      ref={panelRef}
      className={cn(
        "mt-8 space-y-4 pt-8",
        showDivider && "border-t border-[color:var(--border-subtle)]",
      )}
    >
      <ScrollIntoViewOnMount targetRef={panelRef} />
      {gen.jobs.length > 1 ? (
        <SeriesJobsGrid jobs={gen.jobs} />
      ) : (
        <GenerationCanvas
          state={
            gen.phase === "starting" || gen.phase === "polling"
              ? "generating"
              : gen.phase === "result" || gen.phase === "awaiting_result_url"
                ? "result"
                : "error"
          }
          aspectRatio={resolvedSize.ratioLabel}
          orientation={resolvedSize.orientation}
          imageUrl={gen.resultUrl}
          errorMessage={gen.errorMessage ?? "Generation failed. Your credit was returned."}
          onRetry={() => gen.regenerate()}
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
                onDownload={gen.download}
                onEdit={() => setEditing((e) => !e)}
                onRegenerate={() => gen.regenerate()}
              />
            )
          }
        />
      )}
      {gen.jobs.length <= 1 && gen.phase === "result" && editing && (
        <GenerationEditForm
          value={editPrompt}
          onChange={setEditPrompt}
          onApply={({ maskPng }) => {
            gen.applyEdit(editPrompt, { maskPng });
            setEditing(false);
            setEditPrompt("");
          }}
          onCancel={() => setEditing(false)}
          imageUrl={gen.resultUrl}
          sourceWidth={active?.width}
          sourceHeight={active?.height}
        />
      )}
    </div>
  );
}

/** Scroll once when the panel mounts (generation just started). */
function ScrollIntoViewOnMount({ targetRef }: { targetRef: RefObject<HTMLDivElement | null> }) {
  useEffect(() => {
    targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [targetRef]);
  return null;
}
