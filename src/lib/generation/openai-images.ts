// Native image generation — OpenAI Images API adapter.
//
// Ports the request shapes already verified in scripts/images-2-5-run.ts
// (and exercised for real in the max-quality benchmark) into a reusable,
// injectable-fetch module the server route can call. `fetchImpl` defaults
// to the global fetch but can be swapped for a mock in tests — no test in
// this repo should make a real, billable OpenAI call.

import { resolveModelId, GENERATION_QUALITY, type ModelAlias } from "./models.ts";

export interface GenerateImageInput {
  model: ModelAlias;
  prompt: string;
  width: number;
  height: number;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export interface EditImageInput extends GenerateImageInput {
  /** Reference images as raw bytes, already validated (count, MIME, size) by the caller. */
  referenceImages: { bytes: Uint8Array; filename: string; mimeType: string }[];
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

// Published rates (developers.openai.com/api/docs/models/gpt-image-2.5-flare,
// confirmed identical for gpt-image-2.5-sunburst): $5/M text input tokens,
// $8/M image input tokens, $30/M image output tokens.
const TEXT_INPUT_RATE_PER_TOKEN = 5 / 1_000_000;
const IMAGE_INPUT_RATE_PER_TOKEN = 8 / 1_000_000;
const IMAGE_OUTPUT_RATE_PER_TOKEN = 30 / 1_000_000;

export function estimateApiCostUsd(usage: OpenAIImageUsage | undefined): number | null {
  if (!usage) return null;
  const det = usage.input_tokens_details ?? {};
  const textIn = det.text_tokens ?? 0;
  const imageIn = det.image_tokens ?? 0;
  const out = usage.output_tokens ?? 0;
  return (
    textIn * TEXT_INPUT_RATE_PER_TOKEN +
    imageIn * IMAGE_INPUT_RATE_PER_TOKEN +
    out * IMAGE_OUTPUT_RATE_PER_TOKEN
  );
}

function sizeParam(width: number, height: number): string {
  return `${width}x${height}`;
}

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
  const fetchFn = input.fetchImpl ?? fetch;
  const t0 = Date.now();
  const res = await fetchFn("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: resolveModelId(input.model),
      prompt: input.prompt,
      size: sizeParam(input.width, input.height),
      quality: GENERATION_QUALITY,
      n: 1,
      output_format: "png",
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
  const t0 = Date.now();
  const form = new FormData();
  form.set("model", resolveModelId(input.model));
  form.set("prompt", input.prompt);
  form.set("size", sizeParam(input.width, input.height));
  form.set("quality", GENERATION_QUALITY);
  form.set("n", "1");
  form.set("output_format", "png");
  for (const ref of input.referenceImages) {
    form.append("image[]", new Blob([ref.bytes as BlobPart], { type: ref.mimeType }), ref.filename);
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
