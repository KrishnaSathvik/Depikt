// Native image generation — Image Model Router.
//
// Users never choose Flare vs Sunburst: at max quality they cost OpenAI the
// same (see the benchmark in research/images-2-5-community/runs/_fixtures/
// log.json, labels bench-*), so asking a user to pick between them is a
// technical question they usually can't answer usefully, and it invites
// everyone to default to "the fancier one" even though Sunburst runs
// roughly 2x slower for no quality guarantee a user can verify themselves.
// Depikt decides.
//
// Deterministic-first: every rule below is a plain signal check, no model
// call, so the decision is predictable and fully unit-testable. An AI
// classifier for genuinely ambiguous cases is a real future improvement —
// not built here; see the "Not implemented" note in the report this file
// shipped with.

import type { ModelAlias } from "./models";

export interface RoutingHints {
  /** From Prompt's Intent Analyzer output (result.intent), when available. */
  category?: string;
  /** result.intent.exact_text.length, when available. */
  exactTextCount?: number;
  /** result.intent.reference_intent, when available. */
  referenceIntent?: string;
}

export interface ModelRouterInput {
  operation: "generate" | "edit";
  promptText: string;
  referenceCount: number;
  hints?: RoutingHints;
}

// Categories from src/lib/prompt-engine/categories.ts whose typical output
// leans on structured layout/typography precision.
const LAYOUT_HEAVY_CATEGORIES = new Set(["poster", "infographic", "ui"]);
// reference_intent values (src/lib/prompt-engine/intent.ts) that mean the
// output must preserve something specific, not just take style cues.
const FIDELITY_REFERENCE_INTENTS = new Set(["subject_identity", "product_object", "edit_source"]);

const EXACT_TEXT_RE = /["“][^"”]{3,}["”]|'[^']{3,}'/;
const EXACT_TEXT_PHRASE_RE =
  /\b(exact(ly)?\s+text|title\s+(that\s+)?says|headline|typography|verbatim)\b/i;
const LAYOUT_KEYWORD_RE =
  /\b(infographic|poster|slide|presentation|dashboard|diagram|chart|storyboard|multi-panel|ui\s+mockup|user\s+interface|layout)\b/i;
const FIDELITY_KEYWORD_RE =
  /\b(preserve|keep|maintain|same)\b[^.]{0,30}\b(face|identity|likeness|product|logo|brand|exact)\b/i;
const PRECISE_EDIT_RE = /\b(only|just)\b[^.]{0,20}\bchange\b|\blocaliz(e|ed)\b|\bprecise(ly)?\b/i;

export function resolveGenerationModel(input: ModelRouterInput): ModelAlias {
  const { operation, promptText, referenceCount, hints } = input;
  const text = promptText ?? "";

  // 1. Structured signal from Prompt, when available — trust it over
  // re-deriving from prose, same principle as the aspect-ratio resolver.
  if (hints?.exactTextCount && hints.exactTextCount > 0) return "sunburst";
  if (hints?.category && LAYOUT_HEAVY_CATEGORIES.has(hints.category)) return "sunburst";
  if (hints?.referenceIntent && FIDELITY_REFERENCE_INTENTS.has(hints.referenceIntent))
    return "sunburst";

  // 2. Edits: precision/identity/localized preservation needs Sunburst;
  // a simple edit is fine on Flare.
  if (operation === "edit") {
    if (FIDELITY_KEYWORD_RE.test(text) || PRECISE_EDIT_RE.test(text)) return "sunburst";
  }

  // 3. Significant exact text in the prompt itself.
  if (EXACT_TEXT_RE.test(text) || EXACT_TEXT_PHRASE_RE.test(text)) return "sunburst";

  // 4. Complex structured layout.
  if (LAYOUT_KEYWORD_RE.test(text)) return "sunburst";

  // 5. Multiple references, or a single reference with an explicit
  // fidelity ask in the text.
  if (referenceCount > 1) return "sunburst";
  if (referenceCount === 1 && FIDELITY_KEYWORD_RE.test(text)) return "sunburst";

  // 6. Otherwise: Flare, OpenAI's own default for most applications.
  return "flare";
}
