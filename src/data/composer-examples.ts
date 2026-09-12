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
    label: "Product hero",
    hint: "Studio pack shot on concrete",
    text: "Matte black wireless earbuds on a pale concrete slab, soft overhead light, one hard shadow to the right, square crop, clean studio product photo, no props other than a faint cable curl",
  },
  {
    label: "Rainy portrait",
    hint: "Editorial window light",
    text: "Half-length portrait of a woman in a charcoal wool coat beside a rainy window, cool daylight, shallow depth of field, soft condensation on the glass, editorial magazine look, muted palette",
  },
  {
    label: "Travel poster",
    hint: "Lisbon tram, flat vector",
    text: "Flat vector travel poster for Lisbon: yellow tram climbing a tiled hillside, warm ochre and teal, bold title LISBON at the top in a condensed sans, spare layout with generous margins, no photo realism",
  },
  {
    label: "Food flatlay",
    hint: "Ramen, overhead, linen",
    text: "Overhead flatlay of handmade ramen in a dark ceramic bowl: steaming broth, soft-boiled egg, scallions, chopsticks resting on linen, soft window light from the left, food photography, slight steam haze",
  },
  {
    label: "App screen",
    hint: "Calm meditation UI",
    text: "iPhone 15 Pro screen showing a meditation app home: soft sage-to-cream gradient, large Start Session button, tiny streak counter, minimal chrome, realistic device frame on a pale desk surface",
  },
  {
    label: "Tokyo night",
    hint: "Neon in wet asphalt",
    text: "Empty Tokyo side street at blue hour, wet asphalt reflecting neon signs, lone figure under a clear umbrella mid-stride, cinematic still, anamorphic feel, deep blues and magenta accents",
  },
] as const;

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
