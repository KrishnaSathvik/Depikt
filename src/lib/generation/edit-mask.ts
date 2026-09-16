import { encodeRgbaPng } from "./png-mask.ts";

export type MaskStrokeMode = "paint" | "erase";

export interface MaskPoint {
  x: number; // normalized 0–1
  y: number;
}

export interface MaskStroke {
  mode: MaskStrokeMode;
  points: MaskPoint[];
  radius: number; // normalized 0–1 relative to min(sourceWidth, sourceHeight)
}

export function clamp01(n: number): number {
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

export function pointerToNormalized(
  pointerX: number,
  pointerY: number,
  renderedWidth: number,
  renderedHeight: number,
): MaskPoint {
  return {
    x: clamp01(renderedWidth === 0 ? 0 : pointerX / renderedWidth),
    y: clamp01(renderedHeight === 0 ? 0 : pointerY / renderedHeight),
  };
}

export function normalizedToSourcePixel(
  point: MaskPoint,
  sourceWidth: number,
  sourceHeight: number,
): { x: number; y: number } {
  // source pixel = round(normalized * (dimension-1)), clamped to [0, dim-1]
  return {
    x: normalizedToAxis(point.x, sourceWidth),
    y: normalizedToAxis(point.y, sourceHeight),
  };
}

function normalizedToAxis(n: number, dimension: number): number {
  if (dimension <= 1) return 0;
  const pixel = Math.round(clamp01(n) * (dimension - 1));
  return Math.min(dimension - 1, Math.max(0, pixel));
}

function strokeFill(mode: MaskStrokeMode): number {
  switch (mode) {
    case "paint":
      return 255;
    case "erase":
      return 0;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function stampDisk(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  value: number,
): void {
  const r2 = radius * radius;
  const y0 = Math.max(0, cy - radius);
  const y1 = Math.min(height - 1, cy + radius);
  const x0 = Math.max(0, cx - radius);
  const x1 = Math.min(width - 1, cx + radius);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r2) continue;
      const i = (y * width + x) * 4;
      pixels[i] = value;
      pixels[i + 1] = value;
      pixels[i + 2] = value;
      pixels[i + 3] = value;
    }
  }
}

function interpolateSegment(
  from: { x: number; y: number },
  to: { x: number; y: number },
  stamp: (x: number, y: number) => void,
): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    stamp(Math.round(from.x + dx * t), Math.round(from.y + dy * t));
  }
}

export function rasterizeMask(
  strokes: MaskStroke[],
  sourceWidth: number,
  sourceHeight: number,
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(sourceWidth * sourceHeight * 4);
  const minDim = Math.min(sourceWidth, sourceHeight);
  for (const stroke of strokes) {
    const radiusPx = Math.max(1, Math.round(stroke.radius * minDim));
    const value = strokeFill(stroke.mode);
    const stamp = (x: number, y: number) => {
      stampDisk(pixels, sourceWidth, sourceHeight, x, y, radiusPx, value);
    };
    if (stroke.points.length === 0) continue;
    let prev = normalizedToSourcePixel(stroke.points[0]!, sourceWidth, sourceHeight);
    stamp(prev.x, prev.y);
    for (let i = 1; i < stroke.points.length; i++) {
      const next = normalizedToSourcePixel(stroke.points[i]!, sourceWidth, sourceHeight);
      interpolateSegment(prev, next, stamp);
      prev = next;
    }
  }
  return pixels;
}

export function exportMaskPng(
  strokes: MaskStroke[],
  sourceWidth: number,
  sourceHeight: number,
): Uint8Array {
  const pixels = rasterizeMask(strokes, sourceWidth, sourceHeight);
  // The editor paints opaque coverage; the Images API edits transparent
  // pixels. Keep the preview representation separate from the wire mask.
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i + 3] = 255 - pixels[i + 3]!;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
  }
  return encodeRgbaPng(pixels, sourceWidth, sourceHeight);
}

export function hasPaintCoverage(
  strokes: MaskStroke[],
  sourceWidth: number,
  sourceHeight: number,
): boolean {
  if (sourceWidth <= 0 || sourceHeight <= 0) return false;
  const pixels = rasterizeMask(strokes, sourceWidth, sourceHeight);
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] === 255) return true;
  }
  return false;
}

export function bytesToPngDataUrl(bytes: Uint8Array): string {
  return `data:image/png;base64,${btoa(binaryFromBytes(bytes))}`;
}

function binaryFromBytes(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return binary;
}
