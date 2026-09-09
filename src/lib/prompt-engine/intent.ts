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

task: "edit" when an existing/attached image must be modified; "series" when the user wants several coordinated outputs (panels, pages, slides, matching assets); "remix" when a REMIX REFERENCE prompt is supplied; otherwise "create".

category (choose the single best fit):
${categoryLines}
Notes: "cinematic lighting" on a product shot is still product. A poster with a cinematic photo is still poster. Emotion-as-subject or abstract requests are creative, not cinematic. Slides and presentation visuals are infographic unless they are a UI.

reference_intent (only when an image is attached; otherwise "none"):
${referenceLines}
Infer from wording: "keep this exact person / same character" → subject_identity; "edit / change / remove / replace in this image" → edit_source; "same product, new background" → product_object; "use this layout / arrangement" → composition; a sketch, wireframe, or diagram used as a plan → sketch_layout; "in this style / like this look" → style. If an image is attached and the wording gives no clue, use "style".

aspect_ratio: source "explicit" only when the user wrote a literal ratio; "platform" when a platform format implies one (YouTube thumbnail 16:9, Instagram Story/Reel 9:16, Pinterest pin 2:3); "inferred" only when the format is strongly implied by the deliverable (a phone wallpaper is tall; a cinema still is wide); otherwise "none" with value null. Never infer a ratio from words that merely appear in the subject: "portrait of a woman" is a genre, "a story about loneliness" is a narrative, "vertical garden" is a plant wall, "Times Square" is a place.

exact_text: every string the user wants rendered verbatim (quoted headlines, sublines, labels, names). role describes its job (headline, subline, label, caption, button). Preserve spelling, casing, punctuation, and scripts exactly.

requested_changes / must_preserve: for edits and product/identity work, list the concrete changes asked for and what the user said (or clearly implied) must stay. Otherwise empty arrays.

transparent_background: true for stickers, cutouts, isolated assets, logos on transparent background, sprites, or when the user asks for transparency.

creative_freedom: low when the user specified most details or the output must match a reference; high for open, exploratory, or mood-driven requests; medium otherwise.

series: enabled when multiple coordinated outputs are requested. count is the exact number requested or null. unit: panel (single image with panels), page (separate images), slide, or asset (matching posts/creatives). continuation is true when the user is extending an existing series ("slide two", "next panel", "same design as the first"). consistency_requirements lists what must stay identical across units.

factual_requirements: user_supplied_facts are concrete facts the user gave (dates, prices, numbers, names). missing_facts are facts the deliverable needs but the user did not supply (a date for an event poster, statistics for a data infographic). placeholders_required is true when any missing fact must appear in the image.

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

  // 2. Literal ratio typed by the user always wins.
  const explicit = parseExplicitRatio(input.userInput);
  if (explicit) {
    if (out.aspect_ratio.value !== explicit.value || out.aspect_ratio.source !== explicit.source) {
      applied.push(`aspect_ratio → ${explicit.value} (${explicit.source}: "${explicit.matched}")`);
    }
    out.aspect_ratio = { source: explicit.source, value: explicit.value };
  } else {
    const norm = normalizeRatio(out.aspect_ratio.value);
    if (out.aspect_ratio.source === "none" || !norm)
      out.aspect_ratio = { source: "none", value: null };
    else out.aspect_ratio = { source: out.aspect_ratio.source, value: norm };
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

  return { intent: out, notes: { applied } };
}
