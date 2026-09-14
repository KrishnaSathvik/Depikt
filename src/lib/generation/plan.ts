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

const CONTACT_SHEET_RE = /\b(contact\s*sheet|sticker\s*sheet)\b/i;
const GRID_RE = /\b\d+\s*[x×]\s*\d+\b/;
const GRID_CONTEXT_RE = /\b(sheet|grid|panel|panels)\b/i;
const COLLAGE_RE = /\b(collage|mood\s*board|moodboard|comparison\s*board)\b/i;
const OVERVIEW_RE = /\boverview\b/i;
const SEPARATE_ASSETS_RE =
  /\b(separate\s+(images|files|assets)|individual\s+images|each\s+as\s+(its\s+own|a\s+separate))\b/i;
const DELIVERABLE_COUNT_RE =
  /\b(\d+)\s+(?:[A-Za-z][\w-]*\s+){0,3}(images?|ads?|variations?|scenes?|layouts?|examples?|concepts?|environments?)\b/i;
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

  if (
    CONTACT_SHEET_RE.test(userPrompt) ||
    (GRID_RE.test(userPrompt) && GRID_CONTEXT_RE.test(userPrompt))
  ) {
    return finish("contact_sheet", 1, false, searchNeeded(userPrompt));
  }
  if (
    (COLLAGE_RE.test(userPrompt) || OVERVIEW_RE.test(userPrompt)) &&
    !SEPARATE_ASSETS_RE.test(userPrompt)
  ) {
    return finish("collage", 1, false, searchNeeded(userPrompt));
  }

  const listed = countListedVariants(userPrompt);
  const explicit = explicitDeliverableCount(userPrompt);
  const intentCount =
    intent.series.enabled && intent.series.count && intent.series.count > 1
      ? intent.series.count
      : null;
  const panelWantsSeparate = intent.series.unit === "panel" && SEPARATE_ASSETS_RE.test(userPrompt);

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
      intentCount ?? explicit ?? (listed >= 2 ? listed : AUTO_SERIES_CAP),
    );
    return finish("series", desired, true, searchNeeded(userPrompt));
  }

  return finish("single", 1, false, searchNeeded(userPrompt));
}

export function resolveSelectedCount(plan: GenerationPlan, selectedCount?: number): number {
  if (!plan.requiresCountConfirmation) return plan.autoCount;
  if (selectedCount === plan.autoCount || selectedCount === plan.desiredCount) return selectedCount;
  throw new Error("selectedCount must be autoCount or desiredCount");
}

function finish(
  mode: OutputMode,
  desiredCount: number,
  separateAssets: boolean,
  searchNeededValue: boolean,
): GenerationPlan {
  const autoCount = mode === "series" ? Math.min(desiredCount, AUTO_SERIES_CAP) : 1;
  return {
    mode,
    desiredCount: mode === "series" ? desiredCount : 1,
    autoCount,
    separateAssets: mode === "series" ? true : false,
    searchNeeded: searchNeededValue,
    requiresCountConfirmation: mode === "series" && desiredCount > AUTO_SERIES_CAP,
  };
}

function searchNeeded(userPrompt: string): boolean {
  return SEARCH_RE.test(userPrompt);
}

function explicitDeliverableCount(userPrompt: string): number | null {
  const m = userPrompt.match(DELIVERABLE_COUNT_RE);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 2 ? n : null;
}

/** Slash, " or ", and comma-separated visual variants. Generic — not a domain list. */
function countListedVariants(userPrompt: string): number {
  // A single comma-rich sentence (breakfast ingredients) is not a variant list.
  // Require either a slash/`or` split of 2+, or 3+ short comma phrases after a period.
  if (/\//.test(userPrompt) || /\bor\b/i.test(userPrompt)) {
    const bits = userPrompt
      .split(/\s+or\s+|\/+/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 80);
    return bits.length;
  }
  const sentences = userPrompt
    .split(".")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const afterLastPeriod = sentences.pop() ?? "";
  const phrases = afterLastPeriod
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 60);
  return phrases.length >= 3 ? phrases.length : 0;
}
