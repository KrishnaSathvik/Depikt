// Stage 1 of the Images 2.5 Prompt Builder: structured intent analysis.
//
// A short model call (gpt-5.6-luna, reasoning none, strict JSON) turns the
// user's request, optional image, optional remix reference, and optional
// explicit choices into one authoritative Intent object. Code then applies
// explicit overrides (UI reference intent, literal ratio, category hint), so
// the analyzer can never override an explicit user instruction.

import { z } from "zod";
import { CATEGORY_DEFINITIONS, CATEGORY_IDS, type CategoryId } from "./categories.ts";
import { REFERENCE_DEFINITIONS, REFERENCE_INTENTS, type ReferenceIntent } from "./reference.ts";
import { normalizeRatio, parseExplicitRatio } from "./ratio.ts";
import { toStrictJsonSchema } from "./schemas.ts";

// ---------- schema ----------

export const IntentSchema = z.strictObject({
  task: z.enum(["create", "edit", "series", "remix"]),
  category: z.enum(CATEGORY_IDS),
  reference_intent: z.enum(REFERENCE_INTENTS),
  aspect_ratio: z.strictObject({
    source: z.enum(["explicit", "platform", "inferred", "none"]),
    value: z.union([z.string(), z.null()]),
    /** For "inferred": the user's words that justify a format. Validated in code. */
    evidence: z.union([z.string(), z.null()]),
  }),
  exact_text: z.array(z.strictObject({ role: z.string(), text: z.string() })),
  requested_changes: z.array(z.string()),
  must_preserve: z.array(z.string()),
  transparent_background: z.boolean(),
  creative_freedom: z.enum(["low", "medium", "high"]),
  series: z.strictObject({
    enabled: z.boolean(),
    continuation: z.boolean(),
    count: z.union([z.number(), z.null()]),
    unit: z.union([z.enum(["panel", "page", "slide", "asset"]), z.null()]),
    consistency_requirements: z.array(z.string()),
  }),
  factual_requirements: z.strictObject({
    user_supplied_facts: z.array(z.string()),
    missing_facts: z.array(z.string()),
    placeholders_required: z.boolean(),
  }),
  ambiguity: z.strictObject({
    blocking: z.boolean(),
    reason: z.union([z.string(), z.null()]),
  }),
});
export type Intent = z.infer<typeof IntentSchema>;

export const INTENT_CONTRACT = {
  pipeline: "builder" as const,
  name: "depikt_intent_v3",
  zod: IntentSchema as z.ZodType<Intent>,
  jsonSchema: toStrictJsonSchema(IntentSchema),
};

// ---------- analyzer instructions ----------

const categoryLines = CATEGORY_IDS.map((id) => `- ${id}: ${CATEGORY_DEFINITIONS[id]}`).join("\n");
const referenceLines = REFERENCE_INTENTS.map((id) => `- ${id}: ${REFERENCE_DEFINITIONS[id]}`).join(
  "\n",
);

export const INTENT_INSTRUCTIONS = `You analyze a user's request for an AI image and return a compact JSON intent object. You do not write the image prompt. Be literal about what the user asked for; do not embellish.

task: "edit" when an existing/attached image must be modified ("in this photo", "in my image", "this poster", "change/remove/replace/recolor the …", "keep everything else"); edits are category image_edit regardless of what the image depicts (a poster being edited is image_edit, not poster), except a redesign of an app or web screenshot, which is category ui with reference_intent edit_source or sketch_layout. "series" when the user wants several coordinated outputs (panels, pages, slides, matching assets); "remix" when a REMIX REFERENCE prompt is supplied; otherwise "create".

category (choose the single best fit):
${categoryLines}
Notes: "cinematic lighting" on a product shot is still product. A poster with a cinematic photo is still poster. Emotion-as-subject or abstract requests are creative, not cinematic. Slides and presentation visuals are infographic unless they are a UI.

reference_intent (only when an image is attached; otherwise "none"):
${referenceLines}
Infer from wording: "keep this exact person / same character" → subject_identity; "edit / change / remove / replace in this image" → edit_source; "same product, new background" → product_object; "use this layout / arrangement" → composition; a sketch, wireframe, or diagram used as a plan → sketch_layout; "in this style / like this look" → style. If an image is attached and the wording gives no clue, use "style".

aspect_ratio: source "explicit" only when the user wrote a literal ratio; "platform" when a platform format implies one (YouTube thumbnail 16:9, Instagram Story/Reel 9:16, Pinterest pin 2:3); "inferred" only when the user asked for a canvas orientation or a deliverable whose format is fixed ("make it a vertical poster", "phone wallpaper", "widescreen still"); otherwise "none" with value null. For "inferred", set evidence to the exact words from the request that describe the canvas or format (for example "vertical poster", "phone wallpaper"); for other sources evidence is null. Never infer a ratio from words that merely describe the subject: "portrait of a woman" is a genre, "a story about loneliness" is a narrative, "vertical garden" is a plant wall, "Times Square" is a place; in those cases use "none".

exact_text: every string the user wants rendered verbatim (quoted headlines, sublines, labels, names). role describes its job (headline, subline, label, caption, button). Preserve spelling, casing, punctuation, and scripts exactly.

requested_changes / must_preserve: for edits and product/identity work, list the concrete changes asked for and what the user said (or clearly implied) must stay. Otherwise empty arrays.

transparent_background: true for stickers, cutouts, isolated assets, logos on transparent background, sprites, or when the user asks for transparency.

creative_freedom: low when the user specified most details or the output must match a reference; high for open, exploratory, or mood-driven requests; medium otherwise.

series: enabled when multiple coordinated outputs are requested. count is the exact number requested or null. unit: panel (single image with panels), page (separate images), slide, or asset (matching posts/creatives). continuation is true when the user is extending an existing series ("slide two", "next panel", "same design as the first"). consistency_requirements lists what must stay identical across units.

factual_requirements: user_supplied_facts are concrete facts the user gave (dates, prices, numbers, names). missing_facts are facts the deliverable needs but the user did not supply: an event date, time, venue, or price for a poster or flyer; the values, numbers, percentages, or rankings for any data-driven graphic (comparison, chart, statistics, "how much faster"); a promo code; anything the user marked "TBA", "TBD", "to be announced", or "to be filled in later". placeholders_required is true whenever missing_facts is non-empty and the deliverable would normally show those facts.

ambiguity: blocking only when the request cannot be acted on at all. Reasonable defaults are not ambiguity.

Explicit user choices supplied in the message (a selected reference intent, a category hint) are authoritative: reflect them exactly.`;

// ---------- input helpers ----------

export interface IntentInput {
  userInput: string;
  hasImage: boolean;
  /** Explicit UI selection. "auto" or undefined lets the analyzer decide. */
  referenceIntentOverride?: ReferenceIntent | "auto" | null;
  /** Explicit category (legacy label or id). Null/"auto" = analyzer decides. */
  categoryOverride?: CategoryId | null;
  remixRef?: string | null;
}

export function buildIntentUserMessage(input: IntentInput): string {
  const parts: string[] = [];
  if (input.hasImage) {
    const sel =
      input.referenceIntentOverride && input.referenceIntentOverride !== "auto"
        ? input.referenceIntentOverride
        : null;
    parts.push(
      sel
        ? `A reference image is attached. The user explicitly selected reference intent: ${sel}. This is authoritative.`
        : `A reference image is attached. Infer reference_intent from the request and the image.`,
    );
  } else {
    parts.push('No reference image is attached (reference_intent must be "none").');
  }
  if (input.categoryOverride)
    parts.push(
      `The user explicitly selected category: ${input.categoryOverride}. This is authoritative.`,
    );
  if (input.remixRef)
    parts.push(
      `REMIX REFERENCE (an existing prompt the user chose to remix; task is "remix"):\n${input.remixRef}`,
    );
  parts.push(`REQUEST:\n${input.userInput.trim()}`);
  return parts.join("\n\n");
}

// ---------- overrides ----------

export interface OverrideNotes {
  applied: string[];
}

/**
 * Apply deterministic overrides on top of the analyzer's output.
 * Priority: explicit UI reference intent > literal ratio > explicit category > analyzer.
 */
export function applyIntentOverrides(
  intent: Intent,
  input: IntentInput,
): { intent: Intent; notes: OverrideNotes } {
  const out: Intent = structuredClone(intent);
  const applied: string[] = [];

  // 1. Reference intent: explicit selection wins; no image forces none; image with none → style.
  if (!input.hasImage) {
    if (out.reference_intent !== "none")
      applied.push(`reference_intent ${out.reference_intent} → none (no image attached)`);
    out.reference_intent = "none";
  } else if (input.referenceIntentOverride && input.referenceIntentOverride !== "auto") {
    if (out.reference_intent !== input.referenceIntentOverride)
      applied.push(
        `reference_intent ${out.reference_intent} → ${input.referenceIntentOverride} (explicit selection)`,
      );
    out.reference_intent = input.referenceIntentOverride;
  } else if (out.reference_intent === "none") {
    applied.push("reference_intent none → style (image attached, no clearer signal)");
    out.reference_intent = "style";
  }

  // 2. Literal ratio typed by the user always wins. Inferred ratios must cite
  //    format/orientation evidence that actually appears in the request.
  const explicit = parseExplicitRatio(input.userInput);
  if (explicit) {
    if (out.aspect_ratio.value !== explicit.value || out.aspect_ratio.source !== explicit.source) {
      applied.push(`aspect_ratio → ${explicit.value} (${explicit.source}: "${explicit.matched}")`);
    }
    out.aspect_ratio = { source: explicit.source, value: explicit.value, evidence: null };
  } else {
    const norm = normalizeRatio(out.aspect_ratio.value);
    if (out.aspect_ratio.source === "none" || !norm) {
      out.aspect_ratio = { source: "none", value: null, evidence: null };
    } else if (
      out.aspect_ratio.source === "inferred" &&
      !hasFormatEvidence(input.userInput, out.aspect_ratio.evidence)
    ) {
      applied.push(
        `aspect_ratio ${norm} (inferred) → none (no format evidence: ${JSON.stringify(out.aspect_ratio.evidence)})`,
      );
      out.aspect_ratio = { source: "none", value: null, evidence: null };
    } else {
      out.aspect_ratio = {
        source: out.aspect_ratio.source,
        value: norm,
        evidence: out.aspect_ratio.evidence ?? null,
      };
    }
  }

  // 3. Explicit category hint.
  if (input.categoryOverride && out.category !== input.categoryOverride) {
    applied.push(`category ${out.category} → ${input.categoryOverride} (explicit hint)`);
    out.category = input.categoryOverride;
  }

  // 4. Consistency fixes that need no judgment.
  if (out.reference_intent === "edit_source" && out.task === "create") {
    applied.push("task create → edit (edit_source reference)");
    out.task = "edit";
  }
  if (input.remixRef && out.task !== "remix") {
    applied.push(`task ${out.task} → remix (remix reference supplied)`);
    out.task = "remix";
  }
  if (out.series.count !== null && out.series.count > 0 && !out.series.enabled) {
    applied.push("series.enabled false → true (count given)");
    out.series.enabled = true;
  }
  if (out.series.enabled && out.task === "create") out.task = "series";
  if (out.category === "image_edit" && out.task === "create") out.task = "edit";
  // An edit of an existing image is the image_edit category (the edit
  // playbook), whatever the image depicts. UI redesigns of a screenshot stay
  // "ui": that playbook carries its own preserve-every-feature guidance.
  if (
    out.task === "edit" &&
    out.category !== "image_edit" &&
    out.category !== "ui" &&
    !input.categoryOverride
  ) {
    applied.push(`category ${out.category} → image_edit (task is edit)`);
    out.category = "image_edit";
  }

  // 5. Factual placeholders: deterministic signals the analyzer may miss.
  for (const f of detectDeferredFacts(input.userInput)) {
    if (!out.factual_requirements.missing_facts.some((m) => m.toLowerCase().includes(f))) {
      out.factual_requirements.missing_facts.push(f);
      applied.push(`missing_facts += ${f} (deferred in request)`);
    }
  }
  if (
    out.factual_requirements.missing_facts.length > 0 &&
    !out.factual_requirements.placeholders_required
  ) {
    applied.push("placeholders_required false → true (missing facts listed)");
    out.factual_requirements.placeholders_required = true;
  }

  return { intent: out, notes: { applied } };
}

const ORIENTATION =
  "(vertical|horizontal|portrait|landscape|tall|wide|widescreen|square|upright|panoramic)";
const CANVAS =
  "(poster|format|orientation|canvas|frame|crop|layout|composition|image|photo|picture|shot|still|banner|video|wallpaper|card|version|design|aspect|ratio|slide|thumbnail|cover|screen|story|reel|pin|flyer)";
const FORMAT_PATTERNS: RegExp[] = [
  new RegExp(`\\b${ORIENTATION}\\s+${CANVAS}\\b`),
  new RegExp(
    `\\b(make|keep|render|shoot|crop|frame|turn|do)\\s+(it|this|the\\s+\\w+)\\s+${ORIENTATION}\\b`,
  ),
  /\b(phone|mobile|desktop|iphone|android)\s+(wallpaper|screen|lock ?screen|home ?screen)\b/,
  /\b(cinema|film|movie)\s+(still|frame)\b/,
  /\b(widescreen|ultrawide|panorama|panoramic)\b/,
];

/**
 * True when an inferred ratio is backed by words about the canvas, format,
 * or orientation that actually occur in the request, not by a subject phrase.
 * "make this a vertical poster" qualifies; "vertical garden" does not.
 */
export function hasFormatEvidence(userInput: string, evidence: string | null | undefined): boolean {
  const ev = (evidence ?? "").toLowerCase().trim();
  if (!ev || !userInput.toLowerCase().includes(ev)) return false;
  return FORMAT_PATTERNS.some((re) => re.test(ev));
}

/** Facts the user explicitly deferred ("date TBA", "code to be filled in later"). */
export function detectDeferredFacts(userInput: string): string[] {
  const out: string[] = [];
  const facts =
    "(date|time|venue|location|price|promo code|discount code|code|end date|deadline|speaker|lineup|address)";
  const deferred =
    "(tba|tbd|to be announced|to be confirmed|to be decided|to be filled in|to be filled in later|pending)";
  const re1 = new RegExp(`\\b${facts}s?\\b[^.;]{0,50}?\\b${deferred}\\b`, "gi");
  for (const m of userInput.matchAll(re1)) {
    // "promo code and end date to be filled in later" defers both facts.
    const span = m[0].toLowerCase();
    const factRe = new RegExp(`\\b${facts}s?\\b`, "gi");
    for (const f of span.matchAll(factRe)) out.push(f[1].toLowerCase());
  }
  const re2 = new RegExp(`\\b${deferred}\\b[^.;]{0,40}?\\b${facts}s?\\b`, "gi");
  for (const m of userInput.matchAll(re2)) out.push(m[2].toLowerCase());
  return [...new Set(out)];
}
