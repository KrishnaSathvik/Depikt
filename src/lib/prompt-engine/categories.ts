// Category vocabulary for the Images 2.5 engine, plus mapping to the legacy
// display labels the UI, history, and public API already use.

export const CATEGORY_IDS = [
  "cinematic",
  "poster",
  "infographic",
  "ui",
  "social",
  "storyboard",
  "product",
  "visual_summary",
  "image_edit",
  "creative",
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

/** Legacy public labels (unchanged so the UI eyebrow and history keep working). */
export const CATEGORY_LABELS: Record<CategoryId, string> = {
  cinematic: "CINEMATIC SCENE",
  poster: "POSTER/COVER",
  infographic: "INFOGRAPHIC/DIAGRAM",
  ui: "UI MOCKUP",
  social: "SOCIAL POST",
  storyboard: "STORYBOARD/MULTI-PANEL",
  product: "INTERIOR/ARCH/FOOD/FASHION",
  visual_summary: "VISUAL SUMMARY",
  image_edit: "IMAGE EDIT",
  creative: "OPEN-ENDED CREATIVE",
};

const LABEL_TO_ID = new Map<string, CategoryId>(
  (Object.entries(CATEGORY_LABELS) as Array<[CategoryId, string]>).map(([id, label]) => [
    label,
    id,
  ]),
);

/** Accepts a legacy label ("POSTER/COVER") or an id ("poster"). Null for "auto"/unknown. */
export function toCategoryId(value: string | null | undefined): CategoryId | null {
  if (!value || value === "auto") return null;
  if ((CATEGORY_IDS as readonly string[]).includes(value)) return value as CategoryId;
  return LABEL_TO_ID.get(value) ?? null;
}

export function toCategoryLabel(id: CategoryId): string {
  return CATEGORY_LABELS[id];
}

/** One-line definitions shared by the analyzer and the critic. */
export const CATEGORY_DEFINITIONS: Record<CategoryId, string> = {
  cinematic: "a single scene, portrait, character, environment, or photographic/cinematic image",
  poster:
    "poster, cover, flyer, wallpaper, magazine/book/album cover, or other single-sheet design with a focal point and headline",
  infographic:
    "infographic, diagram, chart-led explainer, timeline, comparison, process flow, or presentation-style slide with structured sections",
  ui: "app screen, dashboard, website, landing page, wireframe, or other product interface",
  social: "social media graphic, carousel, ad creative, or platform post",
  storyboard: "comic, storyboard, multi-panel image, or multi-page/multi-slide sequence",
  product:
    "product, packaging, interior, architecture, food, or fashion imagery where the object/space is the subject",
  visual_summary: "visual summary of a document, report, dataset, or supplied information",
  image_edit:
    "modification of an attached or described existing image (change, remove, replace, recolor, restyle, background swap)",
  creative:
    "abstract, surreal, conceptual, illustration-led, or emotion-as-subject work with no photographic requirement",
};
