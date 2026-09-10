import { useEffect, useRef } from "react";
import {
  computeDotStyle,
  computeStaticDotStyle,
  resolveGrid,
  type FieldPoint,
  type ThinkingVariant,
} from "./thinking-field";

interface Dot extends FieldPoint {
  seed: number;
}

function buildDots(cols: number, rows: number): Dot[] {
  const dots: Dot[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Inset slightly so edge dots aren't clipped by their own radius.
      const nx = cols === 1 ? 0.5 : (col + 0.5) / cols;
      const ny = rows === 1 ? 0.5 : (row + 0.5) / rows;
      dots.push({ nx, ny, seed: row * cols + col });
    }
  }
  return dots;
}

function resolveInkColor(el: HTMLElement): [number, number, number] {
  const raw = getComputedStyle(el).getPropertyValue("--accent-processing").trim();
  const match = /^#([0-9a-f]{6})$/i.exec(raw);
  if (!match) return [59, 91, 219]; // fallback: same as the --accent-processing default
  const hex = match[1];
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

export interface ThinkingFieldProps {
  variant: ThinkingVariant;
  /** Rendered in a polite live region beneath the canvas. */
  status: string;
  /** e.g. "4 / 5" — sizes the field to the resolved generation ratio. Omit for a fixed box. */
  aspectRatio?: string;
  className?: string;
}

/**
 * Shared processing visual: a fixed dot lattice whose size/opacity swell
 * through the field per `variant`. Canvas is decorative (aria-hidden);
 * `status` is the only thing assistive tech hears.
 */
export function ThinkingField({ variant, status, aspectRatio, className }: ThinkingFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotsRef = useRef<Dot[]>([]);
  const colorRef = useRef<[number, number, number]>([59, 91, 219]);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(performance.now());

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    colorRef.current = resolveInkColor(container);

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let cssWidth = 0;
    let cssHeight = 0;

    function sizeCanvas() {
      const rect = container!.getBoundingClientRect();
      cssWidth = Math.max(1, Math.round(rect.width));
      cssHeight = Math.max(1, Math.round(rect.height));
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = Math.round(cssWidth * dpr);
      canvas!.height = Math.round(cssHeight * dpr);
      canvas!.style.width = `${cssWidth}px`;
      canvas!.style.height = `${cssHeight}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const { cols, rows } = resolveGrid(cssWidth, cssHeight);
      dotsRef.current = buildDots(cols, rows);
      drawFrame();
    }

    function drawFrame() {
      const [r, g, b] = colorRef.current;
      ctx!.clearRect(0, 0, cssWidth, cssHeight);
      const reduced = reducedMotionQuery.matches;
      const t = (performance.now() - startRef.current) / 1000;
      for (const dot of dotsRef.current) {
        const style = reduced
          ? computeStaticDotStyle(dot, dot.seed)
          : computeDotStyle(variant, dot, t, dot.seed);
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${style.opacity})`;
        ctx!.arc(dot.nx * cssWidth, dot.ny * cssHeight, style.radius, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function loop() {
      drawFrame();
      rafRef.current = requestAnimationFrame(loop);
    }

    function startLoop() {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (reducedMotionQuery.matches) {
        drawFrame();
        rafRef.current = null;
      } else {
        rafRef.current = requestAnimationFrame(loop);
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      sizeCanvas();
    });
    resizeObserver.observe(container);

    sizeCanvas();
    startLoop();

    function handleMotionPreferenceChange() {
      startLoop();
    }
    reducedMotionQuery.addEventListener("change", handleMotionPreferenceChange);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      reducedMotionQuery.removeEventListener("change", handleMotionPreferenceChange);
    };
  }, [variant]);

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="mx-auto w-full overflow-hidden rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)]"
        style={aspectRatio ? { maxWidth: 400, aspectRatio } : { height: 180 }}
      >
        <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  );
}
