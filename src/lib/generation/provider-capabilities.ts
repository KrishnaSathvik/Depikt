// Native image generation — provider capability registry.
//
// Single, typed source of truth for what each OpenAI image model can do,
// so model ids, quality values, formats, and feature support never get
// scattered across routes and pipelines. Sources (verified 2026-11-05):
//
//   - OpenAI API changelog, Nov 4 2026: gpt-image-2.6-flare and
//     gpt-image-2.6-sunburst released for v1/images/generations and
//     v1/images/edits, with adjustable complexity, SVG generation, animated
//     GIF generation, and markup-guided editing (markup also on supported
//     GPT Image 2.5 models).
//   - Image generation guide: sizes, quality ladder, output formats, GIF
//     fields (frame_count 2–64 default 9, frame_duration_ms 20–2000
//     default 200), SVG constraints (generations only, n=1), markup
//     constraints (first input image, ≤16,777,216 px, 50 MB, mutually
//     exclusive with mask and prompt_rewriter).
//   - Model pages: identical token pricing for 2.5 and 2.6 Flare/Sunburst
//     ($5/M text in, $8/M image in, $30/M image out; cached input rates
//     apply only through the Responses API, which these models do not use
//     here).
//
// Anything not documented is marked unsupported here, not assumed. Features
// demonstrated in ChatGPT (e.g. per-frame GIF editing UI) are NOT API
// capabilities unless the guide says so.

import type { GenerationOperation, ModelAlias } from "./models.ts";

export type ImageModelFamily = "2.5" | "2.6";
export type ImageQuality = "low" | "medium" | "high" | "xhigh" | "max" | "auto";
export type ImageOutputFormat = "png" | "jpeg" | "webp" | "svg" | "gif";
export type ImageComplexity = "low" | "medium" | "high";

export interface GifCapabilities {
  frameCount: { min: number; max: number; default: number };
  /** Milliseconds per frame; the API rounds to 10 ms. */
  frameDurationMs: { min: number; max: number; default: number };
}

export interface ImageSizeRules {
  recommended: readonly string[];
  custom: {
    multipleOf: number;
    aspectRatio: { min: number; max: number };
    maxEdge: number;
    minPixels: number;
    maxPixels: number;
  };
}

export interface ImageModelPricing {
  textInputPerM: number;
  imageInputPerM: number;
  imageOutputPerM: number;
  cachedTextInputPerM: number;
  cachedImageInputPerM: number;
}

export interface ImageModelCapabilities {
  id: string;
  alias: ModelAlias;
  family: ImageModelFamily;
  operations: readonly GenerationOperation[];
  qualities: readonly ImageQuality[];
  outputFormats: Record<GenerationOperation, readonly ImageOutputFormat[]>;
  /** Null when the model has no complexity control (2.5). */
  complexity: readonly ImageComplexity[] | null;
  /** Markup-guided edits via the `markup` field on /v1/images/edits. */
  markupEdit: boolean;
  /** Animated GIF output on /v1/images/generations. Null when unsupported. */
  gif: GifCapabilities | null;
  sizes: ImageSizeRules;
  /**
   * Hard reference-image cap documented by the API. Null = no documented
   * maximum (OpenAI's examples use up to 4); Depikt's own V1 product limit
   * lives in models.ts (MAX_REFERENCE_IMAGES_V1) and is separate.
   */
  maxInputImages: number | null;
  pricing: ImageModelPricing;
}

const QUALITY_LADDER: readonly ImageQuality[] = ["low", "medium", "high", "xhigh", "max", "auto"];

// Identical for 2.5 and 2.6 per the image generation guide.
const SIZE_RULES: ImageSizeRules = {
  recommended: ["1024x1024", "1536x1024", "1024x1536"],
  custom: {
    multipleOf: 16,
    aspectRatio: { min: 1 / 3, max: 3 },
    maxEdge: 3840,
    minPixels: 655_360,
    maxPixels: 8_294_400,
  },
};

// Identical token rates for 2.5 and 2.6 Flare/Sunburst per the model pages.
const PRICING: ImageModelPricing = {
  textInputPerM: 5,
  imageInputPerM: 8,
  imageOutputPerM: 30,
  cachedTextInputPerM: 1.25,
  cachedImageInputPerM: 2,
};

const RASTER_FORMATS: readonly ImageOutputFormat[] = ["png", "jpeg", "webp"];
const COMPLEXITY_LEVELS: readonly ImageComplexity[] = ["low", "medium", "high"];

const GIF_CAPABILITIES: GifCapabilities = {
  frameCount: { min: 2, max: 64, default: 9 },
  frameDurationMs: { min: 20, max: 2000, default: 200 },
};

export const IMAGE_MODEL_REGISTRY: readonly ImageModelCapabilities[] = [
  {
    id: "gpt-image-2.5-flare",
    alias: "flare",
    family: "2.5",
    operations: ["generate", "edit"],
    qualities: QUALITY_LADDER,
    outputFormats: { generate: RASTER_FORMATS, edit: RASTER_FORMATS },
    complexity: null,
    markupEdit: true,
    gif: null,
    sizes: SIZE_RULES,
    maxInputImages: null,
    pricing: PRICING,
  },
  {
    id: "gpt-image-2.5-sunburst",
    alias: "sunburst",
    family: "2.5",
    operations: ["generate", "edit"],
    qualities: QUALITY_LADDER,
    outputFormats: { generate: RASTER_FORMATS, edit: RASTER_FORMATS },
    complexity: null,
    markupEdit: true,
    gif: null,
    sizes: SIZE_RULES,
    maxInputImages: null,
    pricing: PRICING,
  },
  {
    id: "gpt-image-2.6-flare",
    alias: "flare",
    family: "2.6",
    operations: ["generate", "edit"],
    qualities: QUALITY_LADDER,
    outputFormats: { generate: [...RASTER_FORMATS, "svg", "gif"], edit: RASTER_FORMATS },
    complexity: COMPLEXITY_LEVELS,
    markupEdit: true,
    gif: GIF_CAPABILITIES,
    sizes: SIZE_RULES,
    maxInputImages: null,
    pricing: PRICING,
  },
  {
    id: "gpt-image-2.6-sunburst",
    alias: "sunburst",
    family: "2.6",
    operations: ["generate", "edit"],
    qualities: QUALITY_LADDER,
    outputFormats: { generate: [...RASTER_FORMATS, "svg", "gif"], edit: RASTER_FORMATS },
    complexity: COMPLEXITY_LEVELS,
    markupEdit: true,
    gif: GIF_CAPABILITIES,
    sizes: SIZE_RULES,
    maxInputImages: null,
    pricing: PRICING,
  },
];

const BY_ID = new Map(IMAGE_MODEL_REGISTRY.map((m) => [m.id, m]));

export function capabilitiesForModelId(modelId: string): ImageModelCapabilities | null {
  return BY_ID.get(modelId) ?? null;
}

export function capabilitiesFor(
  alias: ModelAlias,
  family: ImageModelFamily,
): ImageModelCapabilities {
  const found = IMAGE_MODEL_REGISTRY.find((m) => m.alias === alias && m.family === family);
  if (!found) throw new Error(`No registered image model for ${family}/${alias}`);
  return found;
}

export interface ImageRequestShape {
  operation: GenerationOperation;
  quality: string;
  outputFormat: string;
  complexity?: string | null;
  referenceCount?: number;
  hasMask?: boolean;
  hasMarkup?: boolean;
  gif?: { frameCount?: number; frameDurationMs?: number } | null;
}

/**
 * Rejects any model/operation/quality/format/complexity combination the
 * provider does not support. Call this before reserving credits so an
 * unsupported request never reaches the money path; openai-images.ts calls
 * it again right before the API request as defense in depth.
 */
export function assertImageRequestSupported(
  modelId: string,
  req: ImageRequestShape,
): ImageModelCapabilities {
  const caps = capabilitiesForModelId(modelId);
  if (!caps) {
    throw new Error(`Unsupported image model: ${modelId}`);
  }
  if (!caps.operations.includes(req.operation)) {
    throw new Error(`${modelId} does not support ${req.operation}`);
  }
  if (!caps.qualities.includes(req.quality as ImageQuality)) {
    throw new Error(`${modelId} does not support quality "${req.quality}"`);
  }
  if (!caps.outputFormats[req.operation].includes(req.outputFormat as ImageOutputFormat)) {
    throw new Error(`${modelId} does not support ${req.outputFormat} output for ${req.operation}`);
  }
  if (req.complexity != null) {
    if (!caps.complexity) {
      throw new Error(`${modelId} does not support the complexity setting`);
    }
    if (!caps.complexity.includes(req.complexity as ImageComplexity)) {
      throw new Error(`${modelId} does not support complexity "${req.complexity}"`);
    }
  }
  if (req.hasMask && req.hasMarkup) {
    throw new Error("markup-guided edits cannot be combined with a mask");
  }
  if ((req.hasMask || req.hasMarkup) && req.operation !== "edit")
    throw new Error("Annotations require editing");
  if (req.gif && req.outputFormat !== "gif")
    throw new Error("Animation parameters require GIF output");
  if (req.hasMarkup && !caps.markupEdit) {
    throw new Error(`${modelId} does not support markup-guided edits`);
  }
  if (req.outputFormat === "gif" && req.gif) {
    const gif = caps.gif;
    if (!gif) throw new Error(`${modelId} does not support GIF output`);
    const { frameCount, frameDurationMs } = req.gif;
    if (
      frameCount != null &&
      (!Number.isInteger(frameCount) ||
        frameCount < gif.frameCount.min ||
        frameCount > gif.frameCount.max)
    ) {
      throw new Error(
        `frame_count must be between ${gif.frameCount.min} and ${gif.frameCount.max}`,
      );
    }
    if (
      frameDurationMs != null &&
      (!Number.isInteger(frameDurationMs) ||
        frameDurationMs < gif.frameDurationMs.min ||
        frameDurationMs > gif.frameDurationMs.max)
    ) {
      throw new Error(
        `frame_duration_ms must be between ${gif.frameDurationMs.min} and ${gif.frameDurationMs.max}`,
      );
    }
  }
  return caps;
}

/** Pixel-dimension check against the documented custom-size rules. */
export function isSupportedSize(
  caps: ImageModelCapabilities,
  width: number,
  height: number,
): boolean {
  const { custom } = caps.sizes;
  if (width <= 0 || height <= 0) return false;
  if (width % custom.multipleOf !== 0 || height % custom.multipleOf !== 0) return false;
  if (width > custom.maxEdge || height > custom.maxEdge) return false;
  const pixels = width * height;
  if (pixels < custom.minPixels || pixels > custom.maxPixels) return false;
  const ratio = width / height;
  return ratio >= custom.aspectRatio.min && ratio <= custom.aspectRatio.max;
}
