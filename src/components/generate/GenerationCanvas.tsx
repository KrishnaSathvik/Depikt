import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThinkingField } from "@/components/processing/ThinkingField";

export type GenerationCanvasState = "ready" | "generating" | "result" | "error";

export interface GenerationCanvasProps {
  state: GenerationCanvasState;
  /** e.g. "4:5" — shapes the frame; also fed to ThinkingField as "4 / 5". */
  aspectRatio: string;
  orientation?: "portrait" | "landscape" | "square";
  imageUrl?: string | null;
  imageAlt?: string;
  errorMessage?: string | null;
  onRetry?: () => void;
  /** Rendered under the frame in "result" state — pass a <GenerationActions/>. */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * The one visual state machine for a generation result region — ready
 * (static dot field before any job exists), generating (ThinkingField),
 * result (the image), error. Reused by /generate, Prompt Build inline, and
 * Prompt Critique inline so no surface invents its own loading/result
 * markup.
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
}: GenerationCanvasProps) {
  const cssRatio = aspectRatio.includes("/") ? aspectRatio : aspectRatio.replace(":", " / ");
  // Extreme portrait ratios (2:3, 9:16, …) shouldn't force the whole desktop
  // page to an absurd height — cap how tall the frame is allowed to grow.
  const frameStyle: React.CSSProperties = {
    aspectRatio: cssRatio,
    maxWidth: orientation === "landscape" ? 720 : 480,
    maxHeight: 560,
    transition: "max-width 200ms ease, aspect-ratio 200ms ease",
  };

  if (state === "error") {
    return (
      <div className={`space-y-4 text-center ${className ?? ""}`}>
        <p className="text-body-md">{errorMessage ?? "Generation failed."}</p>
        {onRetry && <Button onClick={onRetry}>Try again</Button>}
      </div>
    );
  }

  if (state === "result" && imageUrl) {
    return (
      <div className={`space-y-4 ${className ?? ""}`}>
        <div
          className="mx-auto overflow-hidden rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)]"
          style={frameStyle}
        >
          <img src={imageUrl} alt={imageAlt} className="h-full w-full object-contain" />
        </div>
        {actions && <div className="flex justify-center">{actions}</div>}
      </div>
    );
  }

  if (state === "generating") {
    return (
      <div className={`space-y-3 text-center ${className ?? ""}`}>
        <div className="mx-auto" style={frameStyle}>
          <ThinkingField
            variant="generate"
            status="Creating your image"
            aspectRatio={cssRatio}
            className="h-full w-full [&>div]:h-full [&>div]:max-w-none"
          />
        </div>
        <p className="text-body-md">Creating your image</p>
        <ElapsedCaption ratioLabel={aspectRatio} orientation={orientation} />
      </div>
    );
  }

  // ready
  return (
    <div className={`space-y-3 text-center ${className ?? ""}`}>
      <div className="mx-auto" style={frameStyle}>
        <ThinkingField
          variant="generate"
          status="Your image will appear here"
          aspectRatio={cssRatio}
          animated={false}
          className="h-full w-full [&>div]:h-full [&>div]:max-w-none"
        />
      </div>
      <p className="text-body-sm text-[color:var(--text-secondary)]">Your image will appear here</p>
    </div>
  );
}

function ElapsedCaption({ ratioLabel, orientation }: { ratioLabel: string; orientation?: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="text-body-sm text-[color:var(--text-secondary)]">
      {ratioLabel}
      {orientation ? ` · ${orientation}` : ""}
      {elapsed > 0 ? ` · ${elapsed}s` : ""}
    </p>
  );
}
