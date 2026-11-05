// Native image generation — OpenAI Images API adapter.
//
// Ports the request shapes already verified in scripts/images-2-5-run.ts
// (and exercised for real in the max-quality benchmark) into a reusable,
// injectable-fetch module the server route can call. `fetchImpl` defaults
// to the global fetch but can be swapped for a mock in tests — no test in
// this repo should make a real, billable OpenAI call.

import { resolveModelId, GENERATION_QUALITY, type ModelAlias } from "./models.ts";
import {
  assertImageRequestSupported,
  capabilitiesFor,
  type ImageComplexity,
  type ImageModelFamily,
  type ImageOutputFormat,
} from "./provider-capabilities.ts";

export type StoredImage = {
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
};

export interface GenerateImageInput {
  model: ModelAlias;
  /** Defaults to activeImageModelFamily() — pass explicitly in tests. */
  family?: ImageModelFamily;
  prompt: string;
  width: number;
  height: number;
  apiKey: string;
  /** 2.6 only; rejected by the capability registry on 2.5. */
  complexity?: ImageComplexity;
  /** Defaults to "png". svg/gif are 2.6 generations-only and not yet wired into the pipeline. */
  outputFormat?: ImageOutputFormat;
  fetchImpl?: typeof fetch;
}

export interface EditImageInput extends GenerateImageInput {
  /** Reference images as raw bytes, already validated (count, MIME, size) by the caller. */
  referenceImages: StoredImage[];
  /** PNG mask applied to image[0]. Never placed inside referenceImages. */
  mask?: StoredImage | null;
}

export interface OpenAIImageUsage {
  input_tokens?: number;
  input_tokens_details?: { text_tokens?: number; image_tokens?: number };
  output_tokens?: number;
  total_tokens?: number;
}

export interface GenerateImageResult {
  b64: string;
  usage?: OpenAIImageUsage;
  ms: number;
}

export class OpenAIImageError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenAIImageError";
    this.status = status;
  }
}

// Token rates come from the capability registry (identical for 2.5 and 2.6
// Flare/Sunburst per the model pages). Cached-input rates are omitted: they
// apply only through the Responses API, which this adapter does not use.
const COST_RATES = capabilitiesFor("flare", "2.5").pricing;

export function estimateApiCostUsd(usage: OpenAIImageUsage | undefined): number | null {
  if (!usage) return null;
  const det = usage.input_tokens_details ?? {};
  const textIn = det.text_tokens ?? 0;
  const imageIn = det.image_tokens ?? 0;
  const out = usage.output_tokens ?? 0;
  return (
    (textIn * COST_RATES.textInputPerM +
      imageIn * COST_RATES.imageInputPerM +
      out * COST_RATES.imageOutputPerM) /
    1_000_000
  );
}

function sizeParam(width: number, height: number): string {
  return `${width}x${height}`;
}

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
  const fetchFn = input.fetchImpl ?? fetch;
  const modelId = resolveModelId(input.model, input.family);
  const outputFormat = input.outputFormat ?? "png";
  // Reject unsupported combinations before any billable request is made.
  assertImageRequestSupported(modelId, {
    operation: "generate",
    quality: GENERATION_QUALITY,
    outputFormat,
    complexity: input.complexity ?? null,
  });
  const t0 = Date.now();
  const res = await fetchFn("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelId,
      prompt: input.prompt,
      size: sizeParam(input.width, input.height),
      quality: GENERATION_QUALITY,
      n: 1,
      output_format: outputFormat,
      ...(input.complexity ? { complexity: input.complexity } : {}),
    }),
  });
  const json = (await res.json()) as {
    data?: Array<{ b64_json: string }>;
    usage?: OpenAIImageUsage;
    error?: { message: string };
  };
  if (!res.ok || !json.data?.[0]) {
    throw new OpenAIImageError(
      json.error?.message ?? `generate failed with status ${res.status}`,
      res.status,
    );
  }
  return { b64: json.data[0].b64_json, usage: json.usage, ms: Date.now() - t0 };
}

export async function editImage(input: EditImageInput): Promise<GenerateImageResult> {
  const fetchFn = input.fetchImpl ?? fetch;
  const modelId = resolveModelId(input.model, input.family);
  // Reject unsupported combinations before any billable request is made.
  assertImageRequestSupported(modelId, {
    operation: "edit",
    quality: GENERATION_QUALITY,
    outputFormat: "png",
    complexity: input.complexity ?? null,
    referenceCount: input.referenceImages.length,
    hasMask: Boolean(input.mask),
  });
  const t0 = Date.now();
  const form = new FormData();
  form.set("model", modelId);
  form.set("prompt", input.prompt);
  form.set("size", sizeParam(input.width, input.height));
  form.set("quality", GENERATION_QUALITY);
  form.set("n", "1");
  form.set("output_format", "png");
  if (input.complexity) form.set("complexity", input.complexity);
  for (const ref of input.referenceImages) {
    form.append("image[]", new Blob([ref.bytes as BlobPart], { type: ref.mimeType }), ref.filename);
  }
  if (input.mask) {
    form.set("mask", new Blob([input.mask.bytes as BlobPart], { type: "image/png" }), "mask.png");
  }
  const res = await fetchFn("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.apiKey}` },
    body: form,
  });
  const json = (await res.json()) as {
    data?: Array<{ b64_json: string }>;
    usage?: OpenAIImageUsage;
    error?: { message: string };
  };
  if (!res.ok || !json.data?.[0]) {
    throw new OpenAIImageError(
      json.error?.message ?? `edit failed with status ${res.status}`,
      res.status,
    );
  }
  return { b64: json.data[0].b64_json, usage: json.usage, ms: Date.now() - t0 };
}
