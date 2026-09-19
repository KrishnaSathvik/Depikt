import { AppearanceEvidenceSchema, TemporalSupportSchema } from "./temporal.ts";
import { z } from "zod";

import { LAUNCH_ECONOMIC_POLICY } from "../economic-policy.ts";

export type GroundingMode = "none" | "web" | "visual" | "web_and_visual";
export interface GroundingPlan {
  needed: boolean;
  mode: GroundingMode;
  queries: string[];
  factualNeeds: string[];
  visualNeeds: string[];
}

// Never fetch a source URL in the application. These checks also protect rendered links.
export function isPublicHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      !u.hostname.includes(":") &&
      !u.hostname.endsWith(".") &&
      !/^\d+(\.\d+)*$/.test(u.hostname) &&
      !/(^|\.)(localhost|local|internal|test|invalid)$/.test(u.hostname) &&
      u.hostname.includes(".")
    );
  } catch {
    return false;
  }
}
const url = z.string().max(2048).refine(isPublicHttpsUrl);
export const SourceQualitySchema = z.enum([
  "official_documentation",
  "official_product",
  "institutional",
  "secondary",
  "community",
]);
export type SourceQuality = z.infer<typeof SourceQualitySchema>;
export const GroundingSourceSchema = z.strictObject({
  id: z.string().max(80),
  url,
  title: z.string().max(200),
  quality: SourceQualitySchema,
  appearanceEvidence: AppearanceEvidenceSchema.optional(),
});
export type GroundingSource = z.infer<typeof GroundingSourceSchema>;
const ContextFactSchema = z.strictObject({
  text: z.string().min(1).max(400),
  sourceId: z.string().max(80),
});
export const GroundedValidationClaimSchema = z.strictObject({
  requirement: z.string().min(1).max(600),
  origin: z.literal("user"),
  supportedBy: z.array(z.string().max(80)).min(1).max(8),
  checkableVisually: z.boolean(),
});
export type GroundedValidationClaim = z.infer<typeof GroundedValidationClaimSchema>;
export const GroundingBundleSchema = z
  .strictObject({
    // Legacy signed snapshots remain readable without changing their sealed bytes.
    facts: z.array(ContextFactSchema).max(12).optional(),
    contextFacts: z.array(ContextFactSchema).max(12).optional(),
    validationClaims: z.array(GroundedValidationClaimSchema).max(8).optional(),
    temporalSupport: TemporalSupportSchema.optional(),
    retrieval: z
      .strictObject({
        authorityRequested: z.boolean(),
        authorityFallbackQuery: z.string().max(400).optional(),
        authoritativeWebFound: z.boolean(),
        authoritativeVisualFound: z.boolean(),
      })
      .optional(),
    authorityStatus: z
      .enum(["not_required", "available", "official evidence unavailable"])
      .optional(),
    visualReferences: z
      .array(
        z.strictObject({
          imageUrl: url,
          sourceId: z.string().max(80),
          description: z.string().max(400),
        }),
      )
      .max(2),
    sources: z.array(GroundingSourceSchema).max(LAUNCH_ECONOMIC_POLICY.maxGroundingSources),
    queries: z.array(z.string().max(500)).max(4),
    createdAt: z.iso.datetime(),
  })
  .superRefine((b, ctx) => {
    const ids = new Set(b.sources.map((s) => s.id));
    if (
      ids.size !== b.sources.length ||
      [...(b.contextFacts ?? b.facts ?? []), ...b.visualReferences].some(
        (f) => !ids.has(f.sourceId),
      ) ||
      (b.validationClaims ?? []).some((c) => c.supportedBy.some((id) => !ids.has(id))) ||
      (b.contextFacts === undefined) === (b.facts === undefined)
    )
      ctx.addIssue({ code: "custom", message: "Invalid grounding provenance" });
  });
export type GroundingBundle = z.infer<typeof GroundingBundleSchema>;
export type GroundedFact = z.infer<typeof ContextFactSchema>;
export function contextFacts(bundle: GroundingBundle): GroundedFact[] {
  return bundle.contextFacts ?? bundle.facts ?? [];
}
export type GroundedVisualReference = GroundingBundle["visualReferences"][number];

export interface SearchResult {
  url: string;
  title: string;
  excerpt: string;
  /** Classification must be supplied by a trusted provider, never inferred from page text. */
  quality: SourceQuality;
  appearanceEvidence?: z.infer<typeof AppearanceEvidenceSchema>;
  imageUrl?: string;
}
export interface GroundingProvider {
  readonly cacheNamespace: string;
  /** Pure trusted subject/domain lookup; must not perform network calls. */
  authorityDomains?: (prompt: string) => string[];
  searchWeb(query: string): Promise<SearchResult[]>;
  searchImages(query: string): Promise<SearchResult[]>;
}
