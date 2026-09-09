// Reference-image intent vocabulary, image-detail routing, and the guidance
// block the Prompt Writer receives for each intent.

import type { ImageDetail } from "../openai/client.ts";

export const REFERENCE_INTENTS = [
  "none",
  "style",
  "subject_identity",
  "edit_source",
  "product_object",
  "composition",
  "sketch_layout",
] as const;
export type ReferenceIntent = (typeof REFERENCE_INTENTS)[number];

/** Values the UI selector may send. "auto" means "let the analyzer decide". */
export const REFERENCE_INTENT_OPTIONS: Array<{ value: ReferenceIntent | "auto"; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "style", label: "Style" },
  { value: "subject_identity", label: "Subject / identity" },
  { value: "edit_source", label: "Edit source" },
  { value: "product_object", label: "Product / object" },
  { value: "composition", label: "Composition" },
  { value: "sketch_layout", label: "Sketch / layout" },
];

export function isReferenceIntent(v: unknown): v is ReferenceIntent {
  return typeof v === "string" && (REFERENCE_INTENTS as readonly string[]).includes(v);
}

/**
 * Image detail sent to the model for the Prompt Writer. Fidelity-critical
 * intents get `high`; style-only extraction works from a coarse view.
 * Verified against the Responses `input_image.detail` values (low/high/auto/original).
 */
export function detailForIntent(intent: ReferenceIntent): ImageDetail {
  switch (intent) {
    case "subject_identity":
    case "edit_source":
    case "product_object":
    case "composition":
    case "sketch_layout":
      return "high";
    case "style":
    case "none":
    default:
      return "low";
  }
}

/** Client-side hint: intents where lossless (PNG) processing avoids harmful artifacts. */
export function prefersLossless(intent: ReferenceIntent | "auto"): boolean {
  return intent === "sketch_layout" || intent === "composition" || intent === "edit_source";
}

export const REFERENCE_DEFINITIONS: Record<ReferenceIntent, string> = {
  none: "no reference image is relevant",
  style:
    "borrow the look only: palette, lighting, medium, texture, composition language, mood. The subject changes.",
  subject_identity:
    "keep the same recognizable person/character/animal: face, hair, proportions, distinctive features. The request says what may change.",
  edit_source:
    "the image is the current authoritative state; modify only what is requested and preserve everything else.",
  product_object:
    "keep the same product/object: shape, proportions, design, materials, existing markings. Environment or presentation may change.",
  composition:
    "reuse the spatial arrangement, framing, proportions, and hierarchy. Style and subject may change.",
  sketch_layout:
    "the image is a rough sketch/wireframe/diagram; preserve hierarchy, positions, relative sizes, reading order. Do not inherit the rough drawing quality.",
};

/**
 * Writer guidance per intent. Only the active block is sent.
 *
 * Downstream flow: the user pastes the prompt into ChatGPT/Imago and attaches
 * the same reference image there. So every reference-dependent prompt must
 * (1) address the attached image explicitly and say how it is to be used, and
 * (2) still describe the relevant visual facts so the instruction is checkable.
 */
export function referenceGuidance(intent: ReferenceIntent): string {
  switch (intent) {
    case "style":
      return `REFERENCE IMAGE = STYLE ONLY.
Open the prompt with an explicit instruction such as: "Use the attached reference image as the style reference only: match its palette, lighting character, texture, and visual treatment, but do not copy its subject." Then describe, in words, the concrete style you are borrowing from what you see: palette (name the dominant and accent colors), light quality and direction, medium/finish, texture or grain, composition language, mood. Do not describe or reuse the reference's subject unless the user asks.`;
    case "subject_identity":
      return `REFERENCE IMAGE = SUBJECT / IDENTITY.
Open with an explicit instruction such as: "Use the attached reference image as the authoritative subject reference: keep this exact person/character recognizably the same." Then describe the identity-defining features you can see (face shape, hair color and style, skin tone, distinctive marks, glasses, build, and for characters/animals their signature features and colors) so the description and the image agree; state explicitly what the user wants changed (setting, outfit, pose, style) and that everything else about the subject stays. Do not invent features that are not visible.`;
    case "edit_source":
      return `REFERENCE IMAGE = EDIT SOURCE (current authoritative state).
Open with "Edit the attached image." Then write a bounded edit using the CHANGE ONLY / PRESERVE / MATCH structure. Name the exact region or element to change. In PRESERVE, enumerate what you can actually see that must stay: subject identity and pose, framing and crop, background elements, lighting direction, colors, any text or logos, image proportions. In MATCH, require the new content to match the original perspective, light direction, color temperature, shadows, grain, depth of field, and edge quality. Add no bonus edits.`;
    case "product_object":
      return `REFERENCE IMAGE = PRODUCT / OBJECT.
Open with an explicit instruction such as: "Use the attached reference image as the product reference: the product must stay exactly as shown." Then describe its identity from the image (form, proportions, colors, materials, finish, label/markings that exist, quoting label text exactly) and state that these must not change. Then describe the new presentation the user asked for (environment, surface, lighting, angle, props). Do not add markings, text, or features the product does not have; do not alter the label text.`;
    case "composition":
      return `REFERENCE IMAGE = COMPOSITION ONLY.
Open with an explicit instruction such as: "Use the attached reference image for its composition only: reuse its arrangement, framing, and proportions, not its colors, style, or subject." Then translate the arrangement into words: where the dominant mass sits, secondary elements, negative space, horizon/eyeline, framing, relative sizes, reading order, and apply that structure to the user's subject.`;
    case "sketch_layout":
      return `REFERENCE IMAGE = SKETCH / LAYOUT GUIDE.
Open with an explicit instruction such as: "Use the attached sketch as the layout guide: follow its regions, positions, relative sizes, and reading order exactly, rendered at production quality." Then describe every region and its position (top/left/right/bottom, relative widths and heights), the hierarchy, and what each labeled placeholder represents. Do not inherit the rough line quality, hand-drawn look, or placeholder wording unless the user asks for it. Where the sketch has placeholder text and the user supplied no copy, use short plausible example copy and say it is example copy; do not litter the prompt with bracketed placeholders for decorative copy. Reserve bracketed placeholders for facts the user must supply (dates, prices, names).`;
    case "none":
    default:
      return "";
  }
}
