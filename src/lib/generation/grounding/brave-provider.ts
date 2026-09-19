import { AuthorityDomainRulesSchema, authorityDomains, classifySourceDomain } from "./authority.ts";
import { createHash } from "node:crypto";
import { z } from "zod";
import { isPublicHttpsUrl, type GroundingBundle, type GroundingProvider } from "./contract.ts";
import type { StoredImage } from "../openai-images.ts";
import { boundedResponse } from "./provider.ts";
const rows = z
  .array(
    z.object({
      url: z.string().max(2048).nullable().optional(),
      title: z.string().max(2000).nullable().optional(),
      description: z.string().max(10000).optional(),
      thumbnail: z
        .object({ src: z.string().max(2048).nullable().optional() })
        .nullable()
        .optional(),
    }),
  )
  .max(20);
export function isBraveImageUrl(value: string): boolean {
  return isPublicHttpsUrl(value) && new URL(value).hostname === "imgs.search.brave.com";
}
/** Concrete vendor adapter; the planner, cache and execution code depend only on GroundingProvider. */
export function createBraveGroundingProvider(
  env: Record<string, string | undefined>,
  fetchImpl: typeof fetch,
): GroundingProvider & { loadImages(bundle: GroundingBundle): Promise<StoredImage[]> } {
  const key = env.BRAVE_SEARCH_API_KEY;
  if (!key) throw new Error("Brave search key missing");
  const rules = AuthorityDomainRulesSchema.parse(
    JSON.parse(env.GROUNDING_SOURCE_RULES_JSON ?? "[]"),
  );
  const search = async (kind: "web" | "images", query: string) => {
    const url = new URL(`https://api.search.brave.com/res/v1/${kind}/search`);
    url.searchParams.set("q", query.slice(0, 400).split(/\s+/).slice(0, 50).join(" "));
    url.searchParams.set("count", "10");
    url.searchParams.set("safesearch", "strict");
    // Current appearance is not equivalent to a page published this week.
    // Keep evergreen first-party reference pages eligible; never claim recency
    // just because a result appeared in a current-oriented search.
    const response = await fetchImpl(url, {
      headers: { "X-Subscription-Token": key, Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    const json = JSON.parse(new TextDecoder().decode(await boundedResponse(response, 256000)));
    const parsed = rows.parse(kind === "web" ? (json.web?.results ?? []) : (json.results ?? []));
    return parsed
      .filter(
        (r) =>
          r.url &&
          isPublicHttpsUrl(r.url) &&
          (kind === "web" || (r.thumbnail?.src && isBraveImageUrl(r.thumbnail.src))),
      )
      .map((r) => ({
        url: r.url!,
        title: (r.title ?? r.url!).slice(0, 200),
        excerpt: (r.description ?? r.title ?? "").replace(/<[^>]*>/g, "").slice(0, 400),
        quality: classifySourceDomain(r.url!, rules),
        ...(kind === "images" ? { imageUrl: r.thumbnail!.src! } : {}),
      }));
  };
  return {
    cacheNamespace: `brave-v3:${createHash("sha256").update(JSON.stringify(rules)).digest("hex")}`,
    authorityDomains: (prompt) => authorityDomains(prompt, rules),
    searchWeb: (q) => search("web", q),
    searchImages: (q) => search("images", q),
    async loadImages(bundle) {
      const images: StoredImage[] = [];
      for (const reference of bundle.visualReferences) {
        if (!isBraveImageUrl(reference.imageUrl)) throw new Error("Untrusted image host");
        const response = await fetchImpl(reference.imageUrl, {
          redirect: "error",
          signal: AbortSignal.timeout(15000),
        });
        const mimeType = response.headers.get("content-type")?.split(";")[0];
        if (!mimeType || !["image/png", "image/jpeg", "image/webp"].includes(mimeType))
          throw new Error("Invalid reference media");
        const bytes = await boundedResponse(response, 4_000_000);
        if (!bytes.length) throw new Error("Empty reference image");
        images.push({
          bytes,
          mimeType,
          filename: `research-${images.length}.${mimeType.split("/")[1]}`,
        });
      }
      return images;
    },
  };
}
