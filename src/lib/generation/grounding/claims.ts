import { temporalRequests, visualRequirement } from "./temporal.ts";
import type { Intent } from "../../prompt-engine/intent.ts";
import { contextFacts, type GroundingBundle, type GroundedValidationClaim } from "./contract.ts";
import { relevantResult, usableEvidence } from "./relevance.ts";

const authoritative = new Set(["official_documentation", "official_product", "institutional"]);
const researchOnly =
  /^(?:please\s+)?(?:research|search|look up|find|consult|check|use)\b.*\b(?:references?|sources?|documentation|evidence|research)\b/i;
const nonVisual =
  /\b(?:compatibility|compatible|release date|released|version number|authorship|attribution|creator|author|copyright|license|licence|price|cost|\d+[- ]parts?|parts? count)\b/i;
const temporal = /\b(?:current|today|tonight|latest|official|first.party)\b/i;

/** User text is the ONLY source of requirement strings. Intent can identify a
 * literal requested span, never supply a paraphrase or inferred source fact.
 * Matching evidence establishes topical provenance, not certainty of a fact.
 * Ambiguous/nonvisual claims are retained for audit but omitted from V5 checks.
 */
export function compileGroundedValidationClaims(args: {
  prompt: string;
  intent?: Intent;
  bundle: GroundingBundle;
}): Pick<GroundingBundle, "validationClaims" | "authorityStatus"> {
  const { prompt, intent, bundle } = args;
  const evidence = [
    ...contextFacts(bundle),
    ...bundle.visualReferences.map((r) => ({ text: r.description, sourceId: r.sourceId })),
  ].filter((e) => usableEvidence(e.text));
  const sourceById = new Map(bundle.sources.map((s) => [s.id, s]));
  const needsAuthority = temporal.test(prompt);
  const hasAuthority = evidence.some((e) => {
    const source = sourceById.get(e.sourceId);
    return (
      source &&
      authoritative.has(source.quality) &&
      relevantResult({ ...source, title: "", excerpt: e.text }, prompt)
    );
  });
  const authorityStatus = needsAuthority
    ? hasAuthority
      ? "available"
      : "official evidence unavailable"
    : "not_required";
  // Keep clauses intact (including negation and conjunctions). Never extract
  // candidate text from snippets, titles, image captions or planner missing_facts.
  const clauses = prompt.split(/(?:[.!?;\n]+|,?\s+then\s+)/i).map((s) => s.trim());
  const literalIntent = [
    ...(intent?.requested_changes ?? []),
    ...(intent?.must_preserve ?? []),
  ].filter((s) => s.length > 0 && prompt.includes(s));
  const candidates = [...new Set([...clauses, ...literalIntent])];
  const validationClaims: GroundedValidationClaim[] = [];
  for (const requirement of candidates) {
    if (
      !requirement ||
      requirement.length > 600 ||
      researchOnly.test(requirement) ||
      /^(?:please\s+)?(?:research|search|look up|find|consult)\b/i.test(requirement)
    )
      continue;
    const supportedBy = [
      ...new Set(
        evidence
          .filter((e) => {
            const source = sourceById.get(e.sourceId);
            return source && relevantResult({ ...source, title: "", excerpt: e.text }, requirement);
          })
          .map((e) => e.sourceId),
      ),
    ];
    if (!supportedBy.length) continue;
    const authoritativeSupport = supportedBy.some((id) =>
      authoritative.has(sourceById.get(id)!.quality),
    );
    validationClaims.push({
      requirement,
      origin: "user",
      supportedBy,
      // A photograph cannot prove hidden component counts, release metadata,
      // or current/official accuracy backed only by community material.
      checkableVisually: !nonVisual.test(requirement) && (!needsAuthority || authoritativeSupport),
    });
    if (validationClaims.length === 8) break;
  }
  return { validationClaims, authorityStatus };
}

/** Recompile at the validation boundary, including for legacy cached snapshots.
 * Persisted claims alone never confer authority to add a requirement. */
export function groundedValidationRequirements(
  bundle: GroundingBundle | undefined,
  prompt: string,
  intent?: Intent,
): string[] {
  if (!bundle) return [];
  return (compileGroundedValidationClaims({ bundle, prompt, intent }).validationClaims ?? [])
    .filter((c) => c.checkableVisually)
    .map((c) =>
      temporalRequests(prompt, intent).length ? visualRequirement(c.requirement) : c.requirement,
    )
    .filter(Boolean);
}
