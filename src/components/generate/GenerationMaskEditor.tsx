import { useEffect, useRef, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { pointerToNormalized, rasterizeMask, type MaskStroke } from "@/lib/generation/edit-mask";

const BRUSH_MIN = 0.01;
const BRUSH_MAX = 0.15;
const PREVIEW_ALPHA = 0.4;

export function GenerationMaskEditor({
  imageUrl,
  sourceWidth,
  sourceHeight,
  strokes,
  onStrokesChange,
  brushRadius,
  onBrushRadiusChange,
  tool,
  onToolChange,
}: {
  imageUrl: string;
  sourceWidth: number;
  sourceHeight: number;
  strokes: MaskStroke[];
  onStrokesChange: (next: MaskStroke[]) => void;
  brushRadius: number;
  onBrushRadiusChange: (n: number) => void;
  tool: "paint" | "erase";
  onToolChange: (tool: "paint" | "erase") => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const strokesRef = useRef(strokes);
  strokesRef.current = drawingRef.current ? strokesRef.current : strokes;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (strokes.length === 0 || sourceWidth <= 0 || sourceHeight <= 0) return;
    const pixels = rasterizeMask(strokes, sourceWidth, sourceHeight);
    const preview = new Uint8ClampedArray(pixels.length);
    for (let i = 0; i < pixels.length; i += 4) {
      const opacity = pixels[i + 3]!;
      if (opacity === 0) continue;
      preview[i + 3] = Math.round(opacity * PREVIEW_ALPHA);
    }
    ctx.putImageData(new ImageData(preview, sourceWidth, sourceHeight), 0, 0);
  }, [strokes, sourceWidth, sourceHeight]);

  function commitStrokes(next: MaskStroke[]) {
    strokesRef.current = next;
    onStrokesChange(next);
  }

  function pointFromPointer(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return pointerToNormalized(
      e.clientX - rect.left,
      e.clientY - rect.top,
      rect.width,
      rect.height,
    );
  }

  function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
    if (e.button !== 0) return;
    if (activePointerIdRef.current !== null) return;
    e.preventDefault();
    activePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    commitStrokes([
      ...strokesRef.current,
      { mode: tool, points: [pointFromPointer(e)], radius: brushRadius },
    ]);
  }

  function onPointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    if (e.pointerId !== activePointerIdRef.current) return;
    const current = strokesRef.current;
    const last = current[current.length - 1];
    if (!last) return;
    commitStrokes([
      ...current.slice(0, -1),
      { ...last, points: [...last.points, pointFromPointer(e)] },
    ]);
  }

  function endStroke(e: PointerEvent<HTMLCanvasElement>) {
    if (e.pointerId !== activePointerIdRef.current) return;
    drawingRef.current = false;
    activePointerIdRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg)]">
        <img src={imageUrl} alt="" draggable={false} className="block h-auto w-full select-none" />
        <canvas
          ref={canvasRef}
          width={sourceWidth}
          height={sourceHeight}
          aria-label="Select area"
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLostCapture={endStroke}
        />
      </div>
      <label className="block space-y-1.5 text-body-sm text-[color:var(--text-secondary)]">
        Brush size
        <input
          type="range"
          min={BRUSH_MIN}
          max={BRUSH_MAX}
          step={0.005}
          value={brushRadius}
          onChange={(e) => onBrushRadiusChange(Number(e.target.value))}
          aria-label="Brush size"
          className="block h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[color:var(--border-subtle)] accent-[color:var(--accent)]"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={tool === "paint" ? "default" : "outline"}
          onClick={() => onToolChange("paint")}
        >
          Brush
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tool === "erase" ? "default" : "outline"}
          onClick={() => onToolChange("erase")}
        >
          Erase
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={strokes.length === 0}
          onClick={() => commitStrokes(strokes.slice(0, -1))}
        >
          Undo
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={strokes.length === 0}
          onClick={() => commitStrokes([])}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
