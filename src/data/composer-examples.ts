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
    label: "Kyoto travel poster",
    hint: "Exact title, risograph print",
    text: 'Vintage risograph travel poster of Kyoto at dusk: Yasaka Pagoda rising above a narrow stone lane, paper lanterns glowing, two layered inks (vermilion and deep indigo) with visible grain and slight misregistration. Exact title "KYOTO" in tall condensed letters across the top, small line "SPRING 2027" beneath it. Portrait 2:3, wide cream margins, no other text.',
  },
  {
    label: "Editorial portrait",
    hint: "Magazine cover light",
    text: "Half-length editorial portrait of a woman in her 40s with silver-streaked hair, charcoal wool coat, seated by a rain-streaked café window. Soft cool daylight from the left, warm tungsten fill from inside, 85mm look, shallow depth of field, natural skin texture with pores, muted teal and amber palette, quiet confident expression. Portrait 4:5, space above her head for a masthead.",
  },
  {
    label: "Product hero",
    hint: "Launch-ready studio shot",
    text: "Studio product hero of a matte sage-green ceramic pour-over coffee set on a slab of travertine: dripper, glass carafe with coffee mid-pour, a few scattered beans. Single hard key light from upper right casting one crisp shadow, soft bounce fill, droplets on the glass, true-to-life colours, catalogue sharpness. Landscape 3:2, empty space on the left for a headline.",
  },
  {
    label: "Infographic",
    hint: "Labeled steps, exact text",
    text: 'Clean editorial infographic titled exactly "HOW COFFEE IS MADE", four numbered steps left to right: "1 HARVEST", "2 DRY", "3 ROAST", "4 BREW", each with a simple flat illustration (cherry branch, drying beds, drum roaster, pour-over). Off-white background, ink-black type, one accent colour (burnt orange), thin connecting arrows, generous spacing, every word spelled exactly as written, no extra text. Landscape 16:9.',
  },
  {
    label: "Interior scene",
    hint: "Architectural morning light",
    text: "Architectural photograph of a Japandi living room: low oak shelving with a few ceramics, oatmeal linen sofa, one sculptural walnut lounge chair, wool rug, floor-to-ceiling window onto a misty garden. Low raking morning sun throwing long soft shadows, natural textures, calm neutral palette, straight verticals, 24mm wide composition at seated eye level. Landscape 3:2.",
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
