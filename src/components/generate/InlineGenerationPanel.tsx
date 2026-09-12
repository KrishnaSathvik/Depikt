import { useEffect, useRef, useState, type RefObject } from "react";
import { resolveGenerationSize } from "@/lib/generation/aspect-ratio";
import { simplifyRatioLabel, type useGeneration } from "@/lib/generation/use-generation";
import { GenerationCanvas } from "@/components/generate/GenerationCanvas";
import { GenerationActions } from "@/components/generate/GenerationActions";
import { GenerationEditForm } from "@/components/generate/GenerationEditForm";
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

  if (gen.phase === "idle") return null;

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

  return (
    <div
      ref={panelRef}
      className={cn(
        "mt-8 space-y-4 pt-8",
        showDivider && "border-t border-[color:var(--border-subtle)]",
      )}
    >
      <ScrollIntoViewOnMount targetRef={panelRef} />
      <GenerationCanvas
        state={
          gen.phase === "starting" || gen.phase === "polling"
            ? "generating"
            : gen.phase === "result"
              ? "result"
              : "error"
        }
        aspectRatio={resolvedSize.ratioLabel}
        orientation={resolvedSize.orientation}
        imageUrl={gen.resultUrl}
        errorMessage={gen.errorMessage ?? "Generation failed. Your credit was returned."}
        onRetry={() => gen.regenerate()}
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
      {gen.phase === "result" && editing && (
        <GenerationEditForm
          value={editPrompt}
          onChange={setEditPrompt}
          onApply={() => {
            gen.applyEdit(editPrompt);
            setEditing(false);
            setEditPrompt("");
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

/** Scroll once when the panel mounts (generation just started). */
function ScrollIntoViewOnMount({
  targetRef,
}: {
  targetRef: RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [targetRef]);
  return null;
}
