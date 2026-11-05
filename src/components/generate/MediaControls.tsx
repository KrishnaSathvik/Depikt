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
    <div className="flex flex-wrap items-center gap-3 text-body-sm">
      <label className="flex items-center gap-2">
        Output{" "}
        <select
          aria-label="Output format"
          className="rounded-md border border-border bg-background p-2 text-foreground"
          value={format}
          onChange={(e) => onChange(e.target.value as "png" | "svg" | "gif")}
        >
          <option value="png">PNG</option>
          <option value="svg" disabled={!SVG_OUTPUT_AVAILABLE}>
            {SVG_OUTPUT_AVAILABLE ? "SVG" : "SVG (coming soon)"}
          </option>
          <option value="gif">Animated GIF</option>
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
              className="w-20 rounded-md border border-border bg-background p-2"
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
              className="w-24 rounded-md border border-border bg-background p-2"
            />
          </label>
          <span role="status">Cost benchmark pending · unavailable</span>
        </>
      )}
    </div>
  );
}
