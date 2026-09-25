/**
 * Shared "try these" starters for the Prompt workspace composers.
 * Generate chips are ready-to-run image briefs; Build chips are rough ideas
 * the Builder should expand into a full prompt.
 */

export interface ComposerExample {
  /** Short card title shown in the UI. */
  label: string;
  /** One-line teaser under the title (not the full prompt). */
  hint: string;
  /** Text that fills the composer on click. */
  text: string;
}

/** Direct generation starters — specific enough to produce a strong first image. */
export const GENERATE_EXAMPLES: readonly ComposerExample[] = [
  {
    label: "Travel poster",
    hint: "Lisbon in ochre and teal",
    text: "Flat vector travel poster for Lisbon: a yellow tram climbing a tiled hillside, warm ochre and teal, bold title LISBON at the top, generous margins.",
  },
  {
    label: "Portrait",
    hint: "Editorial window light",
    text: "Half-length editorial portrait beside a rainy window, charcoal wool coat, cool daylight, shallow depth of field, muted palette.",
  },
  {
    label: "Product",
    hint: "A quiet studio photograph",
    text: "Matte black wireless earbuds on pale concrete, soft overhead light, one hard shadow to the right, clean square studio photograph.",
  },
  {
    label: "Exact-text poster",
    hint: "Type with a clear hierarchy",
    text: 'Minimal concert poster with the exact headline "NIGHT SESSIONS", subtitle "FRIDAY 8 PM", and venue "THE LOFT". Large black type on white, a single blue circle, clear reading order, no extra text.',
  },
  {
    label: "Interior",
    hint: "Natural light and texture",
    text: "A quiet living room with oak shelving, a linen sofa, one sculptural chair and a large window. Soft morning light, natural textures, architectural photography, wide composition.",
  },
];

/** Build-mode rough ideas — intentionally brief so the Builder has room to work. */
export const BUILD_EXAMPLES: readonly ComposerExample[] = [
  {
    label: "Meetup poster",
    hint: "SF data engineering event",
    text: "minimalist event poster for a data engineering meetup in SF next month — clean type, one strong visual, date and venue left as placeholders",
  },
  {
    label: "Coffee brand",
    hint: "Moodboard for Northline",
    text: "moodboard for a small coffee brand called Northline — warm, quiet, Scandinavian, packaging + shop corner + cup detail",
  },
  {
    label: "RAG explainer",
    hint: "3-step mono infographic",
    text: "simple 3-step infographic explaining how RAG works for a technical blog, mono palette, clear labels, no clutter",
  },
  {
    label: "Character sheet",
    hint: "Fox courier, cyberpunk",
    text: "character design sheet for a fox courier in a rainy cyberpunk city — front view, side view, and three gear callouts",
  },
  {
    label: "YouTube thumb",
    hint: "Rebuilding a 90s PC",
    text: "YouTube thumbnail for a video about rebuilding a 1990s PC — bold face reaction, glowing CRT, readable title space on the right",
  },
  {
    label: "Recipe card",
    hint: "Weeknight lemon pasta",
    text: "printable recipe card for weeknight lemon pasta — hero photo, ingredients list, and numbered steps in a clean layout",
  },
] as const;
