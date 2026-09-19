import { z } from "zod";
import type { Intent } from "../../prompt-engine/intent.ts";
import type { GroundingBundle } from "./contract.ts";

/** Trusted evidence-provider attestation, never inferred from snippets, upload
 * paths, publication timestamps, or the time we fetched a page. */
export const AppearanceEvidenceSchema = z
  .strictObject({
    basis: z.literal("verified_appearance"),
    coverage: z.string().min(1).max(600),
    validFrom: z.iso.datetime(),
    validThrough: z.iso.datetime(),
  })
  .refine((e) => e.validFrom <= e.validThrough);
export const TemporalSupportSchema = z.strictObject({
  status: z.enum(["verified", "unverified"]),
  requested: z.array(z.string().max(100)).min(1).max(20),
  supportedBy: z.array(z.string().max(80)).max(8),
  message: z.string().max(300),
});
export type TemporalSupport = z.infer<typeof TemporalSupportSchema>;
const phrases = () =>
  /\b(?:as\s+(?:they|it)\s+appear(?:s)?\s+(?:today|now)|as\s+of\s+\d{4}(?:-\d{2}-\d{2})?|present[- ]day|current|today|tonight|latest)\b/gi;
export function temporalRequests(prompt: string, intent?: Intent): string[] {
  let text = prompt;
  for (const { text: literal } of intent?.exact_text ?? [])
    if (literal) text = text.split(literal).join("");
  text = text.replace(/"[^"\n]*"|`[^`\n]*`/g, "");
  return [...new Set(text.match(phrases()) ?? [])].slice(0, 20);
}
export function visualRequirement(text: string): string {
  return text
    .replace(phrases(), "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[ ,;]+$/, "");
}
export function temporalSupport(
  prompt: string,
  bundle?: GroundingBundle,
  intent?: Intent,
  now = new Date(),
): TemporalSupport | undefined {
  const requested = temporalRequests(prompt, intent);
  if (!requested.length) return undefined;
  const day = now.toISOString().slice(0, 10);
  const ranges = requested.map((request) => {
    const date = request.match(/\d{4}(?:-\d{2}-\d{2})?/)?.[0];
    if (date?.length === 4) return [`${date}-01-01T00:00:00.000Z`, `${date}-12-31T23:59:59.999Z`];
    return [`${date ?? day}T00:00:00.000Z`, `${date ?? day}T23:59:59.999Z`];
  });
  const claims = (bundle?.validationClaims ?? []).filter(
    (c) => c.origin === "user" && c.checkableVisually,
  );
  const ids = new Set<string>();
  const verified =
    !!claims.length &&
    claims.every((claim) => {
      const coverage = visualRequirement(claim.requirement).toLowerCase();
      const supporters = (bundle?.sources ?? []).filter((source) => {
        const e = source.appearanceEvidence;
        return (
          claim.supportedBy.includes(source.id) &&
          ["official_documentation", "official_product", "institutional"].includes(
            source.quality,
          ) &&
          e?.basis === "verified_appearance" &&
          visualRequirement(e.coverage).toLowerCase() === coverage &&
          ranges.every(
            ([start, end]) =>
              Date.parse(e.validFrom) <= Date.parse(start) &&
              Date.parse(e.validThrough) >= Date.parse(end),
          )
        );
      });
      supporters.forEach((s) => ids.add(s.id));
      return supporters.length > 0;
    });
  const authority = bundle?.sources.some((s) =>
    ["official_documentation", "official_product", "institutional"].includes(s.quality),
  );
  return {
    status: verified ? "verified" : "unverified",
    requested,
    supportedBy: verified ? [...ids] : [],
    message: verified
      ? requested.some((s) => /as of/i.test(s))
        ? "Grounded with authoritative sources for the requested period."
        : "Grounded with current authoritative sources"
      : authority
        ? "Grounded with authoritative references. Current appearance could not be independently verified."
        : "Current appearance could not be independently verified.",
  };
}
