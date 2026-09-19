import { AppearanceEvidenceSchema } from "./temporal.ts";
import { createBraveGroundingProvider } from "./brave-provider.ts";
import { z } from "zod";
import {
  SourceQualitySchema,
  isPublicHttpsUrl,
  type GroundingProvider,
  type GroundingBundle,
} from "./contract.ts";
import type { StoredImage } from "../openai-images.ts";

const resultsSchema = z
  .array(
    z.strictObject({
      url: z.string().max(2048),
      title: z.string().max(200),
      excerpt: z.string().max(400),
      quality: SourceQualitySchema,
      appearanceEvidence: AppearanceEvidenceSchema.optional(),
      imageUrl: z.string().max(2048).optional(),
    }),
  )
  .max(20);
export async function boundedResponse(response: Response, maxBytes: number): Promise<Uint8Array> {
  if (!response.ok || !response.body) throw new Error("Research provider unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) throw new Error("Provider response too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
/** Vendor-independent, server-configured search gateway protocol. Never accepts a browser endpoint. */
export function createGroundingProvider(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): GroundingProvider & { loadImages(bundle: GroundingBundle): Promise<StoredImage[]> } {
  if (!env.GROUNDING_PROVIDER_URL && env.BRAVE_SEARCH_API_KEY)
    return createBraveGroundingProvider(env, fetchImpl);
  const endpoint = env.GROUNDING_PROVIDER_URL;
  const token = env.GROUNDING_PROVIDER_TOKEN;
  if (!endpoint || !isPublicHttpsUrl(endpoint) || !token)
    throw new Error("Grounding provider is not configured");
  const call = (operation: string, input: unknown) =>
    fetchImpl(endpoint, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ operation, input }),
    });
  const search = async (operation: string, query: string) =>
    resultsSchema.parse(
      JSON.parse(
        new TextDecoder().decode(
          await boundedResponse(await call(operation, { query, limit: 10 }), 64_000),
        ),
      ),
    );
  return {
    cacheNamespace: `gateway-v1:${endpoint}`,
    searchWeb: (q) => search("searchWeb", q),
    searchImages: (q) => search("searchImages", q),
    async loadImages(bundle) {
      const images: StoredImage[] = [];
      for (const ref of bundle.visualReferences) {
        // The trusted gateway handles DNS/redirect validation and image decoding. The app never
        // requests arbitrary web hosts or persists the returned bytes to its storage bucket.
        const response = await call("referenceImage", { url: ref.imageUrl });
        const mimeType = response.headers.get("content-type")?.split(";")[0];
        if (!mimeType || !["image/png", "image/jpeg", "image/webp"].includes(mimeType))
          throw new Error("Invalid reference media");
        const bytes = await boundedResponse(response, 4_000_000);
        if (!bytes.length) throw new Error("Empty reference image");
        images.push({
          bytes,
          mimeType,
          filename: `grounding-${images.length}.${mimeType.split("/")[1]}`,
        });
      }
      return images;
    },
  };
}
