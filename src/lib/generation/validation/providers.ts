import { createOpenAIValidationProviders, type ValidationTelemetry } from "./openai-providers.ts";
import { z } from "zod";
import { boundedResponse } from "../grounding/provider.ts";
import { isPublicHttpsUrl } from "../grounding/contract.ts";
import type { StoredImage } from "../openai-images.ts";
import type { OcrProvider, VisualJudge } from "./engine.ts";
const ocrSchema = z.strictObject({
  text: z.string().max(20000),
  confidence: z.number().min(0).max(1),
});
const decisionsSchema = z
  .array(
    z.strictObject({
      id: z.string().max(100),
      passed: z.boolean(),
      confidence: z.number().min(0).max(1),
      evidence: z.string().max(400),
    }),
  )
  .max(30);
/** Only invoked when a check needs OCR or judging; no requests for deterministic checks. */
export function createValidationProviders(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): { ocr: OcrProvider; judge: VisualJudge; telemetry: ValidationTelemetry } {
  if (!env.VALIDATION_PROVIDER_URL)
    return createOpenAIValidationProviders(env.OPENAI_API_KEY, fetchImpl);
  const telemetry: ValidationTelemetry = { calls: 0, estimatedCostUsd: null };
  const image = (s: StoredImage) => ({
    mimeType: s.mimeType,
    base64: Buffer.from(s.bytes).toString("base64"),
  });
  const call = async (operation: string, input: unknown) => {
    const endpoint = env.VALIDATION_PROVIDER_URL,
      token = env.VALIDATION_PROVIDER_TOKEN;
    if (!endpoint || !isPublicHttpsUrl(endpoint) || !token)
      throw new Error("Validation provider not configured");
    telemetry.calls++;
    const response = await fetchImpl(endpoint, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ operation, input }),
    });
    return JSON.parse(new TextDecoder().decode(await boundedResponse(response, 64000)));
  };
  return {
    telemetry,
    ocr: { read: async (s) => ocrSchema.parse(await call("ocr", { image: image(s) })) },
    judge: {
      judge: async (input) =>
        decisionsSchema.parse(
          await call("judge", {
            image: image(input.image),
            references: input.references.map(image),
            checks: input.checks,
            referenceBindings: input.referenceBindings,
            source: input.source ? image(input.source) : undefined,
            mask: input.mask ? image(input.mask) : undefined,
          }),
        ),
    },
  };
}
