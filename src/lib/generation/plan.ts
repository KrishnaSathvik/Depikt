import type { Intent } from "../prompt-engine/intent.ts";
import type { SourceContextType } from "./job-request.ts";

export type OutputMode = "single" | "series" | "collage" | "contact_sheet" | "edit";

export interface GenerationPlan {
  mode: OutputMode;
  desiredCount: number;
  autoCount: number;
  separateAssets: boolean;
  searchNeeded: boolean;
  requiresCountConfirmation: boolean;
}

export const AUTO_SERIES_CAP = 4;
/** Absolute ceiling for a series, including a confirmed "generate all". */
export const HARD_SERIES_CAP = 20;

const CONTACT_SHEET_RE = /\b(contact\s*sheet|sticker\s*sheet)\b/i;
const GRID_RE = /\b\d+\s*[x×]\s*\d+\b/;
const GRID_CONTEXT_RE = /\b(sheet|grid|panel|panels)\b/i;
const COLLAGE_RE = /\b(collage|mood\s*board|moodboard|comparison\s*board)\b/i;
const NO_COLLAGE_RE =
  /\b(?:no|not(?:\s+as)?(?:\s+a)?|without|avoid|do not (?:make|create)(?:\s+a)?)\s+(?:collages?|mood\s*boards?|comparison\s*boards?)\b/i;
const OVERVIEW_RE = /\boverview\b/i;
const SEPARATE_ASSETS_RE =
  /\b(?:(?:separate|individual|standalone)\s+(?:[\w-]+\s+){0,4}(?:images?|files?|assets?|photos?)|each\s+(?:(?:must|should)\s+be\s+|as\s+|be\s+)?(?:its\s+own|a\s+separate))\b/i;
const WORD_COUNT_RE =
  "two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty";
const DELIVERABLE_COUNT_RE = new RegExp(
  String.raw`\b(\d+|${WORD_COUNT_RE})\s+(?:[A-Za-z][\w-]*\s+){0,3}(images?|ads?|variations?|scenes?|layouts?|examples?|concepts?|environments?)\b`,
  "i",
);
const PLURAL_DELIVERABLE_RE =
  /\b(images|ads|variations|scenes|layouts|examples|concepts|environments)\b/i;
const COORDINATING_DELIVERABLE_RE =
  /\b(layouts?|scenes?|environments?|districts?|images?|ads?|variations?|examples?|concepts?)\b/i;
const SEARCH_RE = /\b(research|look\s*up|check|current|tonight|as of)\b/i;

export function buildGenerationPlan(
  intent: Intent,
  userPrompt: string,
  source?: SourceContextType,
): GenerationPlan {
  if (source === "library") return finish("single", 1, false, searchNeeded(userPrompt));

  if (
    intent.task === "edit" ||
    intent.reference_intent === "edit_source" ||
    intent.category === "image_edit"
  ) {
    return finish("edit", 1, false, searchNeeded(userPrompt));
  }

  const separate = SEPARATE_ASSETS_RE.test(userPrompt);
  const noCollage = NO_COLLAGE_RE.test(userPrompt);
  if (
    !separate &&
    (CONTACT_SHEET_RE.test(userPrompt) ||
      (GRID_RE.test(userPrompt) && GRID_CONTEXT_RE.test(userPrompt)))
  ) {
    return finish("contact_sheet", 1, false, searchNeeded(userPrompt));
  }
  if ((COLLAGE_RE.test(userPrompt) || OVERVIEW_RE.test(userPrompt)) && !separate && !noCollage) {
    return finish("collage", 1, false, searchNeeded(userPrompt));
  }

  const listed = countListedVariants(userPrompt);
  const explicit = explicitDeliverableCount(userPrompt);
  const intentCount =
    intent.series.enabled && intent.series.count && intent.series.count > 1
      ? intent.series.count
      : null;
  const panelWantsSeparate = intent.series.unit === "panel" && (separate || noCollage);

  if (intent.series.unit === "panel" && !panelWantsSeparate && intent.series.enabled) {
    return finish("contact_sheet", 1, false, searchNeeded(userPrompt));
  }

  const seriesFromIntent =
    intent.series.enabled && (intent.series.count === null || intent.series.count > 1);
  const seriesFromPrompt =
    (explicit !== null && explicit >= 2) ||
    (listed >= 2 && PLURAL_DELIVERABLE_RE.test(userPrompt)) ||
    (listed >= 3 && COORDINATING_DELIVERABLE_RE.test(userPrompt));

  if (seriesFromIntent || seriesFromPrompt) {
    const desired = Math.max(
      2,
      explicit ?? intentCount ?? (listed >= 2 ? listed : AUTO_SERIES_CAP),
    );
    return finish("series", desired, true, searchNeeded(userPrompt));
  }

  return finish("single", 1, false, searchNeeded(userPrompt));
}

export function clampGenerationPlan(plan: GenerationPlan): GenerationPlan {
  if (plan.mode !== "series") {
    return {
      ...plan,
      desiredCount: 1,
      autoCount: 1,
      separateAssets: false,
      requiresCountConfirmation: false,
    };
  }
  const desiredCount = Math.min(Math.max(plan.desiredCount, 1), HARD_SERIES_CAP);
  const autoCount = Math.min(desiredCount, AUTO_SERIES_CAP);
  return {
    ...plan,
    desiredCount,
    autoCount,
    separateAssets: true,
    requiresCountConfirmation: desiredCount > AUTO_SERIES_CAP,
  };
}

export function resolveSelectedCount(plan: GenerationPlan, selectedCount?: number): number {
  const clamped = clampGenerationPlan(plan);
  if (!clamped.requiresCountConfirmation) return clamped.autoCount;
  if (selectedCount === clamped.autoCount || selectedCount === clamped.desiredCount) {
    return selectedCount;
  }
  throw new Error("selectedCount must be autoCount or desiredCount");
}

/**
 * Chooses the real OpenAI operation from provider-bound inputs, never the mode label. `plan.mode === "edit"` is
 * a UI label, not evidence of an input: a signed plan for a plain `single`/
 * `series` request can still carry attached reference images (Library's
 * "Use as reference", a Gallery handoff, or a manual attach on Generate) or
 * a `sourceVersionId` from a prior result. Those requests must call
 * OpenAI's images/edits endpoint with the reference bytes attached, not
 * images/generations with no image input at all -- see job-pipeline.ts's
 * "generate" branch, which never receives referenceImages. Getting this
 * wrong was a confirmed live bug: an attached reference silently produced
 * an unrelated image. See generate-reference-upload.test.ts.
 */
export function resolveOperation(
  _plan: GenerationPlan,
  referenceAssetIds: string[],
  sourceVersionId: string | null,
  entityReferenceCount = 0,
  groundingReferenceCount = 0,
): "generate" | "edit" {
  return referenceAssetIds.length +
    entityReferenceCount +
    groundingReferenceCount +
    (sourceVersionId ? 1 : 0) >
    0
    ? "edit"
    : "generate";
}

function finish(
  mode: OutputMode,
  desiredCount: number,
  separateAssets: boolean,
  searchNeededValue: boolean,
): GenerationPlan {
  return clampGenerationPlan({
    mode,
    desiredCount,
    autoCount: 1,
    separateAssets,
    searchNeeded: searchNeededValue,
    requiresCountConfirmation: false,
  });
}

function searchNeeded(userPrompt: string): boolean {
  return SEARCH_RE.test(userPrompt);
}

const WORD_COUNTS: Record<string, number> = {
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
};

function parseCountToken(raw: string): number | null {
  const digit = Number(raw);
  if (Number.isFinite(digit)) return digit;
  return WORD_COUNTS[raw.toLowerCase()] ?? null;
}

function explicitDeliverableCount(userPrompt: string): number | null {
  const m = userPrompt.match(DELIVERABLE_COUNT_RE);
  if (!m) return null;
  const n = parseCountToken(m[1]!);
  return n !== null && n >= 2 ? n : null;
}

/** Count complete variant lists, never fragments collected across unrelated instructions. */
function countListedVariants(userPrompt: string): number {
  // Paths and URLs describe inputs/implementation, not output alternatives.
  const text = userPrompt
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "reference")
    .replace(/\b[\w.-]+(?:[/\\][\w.-]+)*[/\\][\w.-]+\.[a-z\d]{1,10}\b/gi, "reference");
  const clauses = text
    .split(/(?:[.!?](?:\s+|$)|[\r\n]+)/)
    .map((part) => part.trim())
    .filter(Boolean);
  const constraint =
    /^(?:no\b|do not\b|don't\b|don’t\b|without\b|avoid\b|use\b|keep\b|preserve\b)/i;
  let variants = 0;
  for (const clause of clauses) {
    // A noun elsewhere in a long brief must not turn style choices into outputs.
    if (constraint.test(clause) || !PLURAL_DELIVERABLE_RE.test(clause)) continue;
    const parts = clause.split(/\s+or\s+|\/+/i).map((part) => part.trim());
    if (parts.length >= 2 && parts.every((part) => part.length > 0 && part.length < 80))
      variants = Math.max(variants, parts.length);
  }
  if (variants) return variants;

  // Preserve the existing trailing list form: "Build regional layouts. Coast, city, hills."
  const last = clauses.at(-1) ?? "";
  if (constraint.test(last)) return 0;
  const phrases = last.split(",").map((part) => part.trim());
  return phrases.length >= 3 && phrases.every((part) => part.length > 0 && part.length < 60)
    ? phrases.length
    : 0;
}
