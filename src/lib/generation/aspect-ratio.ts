// Native image generation — output-size resolution.
//
// The generation canvas follows the user's requested composition; it never
// defaults blindly to a square. Resolution order:
//
//   1. Structured aspect-ratio intent already supplied by Depikt Prompt
//      (the Intent Analyzer parses this once; don't re-guess it from prose).
//   2. An explicit ratio in the prompt text ("4:5", "16:9", ...).
//   3. A known named format Depikt has a reliable ratio for
//      (e.g. "youtube thumbnail"). Small, deliberately conservative list —
//      extend only with mappings that are actually unambiguous.
//   4. An explicit orientation word (portrait / landscape / vertical /
//      wide / square).
//   5. The reference image's own ratio, only when the user asks to
//      preserve composition.
//   6. Fallback: 1024x1024. This should be rare in practice — it fires
//      only when none of the above produced anything.
//
// All dimensions are multiples of 16 and satisfy the documented OpenAI
// constraint (neither edge exceeds 3840px); see research notes in
// scripts/images-2-5-run.ts.

export type Orientation = "portrait" | "landscape" | "square";
export type SizeSource =
  | "structured"
  | "explicit_ratio"
  | "known_format"
  | "orientation"
  | "reference"
  | "fallback";

export interface ResolvedSize {
  width: number;
  height: number;
  ratioLabel: string;
  orientation: Orientation;
  source: SizeSource;
}

interface RatioEntry {
  label: string;
  width: number;
  height: number;
}

// Ordered so that ties in reference-ratio matching prefer the earlier
// (more common) entry.
const RATIO_TABLE: readonly RatioEntry[] = [
  { label: "1:1", width: 1024, height: 1024 },
  { label: "4:5", width: 1024, height: 1280 },
  { label: "5:4", width: 1280, height: 1024 },
  { label: "3:4", width: 1152, height: 1536 },
  { label: "4:3", width: 1536, height: 1152 },
  { label: "2:3", width: 1024, height: 1536 },
  { label: "3:2", width: 1536, height: 1024 },
  { label: "9:16", width: 864, height: 1536 },
  { label: "16:9", width: 1536, height: 864 },
];

const RATIO_BY_LABEL = new Map(RATIO_TABLE.map((r) => [r.label, r]));

function orientationOf(width: number, height: number): Orientation {
  if (width === height) return "square";
  return width > height ? "landscape" : "portrait";
}

function entryToResolved(entry: RatioEntry, source: SizeSource): ResolvedSize {
  return {
    width: entry.width,
    height: entry.height,
    ratioLabel: entry.label,
    orientation: orientationOf(entry.width, entry.height),
    source,
  };
}

const FALLBACK: ResolvedSize = entryToResolved(
  { label: "1:1", width: 1024, height: 1024 },
  "fallback",
);

const ORIENTATION_DEFAULTS: Record<Orientation, RatioEntry> = {
  square: { label: "1:1", width: 1024, height: 1024 },
  portrait: { label: "2:3", width: 1024, height: 1536 },
  landscape: { label: "3:2", width: 1536, height: 1024 },
};

// Small, deliberately conservative: only names with one obvious ratio.
const KNOWN_FORMATS: readonly { pattern: RegExp; ratioLabel: string }[] = [
  { pattern: /youtube\s+thumbnail/i, ratioLabel: "16:9" },
  { pattern: /instagram\s+(story|stories|reel)/i, ratioLabel: "9:16" },
  { pattern: /tiktok/i, ratioLabel: "9:16" },
  { pattern: /instagram\s+post/i, ratioLabel: "1:1" },
  // A "hero image" (blog post, article, landing page, website banner) is
  // unambiguously a wide banner — never square. Without this, a prompt
  // like "blog post hero image" matched nothing below and fell all the
  // way to the 1:1 fallback.
  { pattern: /\bhero\s+image\b/i, ratioLabel: "16:9" },
  { pattern: /\b(blog|article)\s+(banner|header)\b/i, ratioLabel: "16:9" },
];

const EXPLICIT_RATIO_RE = /\b(\d{1,2})\s*:\s*(\d{1,2})\b/;

const ORIENTATION_WORDS: readonly { pattern: RegExp; orientation: Orientation }[] = [
  { pattern: /\b(portrait|vertical)\b/i, orientation: "portrait" },
  { pattern: /\b(landscape|wide|widescreen|horizontal)\b/i, orientation: "landscape" },
  { pattern: /\bsquare\b/i, orientation: "square" },
];

const PRESERVE_COMPOSITION_RE =
  /\b(preserve|keep|match|maintain)\b[^.]{0,40}\b(composition|ratio|aspect|framing)\b|same\s+(composition|ratio|aspect)\s+as|same\s+as\s+the\s+(reference|original|source)/i;

/** Snaps an arbitrary width/height to the nearest supported bucket by ratio distance. */
function nearestRatioEntry(width: number, height: number): RatioEntry {
  const target = width / height;
  let best = RATIO_TABLE[0];
  let bestDelta = Infinity;
  for (const entry of RATIO_TABLE) {
    const delta = Math.abs(entry.width / entry.height - target);
    if (delta < bestDelta) {
      best = entry;
      bestDelta = delta;
    }
  }
  return best;
}

export interface ResolveSizeInput {
  /** Raw user-facing prompt text (direct /generate input, or the Build/Critique final prompt). */
  promptText: string;
  /** Structured ratio already known from Depikt Prompt's Intent Analyzer, e.g. "4:5". Wins over re-parsing prose. */
  structuredAspectRatio?: string | null;
  /** Pixel dimensions of an attached reference image, when the user is asking to preserve its composition. */
  referenceRatio?: { width: number; height: number } | null;
}

export function resolveGenerationSize(input: ResolveSizeInput): ResolvedSize {
  const { promptText, structuredAspectRatio, referenceRatio } = input;
  const text = promptText ?? "";

  // 1. Structured intent from Prompt — exact hit or nearest snap.
  if (structuredAspectRatio) {
    const trimmed = structuredAspectRatio.trim();
    const exact = RATIO_BY_LABEL.get(trimmed);
    if (exact) return entryToResolved(exact, "structured");
    const parts = trimmed.split(":").map(Number);
    if (parts.length === 2 && parts[0]! > 0 && parts[1]! > 0) {
      return entryToResolved(nearestRatioEntry(parts[0]!, parts[1]!), "structured");
    }
  }

  // 2. Explicit ratio in the prompt text — exact table hit, else nearest snap
  //    so "7:5" / "21:9" still produce a real OpenAI size instead of falling
  //    through to orientation/fallback.
  const explicitMatch = text.match(EXPLICIT_RATIO_RE);
  if (explicitMatch) {
    const label = `${explicitMatch[1]}:${explicitMatch[2]}`;
    const exact = RATIO_BY_LABEL.get(label);
    if (exact) return entryToResolved(exact, "explicit_ratio");
    const w = Number(explicitMatch[1]);
    const h = Number(explicitMatch[2]);
    if (w > 0 && h > 0) {
      return entryToResolved(nearestRatioEntry(w, h), "explicit_ratio");
    }
  }

  // 3. Known named format.
  for (const { pattern, ratioLabel } of KNOWN_FORMATS) {
    if (pattern.test(text)) {
      const entry = RATIO_BY_LABEL.get(ratioLabel);
      if (entry) return entryToResolved(entry, "known_format");
    }
  }

  // 4. Explicit orientation word.
  for (const { pattern, orientation } of ORIENTATION_WORDS) {
    if (pattern.test(text)) {
      return entryToResolved(ORIENTATION_DEFAULTS[orientation], "orientation");
    }
  }

  // 5. Preserve the reference's own composition, only when asked to.
  if (
    referenceRatio &&
    referenceRatio.width > 0 &&
    referenceRatio.height > 0 &&
    PRESERVE_COMPOSITION_RE.test(text)
  ) {
    const entry = nearestRatioEntry(referenceRatio.width, referenceRatio.height);
    return entryToResolved(entry, "reference");
  }

  // 6. Fallback — should be rare.
  return FALLBACK;
}
