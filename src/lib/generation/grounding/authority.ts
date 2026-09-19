import { z } from "zod";
import {
  SourceQualitySchema,
  isPublicHttpsUrl,
  type SearchResult,
  type SourceQuality,
} from "./contract.ts";
import { relevantResult } from "./relevance.ts";

export const AuthorityDomainRulesSchema = z
  .array(
    z.strictObject({
      host: z
        .string()
        .max(253)
        .regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/),
      quality: SourceQualitySchema,
      // Trusted operator aliases identify subjects for site-scoped queries, never
      // statements extracted from search snippets or arbitrary user-supplied URLs.
      subjects: z.array(z.string().min(2).max(100)).max(20).optional(),
    }),
  )
  .max(100);
export type AuthorityDomainRule = z.infer<typeof AuthorityDomainRulesSchema>[number];
const INSTITUTIONAL_NAMESPACES = [
  "gov",
  "edu",
  "gov.uk",
  "ac.uk",
  "gov.au",
  "edu.au",
  "govt.nz",
  "ac.nz",
  "gc.ca",
  "gouv.fr",
  "go.jp",
  "ac.jp",
  "gov.in",
  "ac.in",
  "edu.in",
  "gov.br",
  "edu.br",
  "gov.sg",
  "edu.sg",
  "gov.za",
  "ac.za",
  "gov.ie",
];
// Explicit ownership registry, not .org/.com, title, or brand-name guessing.
const DEFAULT_RULES: AuthorityDomainRule[] = [
  { host: "iso.org", quality: "institutional", subjects: ["ISO standards"] },
  { host: "w3.org", quality: "institutional", subjects: ["W3C", "web standards"] },
  { host: "ietf.org", quality: "institutional", subjects: ["IETF", "internet standards"] },
  { host: "unesco.org", quality: "institutional", subjects: ["UNESCO"] },
  { host: "britishmuseum.org", quality: "institutional", subjects: ["British Museum"] },
];
const within = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);
export const isAuthoritativeQuality = (quality: SourceQuality) =>
  ["official_documentation", "official_product", "institutional"].includes(quality);
export function wantsAuthority(prompt: string): boolean {
  return /\b(?:official|current|as of|today|tonight|latest|accurate|present.day|authoritative|first.party|exact real.world appearance)\b/i.test(
    prompt,
  );
}
export function classifySourceDomain(
  url: string,
  configured: AuthorityDomainRule[] = [],
): SourceQuality {
  if (!isPublicHttpsUrl(url)) return "community";
  const host = new URL(url).hostname;
  // Explicit operator classification wins, including deliberate downgrades.
  for (const rules of [configured, DEFAULT_RULES]) {
    const match = rules
      .filter((r) => within(host, r.host))
      .sort((a, b) => b.host.length - a.host.length)[0];
    if (match) return match.quality;
  }
  if (INSTITUTIONAL_NAMESPACES.some((suffix) => within(host, suffix))) return "institutional";
  return "community";
}
const words = (s: string) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
export function authorityDomains(prompt: string, configured: AuthorityDomainRule[] = []): string[] {
  const tokens = new Set(words(prompt));
  return [
    ...new Set(
      [...configured, ...DEFAULT_RULES]
        .filter(
          (r) =>
            isAuthoritativeQuality(classifySourceDomain(`https://${r.host}`, configured)) &&
            (r.subjects ?? [r.host.split(".")[0]]).some((subject) =>
              words(subject).every((word) => tokens.has(word)),
            ),
        )
        .map((r) => r.host),
    ),
  ].slice(0, 3);
}
const QUERY_NOISE = new Set(
  `research search verify please then create make show generate render image images photorealistic photograph photographic blue hour view showing from the a an of in on at and or with their correct relative placement as they appear do not invent no text official current recent visual references reference actual accurate appearance today first party present day authoritative only standalone`.split(
    " ",
  ),
);
export function authoritySubject(prompt: string): string {
  const seen = new Set<string>();
  return (prompt.match(/[\p{L}\p{N}’'-]+/gu) ?? [])
    .filter((word) => {
      const key = word.toLowerCase();
      if (QUERY_NOISE.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 24)
    .join(" ")
    .slice(0, 180);
}
export function authorityFallbackQuery(prompt: string, domains: string[] = []): string {
  const safeDomains = domains
    .filter((host) => AuthorityDomainRulesSchema.element.shape.host.safeParse(host).success)
    .slice(0, 3);
  // A regional government's domain need not be guessed from the city name.
  // Search controlled namespaces when no trusted subject/domain binding exists.
  const scope = safeDomains.length
    ? safeDomains
    : ["gov", "gov.au", "gov.uk", "gouv.fr", "go.jp", "govt.nz", "gc.ca"];
  return `${authoritySubject(prompt)} (${scope.map((host) => `site:${host}`).join(" OR ")}) official references`.slice(
    0,
    400,
  );
}
export function hasAuthoritativeEvidence(results: SearchResult[], prompt: string): boolean {
  return results.some(
    (r) =>
      isAuthoritativeQuality(r.quality) &&
      isPublicHttpsUrl(r.url) &&
      relevantResult({ ...r, title: "" }, prompt),
  );
}
