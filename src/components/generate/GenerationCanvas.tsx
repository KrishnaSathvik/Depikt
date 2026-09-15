import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThinkingField } from "@/components/processing/ThinkingField";
import {
  GENERATION_STAGE_LABELS,
  describeGenerationThinking,
  formatGenerationElapsed,
  type GenerationJobUiStatus,
} from "@/lib/product";

// No "ready" state: ThinkingField (and this canvas generally) is mounted
// only once an image operation is actually running. /generate's idle
// composer, and Build/Critique before "Generate image"/"Generate rewrite"
// is pressed, render no generation visual at all — see GenerateWorkspace.tsx
// and InlineGenerationPanel.tsx.
export type GenerationCanvasState = "generating" | "result" | "error";

export interface GenerationCanvasProps {
  state: GenerationCanvasState;
  /** e.g. "4:5" — shapes the frame. */
  aspectRatio: string;
  orientation?: "portrait" | "landscape" | "square";
  imageUrl?: string | null;
  imageAlt?: string;
  errorMessage?: string | null;
  onRetry?: () => void;
  /** Rendered under the frame in "result" state — pass a <GenerationActions/>. */
  actions?: React.ReactNode;
  className?: string;
  /** queued/running while generating — drives thinking-stage copy. */
  jobStatus?: GenerationJobUiStatus;
}

/** Resolves a concrete pixel box for `ratioLabel` against the orientation-based
 * max-width and a shared max-height, picking whichever constraint binds first.
 * Done in JS rather than CSS `aspect-ratio` + max-width/max-height together —
 * a block box's width resolves to "fill available" before aspect-ratio and
 * max-height interact, so a portrait ratio that hits the height cap ends up
 * with the wrong (unclamped) width if left to the browser. */
function resolveFrameBox(
  ratioLabel: string,
  orientation?: "portrait" | "landscape" | "square",
): { width: number; height: number } {
  const maxWidth = orientation === "landscape" ? 720 : 480;
  const maxHeight = 560;
  const parts = ratioLabel.split(":").map(Number);
  const w = parts[0];
  const h = parts[1];
  // Prefer the stated ratio; if the label is unparseable, fall back by
  // orientation so a landscape job never flashes a square ThinkingField.
  const ratio =
    w && h && w > 0 && h > 0
      ? w / h
      : orientation === "landscape"
        ? 3 / 2
        : orientation === "portrait"
          ? 2 / 3
          : 1;
  let width = maxWidth;
  let height = Math.round(width / ratio);
  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * ratio);
  }
  return { width, height };
}

/**
 * The one visual state machine for an in-progress or finished generation —
 * generating (ThinkingField), result (the image), error. Reused by
 * /generate, Prompt Build inline, and Prompt Critique inline so no surface
 * invents its own loading/result markup.
 */
export function GenerationCanvas({
  state,
  aspectRatio,
  orientation,
  imageUrl,
  imageAlt = "Generated result",
  errorMessage,
  onRetry,
  actions,
  className,
  jobStatus,
}: GenerationCanvasProps) {
  const box = resolveFrameBox(aspectRatio, orientation);

  if (state === "error") {
    return (
      <div className={`space-y-4 text-center ${className ?? ""}`}>
        <p className="text-body-md">{errorMessage ?? "Generation failed."}</p>
        {onRetry && <Button onClick={onRetry}>Try again</Button>}
      </div>
    );
  }

  if (state === "result") {
    if (imageUrl) {
      return (
        <div className={`space-y-4 ${className ?? ""}`}>
          <div
            className="mx-auto overflow-hidden rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] transition-[width,aspect-ratio] duration-200 ease-out"
            style={{
              width: box.width,
              maxWidth: "100%",
              aspectRatio: `${box.width} / ${box.height}`,
            }}
          >
            <img src={imageUrl} alt={imageAlt} className="h-full w-full object-contain" />
          </div>
          {actions && (
            <div className="mx-auto w-full" style={{ maxWidth: box.width }}>
              {actions}
            </div>
          )}
        </div>
      );
    }
    return (
      <div className={`space-y-3 text-center ${className ?? ""}`}>
        <ThinkingField
          variant="generate"
          status={GENERATION_STAGE_LABELS.loadingImage}
          width={box.width}
          height={box.height}
          className="[&>div]:transition-[width,aspect-ratio] [&>div]:duration-200 [&>div]:ease-out"
        />
        <p className="text-body-md">{GENERATION_STAGE_LABELS.loadingImage}</p>
      </div>
    );
  }

  // generating
  return (
    <div className={`space-y-3 text-center ${className ?? ""}`}>
      <GenerationThinking
        jobStatus={jobStatus ?? null}
        ratioLabel={aspectRatio}
        orientation={orientation}
        width={box.width}
        height={box.height}
      />
    </div>
  );
}

function GenerationThinking({
  jobStatus,
  ratioLabel,
  orientation,
  width,
  height,
}: {
  jobStatus: GenerationJobUiStatus;
  ratioLabel: string;
  orientation?: string;
  width: number;
  height: number;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - start), 1000);
    return () => clearInterval(id);
  }, []);

  const view = describeGenerationThinking(elapsedMs, jobStatus);
  const caption = [
    view.hint,
    elapsedMs >= 1000 ? formatGenerationElapsed(elapsedMs) : null,
    ratioLabel,
    orientation ?? null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <ThinkingField
        variant="generate"
        status={view.headline}
        width={width}
        height={height}
        className="[&>div]:transition-[width,aspect-ratio] [&>div]:duration-200 [&>div]:ease-out"
      />
      <p className="text-body-md">{view.headline}</p>
      <p className="text-body-sm text-[color:var(--text-secondary)]">{caption}</p>
    </>
  );
}
