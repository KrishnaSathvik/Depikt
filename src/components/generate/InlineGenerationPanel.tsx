import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PromptSurface } from "@/components/PromptSurface";
import { resolveGenerationSize } from "@/lib/generation/aspect-ratio";
import { simplifyRatioLabel, type useGeneration } from "@/lib/generation/use-generation";
import { GenerationCanvas } from "@/components/generate/GenerationCanvas";
import { GenerationActions } from "@/components/generate/GenerationActions";

export interface InlineGenerationPanelProps {
  /** "Your prompt" (Build) or "Rewritten prompt" (Critique). */
  promptLabel: string;
  promptText: string;
  structuredAspectRatio?: string | null;
  gen: ReturnType<typeof useGeneration>;
}

/**
 * The inline image-generation region shown under Prompt Build's final
 * prompt / Critique's rewritten prompt once "Generate image"/"Generate
 * rewrite" has been pressed — never a navigation to /generate. Two panes at
 * lg+ (prompt left, GenerationCanvas right), one column below that. Reuses
 * the exact same GenerationCanvas/GenerationActions as /generate.
 */
export function InlineGenerationPanel({
  promptLabel,
  promptText,
  structuredAspectRatio,
  gen,
}: InlineGenerationPanelProps) {
  const [editing, setEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");

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
    <div className="mt-8 border-t border-[color:var(--border-subtle)] pt-8">
      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
        <div className="space-y-3">
          <PromptSurface label={promptLabel}>{promptText}</PromptSurface>
          {gen.phase === "result" &&
            (editing ? (
              <div className="space-y-3 rounded-md border border-[color:var(--border-subtle)] p-4">
                <p className="text-body-sm text-[color:var(--text-secondary)]">
                  What should change?
                </p>
                <Textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  rows={3}
                  placeholder="Make the jacket dark blue and keep everything else unchanged."
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!editPrompt.trim()}
                    onClick={() => {
                      gen.applyEdit(editPrompt);
                      setEditing(false);
                      setEditPrompt("");
                    }}
                  >
                    Apply edit → · 1 credit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null)}
        </div>

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
      </div>
    </div>
  );
}
