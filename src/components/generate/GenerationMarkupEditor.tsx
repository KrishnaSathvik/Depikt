import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import { Pencil, MoveUpRight, Circle, Square, Type, Undo2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecoverableImage } from "@/components/RecoverableImage";

type Point = { x: number; y: number };
type Tool = "pen" | "arrow" | "circle" | "rectangle" | "text";
export type Annotation = { tool: Tool; points: Point[]; text?: string };
const TOOLS = [
  { tool: "pen", label: "Freehand", Icon: Pencil },
  { tool: "arrow", label: "Arrow", Icon: MoveUpRight },
  { tool: "circle", label: "Circle", Icon: Circle },
  { tool: "rectangle", label: "Rectangle", Icon: Square },
  { tool: "text", label: "Text label", Icon: Type },
] as const;

function drawAnnotations(canvas: HTMLCanvasElement, annotations: Annotation[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Ink is drawn into the annotation artifact, not a UI color surface.
  ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue("--accent").trim() || "CanvasText";
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = Math.max(3, canvas.width / 160);
  ctx.lineCap = "round";
  for (const annotation of annotations) {
    const points = annotation.points.map((p) => ({
      x: p.x * canvas.width,
      y: p.y * canvas.height,
    }));
    const first = points[0],
      last = points.at(-1);
    if (!first || !last) continue;
    ctx.beginPath();
    if (annotation.tool === "text") {
      ctx.font = `${Math.max(16, canvas.width / 32)}px sans-serif`;
      ctx.fillText(annotation.text ?? "", first.x, first.y);
    } else if (annotation.tool === "circle")
      ctx.ellipse(
        (first.x + last.x) / 2,
        (first.y + last.y) / 2,
        Math.abs(last.x - first.x) / 2,
        Math.abs(last.y - first.y) / 2,
        0,
        0,
        Math.PI * 2,
      );
    else if (annotation.tool === "rectangle")
      ctx.rect(first.x, first.y, last.x - first.x, last.y - first.y);
    else {
      ctx.moveTo(first.x, first.y);
      for (const point of points) ctx.lineTo(point.x, point.y);
      if (annotation.tool === "arrow") {
        const angle = Math.atan2(last.y - first.y, last.x - first.x),
          length = canvas.width / 30;
        for (const delta of [-Math.PI / 6, Math.PI / 6]) {
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(
            last.x - length * Math.cos(angle + delta),
            last.y - length * Math.sin(angle + delta),
          );
        }
      }
    }
    ctx.stroke();
  }
}

export function GenerationMarkupEditor({
  imageUrl,
  width,
  height,
  onChange,
}: {
  imageUrl: string;
  width: number;
  height: number;
  onChange: (png: Uint8Array | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;
  const active = useRef<number | null>(null);
  const anchor = useRef<Point | null>(null);
  const cursor = useRef<Point>({ x: 0.5, y: 0.5 });
  const [tool, setTool] = useState<Tool>("pen");
  const [text, setText] = useState("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawAnnotations(canvas, annotations);
    if (!annotations.length) {
      callbackRef.current(null);
      return;
    }
    const b64 = canvas.toDataURL("image/png").split(",")[1];
    callbackRef.current(b64 ? Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)) : null);
  }, [annotations, width, height]);
  const point = (e: PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };
  const start = (p: Point) => {
    anchor.current = p;
    setAnnotations((prev) => [
      ...prev,
      { tool, points: [p], ...(tool === "text" ? { text: text.slice(0, 120) } : {}) },
    ]);
  };
  const move = (p: Point) =>
    setAnnotations((prev) => {
      const last = prev.at(-1);
      return last
        ? [
            ...prev.slice(0, -1),
            { ...last, points: tool === "pen" ? [...last.points, p] : [last.points[0] ?? p, p] },
          ]
        : prev;
    });
  const end = () => {
    active.current = null;
    anchor.current = null;
  };
  const key = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      cursor.current = {
        x: Math.max(
          0,
          Math.min(
            1,
            cursor.current.x + (e.key === "ArrowRight" ? 0.02 : e.key === "ArrowLeft" ? -0.02 : 0),
          ),
        ),
        y: Math.max(
          0,
          Math.min(
            1,
            cursor.current.y + (e.key === "ArrowDown" ? 0.02 : e.key === "ArrowUp" ? -0.02 : 0),
          ),
        ),
      };
      if (anchor.current) move(cursor.current);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (anchor.current) end();
      else start(cursor.current);
    } else if (e.key === "Escape") end();
    else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      setAnnotations((prev) => prev.slice(0, -1));
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" aria-label="Annotation tools">
        {TOOLS.map(({ tool: choice, label, Icon }) => (
          <Button
            key={choice}
            size="icon"
            variant={tool === choice ? "default" : "outline"}
            aria-label={label}
            title={label}
            aria-pressed={tool === choice}
            onClick={() => setTool(choice)}
          >
            <Icon className="size-4" />
          </Button>
        ))}
        <Button
          size="icon"
          variant="outline"
          title="Undo annotation"
          aria-label="Undo annotation"
          disabled={!annotations.length}
          onClick={() => setAnnotations((prev) => prev.slice(0, -1))}
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          title="Clear annotations"
          aria-label="Clear annotations"
          disabled={!annotations.length}
          onClick={() => setAnnotations([])}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      {tool === "text" && (
        <input
          className="w-full rounded-md border border-border bg-background p-2 text-foreground"
          aria-label="Annotation label"
          maxLength={120}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}
      <div className="relative overflow-hidden rounded-md border border-border">
        <RecoverableImage
          src={imageUrl}
          alt="Original image"
          className="block w-full"
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          tabIndex={0}
          aria-label="Markup canvas"
          className="absolute inset-0 h-full w-full touch-none cursor-crosshair focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          onKeyDown={key}
          onPointerDown={(e) => {
            if (e.button !== 0 || active.current !== null) return;
            e.preventDefault();
            active.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            start(point(e));
          }}
          onPointerMove={(e) => {
            if (active.current === e.pointerId && tool !== "text") move(point(e));
          }}
          onPointerUp={end}
          onPointerCancel={end}
          onLostPointerCapture={end}
        />
      </div>
    </div>
  );
}
