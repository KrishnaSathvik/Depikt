// Deterministic request construction for the prompt engine (v2.9 semantics).
//
// This module holds the server-side logic that decides WHAT the model sees:
// the cinematic category lock, the aspect-ratio lock, the random curated
// example injection, the remix block, and the final user-message layout.
//
// It was extracted from the API route so that the benchmark harness and the
// route build byte-identical requests. Behavior is intentionally unchanged
// from v2.9. Phase 2 will redesign this (intent analysis, no legacy examples).

import { curatedPrompts, type CuratedPrompt } from "../data/curated-prompts.ts";

export type PromptMode = "default" | "BATCH" | "JSON" | "CRITIQUE";

export interface PromptRequestInput {
  userInput: string;
  referenceImageUrl?: string | null;
  remixRef?: string | null;
  category?: string | null;
  mode: PromptMode;
  /**
   * Random source for example selection. Defaults to Math.random (production).
   * The benchmark harness injects a seeded RNG so every model sees the same
   * examples for a given case.
   */
  random?: () => number;
}

export interface PromptRequest {
  userMessage: string;
  effectiveCategory: string | null;
  cinematicForced: boolean;
  lockedRatio: string | null;
  exampleIds: string[];
  remixUsed: boolean;
}

// Category index for curated prompts — built once on module load.
const categoryIndex = new Map<string, CuratedPrompt[]>();
curatedPrompts.forEach((p) => {
  const list = categoryIndex.get(p.category) || [];
  list.push(p);
  categoryIndex.set(p.category, list);
});

// Map system-prompt category names to curated-library category names.
export const CATEGORY_TO_LIBRARY: Record<string, string> = {
  "CINEMATIC SCENE": "Cinematic",
  "POSTER/COVER": "Posters",
  "INFOGRAPHIC/DIAGRAM": "Infographics",
  "UI MOCKUP": "UI Mockups",
  "SOCIAL POST": "Social Posts",
  "STORYBOARD/MULTI-PANEL": "Storyboards",
  "INTERIOR/ARCH/FOOD/FASHION": "Interior/Food/Fashion",
  "VISUAL SUMMARY": "Visual Summaries",
  "IMAGE EDIT": "Image Edits",
  "OPEN-ENDED CREATIVE": "Open-Ended Creative",
};

// Pick up to `count` random examples from a library category.
function pickExamples(
  libraryCategory: string,
  count: number,
  random: () => number,
): CuratedPrompt[] {
  const pool = categoryIndex.get(libraryCategory);
  if (!pool || pool.length === 0) return [];
  // Fisher-Yates partial shuffle for unbiased selection.
  const copy = pool.slice();
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// Select examples for a given effectiveCategory (system-prompt name).
// When null (auto-detect), pick 1 example each from the 4 most common categories.
export function getExamplesForCategory(
  effectiveCategory: string | null,
  count: number,
  random: () => number = Math.random,
): CuratedPrompt[] {
  if (effectiveCategory) {
    const libCat = CATEGORY_TO_LIBRARY[effectiveCategory];
    if (libCat) return pickExamples(libCat, count, random);
    return [];
  }
  const sorted = [...categoryIndex.entries()].sort((a, b) => b[1].length - a[1].length);
  const result: CuratedPrompt[] = [];
  for (const [cat] of sorted.slice(0, 4)) {
    result.push(...pickExamples(cat, 1, random));
  }
  return result;
}

// Format selected examples into a block for the user message.
export function formatExamplesBlock(examples: CuratedPrompt[]): string {
  if (examples.length === 0) return "";
  const lines = examples.map((ex, i) => {
    const parts = [`[${i + 1}] ${ex.title} (${ex.category})`, `Prompt: ${ex.prompt}`];
    if (ex.why_it_works) parts.push(`Why it works: ${ex.why_it_works}`);
    return parts.join("\n");
  });
  return `REFERENCE EXAMPLES (study structure and detail level, do not copy):\n\n${lines.join("\n\n")}`;
}

// Deterministic CINEMATIC OVERRIDE: when the user explicitly types
// "cinematic shot/still/photo/...," "movie still," or "film still/scene/frame,"
// force the category to CINEMATIC SCENE in code so the model can't
// override it via subject-domain inference.
export const CINEMATIC_TRIGGERS: RegExp[] = [
  /\bcinematic\s+(shot|still|photo|image|portrait|frame|framing|lighting|composition)\b/i,
  /\bmovie\s+(scene|still|frame)\b/i,
  /\bfilm\s+(still|scene|frame)\b/i,
];

// Deterministic ASPECT RATIO LOCK: when the user names a ratio
// (direct "16:9", word "square", or implied "thumbnail"/"story"),
// force the model to include that exact ratio in its output.
export const ASPECT_KEYWORDS: Array<[RegExp, string]> = [
  [/\b(\d{1,2}:\d{1,2}(?:\.\d+)?)\b/, "DIRECT"],
  [/\binstagram\s+story\b/i, "9:16"],
  [/\byoutube\s+thumbnail\b/i, "16:9"],
  [/\bsquare\s+format\b/i, "1:1"],
  [/\bsquare\b/i, "1:1"],
  [/\bportrait\b/i, "4:5"],
  [/\bvertical\b/i, "9:16"],
  [/\bstory\b/i, "9:16"],
  [/\breel\b/i, "9:16"],
  [/\btiktok\b/i, "9:16"],
  [/\blandscape\b/i, "16:9"],
  [/\bhorizontal\b/i, "16:9"],
  [/\bwidescreen\b/i, "16:9"],
  [/\bthumbnail\b/i, "16:9"],
  [/\bbanner\b/i, "16:9"],
  [/\bcinematic\s+(?:shot|still|photo|image|portrait|frame|framing|aspect)\b/i, "2.39:1"],
  [/\bpinterest\b/i, "2:3"],
];

export function detectLockedRatio(userIdea: string): string | null {
  for (const [re, ratio] of ASPECT_KEYWORDS) {
    const m = userIdea.match(re);
    if (m) return ratio === "DIRECT" ? m[1] : ratio;
  }
  return null;
}

export function detectCinematicForced(userIdea: string, category?: string | null): boolean {
  return (!category || category === "auto") && CINEMATIC_TRIGGERS.some((re) => re.test(userIdea));
}

export const REMIX_REF_MAX_LENGTH = 8000;

/** Build the exact user message the model receives (v2.9 layout). */
export function buildPromptRequest(input: PromptRequestInput): PromptRequest {
  const random = input.random ?? Math.random;
  const userIdea = input.userInput.trim();
  const category = input.category ?? null;

  const cinematicForced = detectCinematicForced(userIdea, category);
  const effectiveCategory = cinematicForced
    ? "CINEMATIC SCENE"
    : category && category !== "auto"
      ? category
      : null;

  const lockedRatio = detectLockedRatio(userIdea);

  // Skip examples when remixing — the remix reference IS the template.
  const validRemixRef =
    input.remixRef &&
    typeof input.remixRef === "string" &&
    input.remixRef.length <= REMIX_REF_MAX_LENGTH
      ? input.remixRef
      : null;
  const examples = validRemixRef ? [] : getExamplesForCategory(effectiveCategory, 4, random);
  const examplesBlock = formatExamplesBlock(examples);

  const userMessage = [
    input.referenceImageUrl
      ? `REFERENCE IMAGE: A reference image is attached. Follow the REFERENCE IMAGE instructions in your system prompt.`
      : null,
    validRemixRef
      ? `REMIX REFERENCE — The user is remixing an existing prompt from the library. Study the reference prompt below and use it as a STYLE GUIDE — match its tone, structure, and approach — but generate a NEW prompt for the user's idea.

REFERENCE PROMPT:
${validRemixRef}

REMIX RULES:
1. STYLE MATCH: Write in the same format as the reference — if conversational, stay conversational. If structured with constraints, use constraints. If it uses camera specs, use camera specs. If it doesn't, don't add them.
2. FRESH CONTENT: Generate a complete, ready-to-use prompt for the user's idea. Never copy the reference verbatim. Never output placeholder brackets like [SUBJECT] or [COLOR] — fill everything in with concrete details.
3. SAME DENSITY: Match the reference's approximate length and level of detail.
4. OVERRIDE: When the reference's style conflicts with your default templates (Step 2) or self-check rules (Step 3), follow the reference's style. The reference IS the quality standard for this remix.`
      : null,
    examplesBlock || null,
    effectiveCategory ? `Category hint: ${effectiveCategory}` : null,
    cinematicForced
      ? `LOCKED CATEGORY: The user explicitly requested cinematic framing. Use the CINEMATIC SCENE template. Do NOT route to INTERIOR/ARCH/FOOD/FASHION even if the subject is a wedding, kitchen, food, dress, or building.`
      : null,
    lockedRatio
      ? `LOCKED ASPECT RATIO: ${lockedRatio} — The output prompt MUST include the exact phrase "${lockedRatio} aspect ratio" verbatim. Do not substitute a different ratio. Do not omit it.`
      : null,
    `Mode: ${input.mode}`,
    `User idea: ${userIdea}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    userMessage,
    effectiveCategory,
    cinematicForced,
    lockedRatio,
    exampleIds: examples.map((e) => e.id),
    remixUsed: !!validRemixRef,
  };
}
