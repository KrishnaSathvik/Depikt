// Visible product terminology, positioning, and SEO copy for Depikt V1
// (Phase 3 of the ChatGPT Images 2.5 migration).
//
// Routes, database kind values, API mode constants, and history keys keep
// their historical names ("/generate", "/critique", kind "generate",
// mode "CRITIQUE"). Only what the user reads changes; it all comes from here
// so the UI and the regression tests agree.
//
// Depikt V1 does not generate images: it is a reference library and prompt
// workspace for ChatGPT Images. Never describe it as an image generator.

import type { TargetModel } from "./target-model";

import type { CategoryId } from "./prompt-engine/categories.ts";
import type { ReferenceIntent } from "./prompt-engine/reference.ts";

export const TARGET_MODEL_NAME = "ChatGPT Images 2.5";
export const LEGACY_MODEL_NAME = "GPT Image 2";

/** Legacy GPT Image 2 rows (500) plus the approved ChatGPT Images 2.5 rows. */
export const LEGACY_LIBRARY_COUNT = 500;
export const IMAGES_25_LIBRARY_COUNT = 23;
export const LIBRARY_PROMPT_COUNT = LEGACY_LIBRARY_COUNT + IMAGES_25_LIBRARY_COUNT;

/** Visible tool names. */
export const TOOL = {
  library: "Library",
  builder: "Prompt Builder",
  critic: "Prompt Critic",
  gallery: "Gallery",
  blog: "Blog",
} as const;

/** Visible calls to action. */
export const CTA = {
  build: "Build Prompt",
  buildHero: "Build a Prompt",
  building: "Building prompt…",
  newPrompt: "New Prompt",
  critique: "Critique Prompt",
  critiquing: "Critiquing…",
  critiqueAnother: "Critique Another Prompt",
  browse: `Browse ${LIBRARY_PROMPT_COUNT} Prompts`,
  browseShort: "Browse Prompts",
  remix: "Remix in Prompt Builder",
  openImago: "Open in Imago",
} as const;

/** Route URLs are frozen for compatibility and SEO. */
export const ROUTES = {
  library: "/library",
  builder: "/generate",
  critic: "/critique",
  gallery: "/gallery",
  blog: "/blog",
} as const;

export const NAV_ITEMS: ReadonlyArray<{
  to: (typeof ROUTES)[keyof typeof ROUTES];
  label: string;
  exact?: boolean;
}> = [
  { to: ROUTES.library, label: TOOL.library, exact: true },
  { to: ROUTES.builder, label: TOOL.builder },
  { to: ROUTES.critic, label: TOOL.critic },
  { to: ROUTES.gallery, label: TOOL.gallery },
  { to: ROUTES.blog, label: TOOL.blog },
];

export const IMAGO_URL = "https://chatgpt.com/g/g-69e7de729cb48191a6aa83ec3af8a6cb-imago";

// ---------- announcement (site-wide strip above the hero) ----------

/**
 * One announcement at a time. Flip `active` to false (or let `until` pass)
 * to retire it; change `id` when a new announcement replaces it.
 */
export interface Announcement {
  /** Change the id for a new announcement; dismissal state keyed on it historically. */
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  /** Small metadata line under the body; the count lives here, not in the headline. */
  meta?: string;
  primary: { label: string; collection: TargetModel };
  secondary: { label: string; slug: string };
  /** Real result images from public/library/images-2-5/, curated, not the whole set. */
  images: ReadonlyArray<{ slug: string; alt: string; span: "tall" | "wide" }>;
  active: boolean;
  /** ISO date (YYYY-MM-DD) after which the module retires itself. */
  until?: string;
}

export const ANNOUNCEMENT: Announcement = {
  id: "images-2-5-collection-live",
  eyebrow: "New in Depikt",
  title: `See what works with ${TARGET_MODEL_NAME}.`,
  body: "Posters, edits, reference workflows, structured visuals, and more — generated, reviewed, and added to Depikt.",
  meta: `${IMAGES_25_LIBRARY_COUNT} new tested recipes`,
  primary: { label: "Explore Images 2.5", collection: "gpt-image-2.5" },
  secondary: { label: "Read what's new", slug: "chatgpt-images-2-5-whats-new" },
  images: [
    {
      slug: "showa-travel-poster-exact-title",
      alt: "Kyoto railway poster with exact title text",
      span: "tall",
    },
    { slug: "national-park-stamp-sheet", alt: "Sheet of eight national park stamps", span: "tall" },
    {
      slug: "80s-portrait-identity-lock",
      alt: "1980s studio portrait with the same face",
      span: "tall",
    },
    {
      slug: "mosaic-earth-and-stars",
      alt: "Tile mosaic of Earth under a starry sky",
      span: "wide",
    },
    {
      slug: "ticket-localization-edit",
      alt: "Vintage travel ticket localized from Tokyo to Lisbon",
      span: "wide",
    },
  ],
  active: true,
  until: "2026-10-31",
};

export function isAnnouncementLive(a: Announcement, now: Date = new Date()): boolean {
  if (!a.active) return false;
  if (a.until && now.getTime() > new Date(`${a.until}T23:59:59Z`).getTime()) return false;
  return true;
}

// ---------- positioning ----------

export const POSITIONING = {
  eyebrow: `Built for ${TARGET_MODEL_NAME}`,
  headline: "Turn rough ideas into image-ready prompts.",
  tagline: "Learn what works. Build what you want.",
  body: `Browse ${LEGACY_MODEL_NAME} prompt examples, build a prompt from your idea or reference image, and critique existing prompts for ${TARGET_MODEL_NAME}. Then open the result in ChatGPT to make the image.`,
  concept: "A reference library and prompt workspace for ChatGPT Images.",
} as const;

// ---------- SEO / metadata for current product pages ----------

export interface PageMeta {
  title: string;
  description: string;
}

export const SEO: Record<"root" | "home" | "builder" | "critic" | "library" | "gallery", PageMeta> =
  {
    root: {
      title: `Depikt — Prompt Builder & Library for ${TARGET_MODEL_NAME}`,
      description: `Turn rough ideas and reference images into image-ready prompts for ${TARGET_MODEL_NAME}. Browse ${LIBRARY_PROMPT_COUNT} curated prompts for ${LEGACY_MODEL_NAME} and ${TARGET_MODEL_NAME}, build your own, and critique existing prompts. Free, no login.`,
    },
    home: {
      title: `Depikt — Prompt Builder & Library for ${TARGET_MODEL_NAME}`,
      description: `Learn what works, build what you want. Browse ${LIBRARY_PROMPT_COUNT} curated prompt examples for ${LEGACY_MODEL_NAME} and ${TARGET_MODEL_NAME}, build ${TARGET_MODEL_NAME}-ready prompts from an idea or reference image, and critique prompts before you use them. Free, no login.`,
    },
    builder: {
      title: `${TARGET_MODEL_NAME} Prompt Builder | Depikt`,
      description: `Describe what you want, or attach a reference image, and get a precise ${TARGET_MODEL_NAME} prompt with the intent, ratio, text, and reference handling spelled out. Free, no login.`,
    },
    critic: {
      title: `${TARGET_MODEL_NAME} Prompt Critic | Depikt`,
      description: `Paste an image prompt and find what is weakening it: contradictions, missing edit protection, unclear reference use, and prompt bloat. Get a score, a breakdown, and a rewritten prompt for ${TARGET_MODEL_NAME}.`,
    },
    library: {
      title: `Prompt Library — ${LIBRARY_PROMPT_COUNT} Curated ${LEGACY_MODEL_NAME} and ${TARGET_MODEL_NAME} Prompts | Depikt`,
      description: `Browse ${LIBRARY_PROMPT_COUNT} curated AI image prompts: the ${LEGACY_LIBRARY_COUNT}-prompt ${LEGACY_MODEL_NAME} collection plus ${IMAGES_25_LIBRARY_COUNT} ${TARGET_MODEL_NAME} recipes generated and reviewed on the current model. Posters, infographics, UI mockups, precise edits, and more. Study them, copy them, or remix them in the Prompt Builder.`,
    },
    gallery: {
      title: "Reference Gallery | Depikt",
      description: `Browse reference images and send any of them to the Prompt Builder as a style, subject, or composition reference for ${TARGET_MODEL_NAME}.`,
    },
  };

/** Search-facing names for structured data. */
export const JSONLD_NAMES = {
  site: "Depikt",
  builder: "Depikt Prompt Builder",
  critic: "Depikt Prompt Critic",
  library: "Depikt Prompt Library",
  gallery: "Depikt Reference Gallery",
} as const;

export const JSONLD_DESCRIPTIONS = {
  app: `Prompt builder, prompt critic, and curated prompt library for ${TARGET_MODEL_NAME}. Turns rough ideas and reference images into image-ready prompts; does not generate images.`,
  builder: `Prompt builder for ${TARGET_MODEL_NAME}: turns a rough idea or reference image into a precise, image-ready prompt.`,
  critic: `Prompt critic for ${TARGET_MODEL_NAME}: scores an image prompt across intent, clarity, reference and edit handling, text and layout, style, and efficiency, and returns a rewritten prompt.`,
  library: `A curated collection of ${LIBRARY_PROMPT_COUNT} prompts across 10 categories: ${LEGACY_LIBRARY_COUNT} ${LEGACY_MODEL_NAME} examples and ${IMAGES_25_LIBRARY_COUNT} ${TARGET_MODEL_NAME} recipes with reviewed results.`,
  gallery:
    "A gallery of reference images you can send to the Prompt Builder as a style, subject, or composition reference.",
} as const;

// ---------- library collection copy ----------

export const LIBRARY_COPY = {
  headline: `${LIBRARY_PROMPT_COUNT} prompts to learn from, remix, and use.`,
  subline: "Posters, edits, references, infographics, UI concepts, and more.",
  collections: `${LEGACY_LIBRARY_COUNT} ${LEGACY_MODEL_NAME} · ${IMAGES_25_LIBRARY_COUNT} tested Images 2.5`,
  collectionBadge: `${LEGACY_MODEL_NAME} collection`,
} as const;

// ---------- Imago handoff ----------

/**
 * Depikt copies the prompt and opens Imago, but cannot move the user's
 * reference image into that separate ChatGPT session. Show the re-attach
 * note only when the prompt depends on a reference AND an image exists.
 */
export function needsReferenceReattach(
  referenceIntent: unknown,
  hasReferenceImage: boolean,
): boolean {
  if (!hasReferenceImage) return false;
  if (typeof referenceIntent !== "string") return false;
  return referenceIntent !== "none" && referenceIntent !== "";
}

export const REFERENCE_REATTACH_NOTE =
  "Reference required: attach the same image in Imago along with this prompt. It does not transfer automatically.";

// ---------- intent-stage feedback ----------

const CATEGORY_HUMAN: Record<CategoryId, string> = {
  cinematic: "Cinematic scene",
  poster: "Poster",
  infographic: "Infographic",
  ui: "UI mockup",
  social: "Social post",
  storyboard: "Storyboard",
  product: "Product / interior",
  visual_summary: "Visual summary",
  image_edit: "Image edit",
  creative: "Creative",
};

const REFERENCE_HUMAN: Record<Exclude<ReferenceIntent, "none">, string> = {
  style: "Style reference",
  subject_identity: "Subject reference",
  edit_source: "Edit source",
  product_object: "Product reference",
  composition: "Composition reference",
  sketch_layout: "Sketch layout",
};

export const INTENT_STAGE_LABELS = {
  understanding: "Understanding your request…",
  understood: "Understood:",
  building: "Building your prompt…",
} as const;

/**
 * Turn the analyzer's intent object into a few short, true facts for the
 * waiting state ("Poster · Style reference · 4:5 · 3 panels"). Uses only
 * fields that are present; never fabricates progress.
 */
export function describeIntent(intent: Record<string, unknown> | null | undefined): string[] {
  if (!intent) return [];
  const parts: string[] = [];
  const cat = intent.category;
  if (typeof cat === "string" && cat in CATEGORY_HUMAN)
    parts.push(CATEGORY_HUMAN[cat as CategoryId]);
  const ref = intent.reference_intent;
  if (typeof ref === "string" && ref !== "none" && ref in REFERENCE_HUMAN)
    parts.push(REFERENCE_HUMAN[ref as keyof typeof REFERENCE_HUMAN]);
  const ar = intent.aspect_ratio as { value?: unknown } | undefined;
  if (ar && typeof ar.value === "string" && ar.value) parts.push(ar.value);
  const series = intent.series as
    | { enabled?: unknown; count?: unknown; unit?: unknown }
    | undefined;
  if (series && series.enabled === true && typeof series.count === "number" && series.count > 0) {
    const unit = typeof series.unit === "string" ? series.unit : "image";
    parts.push(`${series.count} ${unit}${series.count === 1 ? "" : "s"}`);
  }
  const text = intent.exact_text;
  if (Array.isArray(text) && text.length > 0) parts.push("Exact text");
  if (intent.transparent_background === true) parts.push("Transparent");
  return parts.slice(0, 5);
}

// ---------- history (visible labels only; stored kind values unchanged) ----------

export function historyKindLabel(kind: string): string {
  return kind === "critique" ? "CRITIC" : "BUILDER";
}
