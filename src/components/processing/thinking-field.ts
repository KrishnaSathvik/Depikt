// Shared math for ThinkingField's dot lattice. Dot positions are fixed;
// only radius/opacity are ever animated, driven by moving "influence"
// points. No physics, no dependencies.

export type ThinkingVariant = "generate" | "build" | "critique";

export interface DotStyle {
  radius: number;
  opacity: number;
}

export interface FieldPoint {
  /** 0..1 within the lattice */
  nx: number;
  ny: number;
}

const MIN_RADIUS = 1.1;
const MAX_RADIUS = 4.8;
const MIN_OPACITY = 0.07;
const MAX_OPACITY = 0.9;

/**
 * Global tempo for influence motion. ~1.0 felt near-static on long image
 * jobs; 2.6 keeps a readable pulse without looking frantic.
 */
export const THINKING_FIELD_TEMPO = 2.6;

function styleFromStrength(strength: number): DotStyle {
  const clamped = Math.max(0, Math.min(1, strength));
  return {
    radius: MIN_RADIUS + clamped * (MAX_RADIUS - MIN_RADIUS),
    opacity: MIN_OPACITY + clamped * (MAX_OPACITY - MIN_OPACITY),
  };
}

function gaussian(distance: number, sigma: number): number {
  return Math.exp(-(distance * distance) / (2 * sigma * sigma));
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Deterministic 2D pseudo-random hash, 0..1. Unlike hashing a linear grid
 * index (adjacent dots differ by exactly 1), this varies independently in
 * both directions so per-dot noise doesn't alias into a smooth gradient.
 */
function hash2(nx: number, ny: number): number {
  const s = Math.sin(nx * 127.1 + ny * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Two organic influence points on a lissajous-ish path, plus a soft wave.
 * The busiest of the three — image creation in progress.
 */
function generateField(nx: number, ny: number, t: number): number {
  const s = t * THINKING_FIELD_TEMPO;
  const ax = 0.5 + Math.sin(s * 0.42) * 0.38;
  const ay = 0.5 + Math.cos(s * 0.31) * 0.34;
  const bx = 0.5 + Math.cos(s * 0.27 + 1.4) * 0.36;
  const by = 0.5 + Math.sin(s * 0.38 + 0.7) * 0.36;

  const a = gaussian(distance(nx, ny, ax, ay), 0.24);
  const b = gaussian(distance(nx, ny, bx, by), 0.22);
  const wave = 0.18 * Math.sin(nx * 6.5 + s * 1.15) * Math.sin(ny * 6.5 - s * 0.95);

  return a * 0.8 + b * 0.7 + wave;
}

/**
 * True per-dot scatter crossfading into crisp horizontal bands — messy
 * idea resolving into structure (Build text pipeline; unused for image gen).
 */
function buildField(nx: number, ny: number, t: number): number {
  const s = t * THINKING_FIELD_TEMPO;
  const cycle = (Math.sin((s / 3.2) * Math.PI * 2) + 1) / 2;
  const organization = cycle;

  const n = hash2(nx, ny);
  const flicker = 0.5 + 0.5 * Math.sin(n * 23 + s * 1.6);
  const organicStrength = 0.1 + 0.55 * n * flicker;

  const bandIndex = Math.floor(ny * 9);
  const inBand = bandIndex % 3 === 0;
  const bandStrength = inBand ? 0.9 + 0.1 * Math.sin(nx * 14 + s * 2.0) : 0.03;

  return organicStrength * (1 - organization) + bandStrength * organization;
}

/**
 * A soft band sweeping vertically through a quiet field — inspection,
 * not creation (Critique text pipeline; unused for image gen).
 */
function critiqueField(nx: number, ny: number, t: number): number {
  const s = t * THINKING_FIELD_TEMPO;
  const scanY = (Math.sin(s * 0.55) + 1) / 2;
  const band = gaussian(Math.abs(ny - scanY), 0.13);
  const ambient = 0.04 + 0.05 * hash2(nx, ny);
  return band * 0.9 + ambient;
}

/**
 * Compute the style for one dot at logical time `t` (seconds), for the
 * given variant.
 */
export function computeDotStyle(variant: ThinkingVariant, point: FieldPoint, t: number): DotStyle {
  const { nx, ny } = point;
  let strength: number;
  switch (variant) {
    case "generate":
      strength = generateField(nx, ny, t);
      break;
    case "build":
      strength = buildField(nx, ny, t);
      break;
    case "critique":
      strength = critiqueField(nx, ny, t);
      break;
    default: {
      const _exhaustive: never = variant;
      void _exhaustive;
      strength = 0.25;
      break;
    }
  }
  return styleFromStrength(strength);
}

/** Static (reduced-motion) style: gentle fixed variation, no animation. */
export function computeStaticDotStyle(point: FieldPoint): DotStyle {
  const { nx, ny } = point;
  const strength = 0.25 + 0.2 * gaussian(distance(nx, ny, 0.5, 0.5), 0.35) + 0.05 * hash2(nx, ny);
  return styleFromStrength(strength);
}

export interface GridSpec {
  cols: number;
  rows: number;
}

/** Grid density: denser for the requested pixel size, capped for perf. */
export function resolveGrid(widthPx: number, heightPx: number): GridSpec {
  const targetSpacing = widthPx < 420 ? 22 : 20;
  const cols = Math.max(8, Math.min(28, Math.round(widthPx / targetSpacing)));
  const rows = Math.max(6, Math.min(22, Math.round(heightPx / targetSpacing)));
  return { cols, rows };
}
