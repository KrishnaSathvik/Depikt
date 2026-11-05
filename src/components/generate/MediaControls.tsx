import type { ImageOutputFormat } from "@/lib/generation/provider-capabilities";
// SVG needs the Images 2.6 family; the server family is switched via IMAGES_MODEL_FAMILY,
// and the browser mirrors it with VITE_IMAGES_MODEL_FAMILY so SVG is never offered when it would be rejected.
export const SVG_OUTPUT_AVAILABLE = import.meta.env.VITE_IMAGES_MODEL_FAMILY === "2.6";

export function MediaControls({
  format,
  onChange,
  frameCount,
  frameDurationMs,
  onFrames,
  onDuration,
}: {
  format: ImageOutputFormat;
  onChange: (format: "png" | "svg" | "gif") => void;
  frameCount: number;
  frameDurationMs: number;
  onFrames: (n: number) => void;
  onDuration: (n: number) => void;
}) {
  return (
    <details className="group text-body-sm">
      <summary className="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
        Output settings <span className="font-mono text-foreground">{format.toUpperCase()}</span>
      </summary>
      <div className="flex flex-wrap items-center gap-3 border-t border-border py-3">
        <label className="flex items-center gap-2">
          Output{" "}
          <select
            aria-label="Output format"
            className="min-h-11 rounded-md border border-border bg-background p-2 text-foreground"
            value={format}
            onChange={(e) => onChange(e.target.value as "png" | "svg" | "gif")}
          >
            <option value="png">PNG</option>
            <option value="svg" disabled={!SVG_OUTPUT_AVAILABLE}>
              {SVG_OUTPUT_AVAILABLE ? "SVG" : "SVG (coming soon)"}
            </option>
            <option value="gif">Animated GIF (preview settings only)</option>
          </select>
        </label>
        {format === "gif" && (
          <>
            <label>
              Frames{" "}
              <input
                aria-label="Frame count"
                type="number"
                min={2}
                max={64}
                value={frameCount}
                onChange={(e) => onFrames(Number(e.target.value))}
                className="min-h-11 w-20 rounded-md border border-border bg-background p-2"
              />
            </label>
            <label>
              Frame duration (ms){" "}
              <input
                aria-label="Frame duration"
                type="number"
                min={20}
                max={2000}
                step={10}
                value={frameDurationMs}
                onChange={(e) => onDuration(Number(e.target.value))}
                className="min-h-11 w-24 rounded-md border border-border bg-background p-2"
              />
            </label>
            <span role="status">
              Animation generation unavailable until credit pricing is verified. No credits charged.
            </span>
          </>
        )}
      </div>
    </details>
  );
}
