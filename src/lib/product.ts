// Visible product terminology, positioning, and SEO copy for Depikt V1
// (Phase 3 of the ChatGPT Images 2.5 migration).
//
// Routes, database kind values, API mode constants, and history keys keep
// their historical names ("/generate", "/critique", kind "generate",
// mode "CRITIQUE"). Only what the user reads changes; it all comes from here
// so the UI and the regression tests agree.
//
// Depikt is a reference library and prompt workspace for ChatGPT Images that
// also generates and edits images natively (behind the native-generation
// feature flag — see lib/generation/feature-flag.ts). Never describe it as
// a generic "AI image generator"; the differentiator is the connected
// workflow (prompts, references, structure, generation, editing), not
// generation alone.

import type { TargetModel } from "./target-model";

import type { CategoryId } from "./prompt-engine/categories.ts";
import type { ReferenceIntent } from "./prompt-engine/reference.ts";

export const TARGET_MODEL_NAME = "ChatGPT Images 2.5";
export const LEGACY_MODEL_NAME = "GPT Image 2";

/** Legacy GPT Image 2 rows (500) plus the approved ChatGPT Images 2.5 rows. */
export const LEGACY_LIBRARY_COUNT = 500;
export const IMAGES_25_LIBRARY_COUNT = 43;
export const LIBRARY_PROMPT_COUNT = LEGACY_LIBRARY_COUNT + IMAGES_25_LIBRARY_COUNT;

/**
 * Visible tool names. The public product model is:
 *   Prompt
 *   ├── Build mode
 *   └── Critique mode
 * "Prompt Builder" and "Prompt Critic" are no longer current product names;
 * they survive only in historical blog copy, internal APIs, and engine files.
 */
export const TOOL = {
  library: "Library",
  /** Unified workspace (navigation label). Build and Critique are its modes. */
  prompt: "Prompt",
  buildMode: "Prompt — Build mode",
  critiqueMode: "Prompt — Critique mode",
  /** Locked header label once native generation is live. Header inserts it after Prompt only when the native-generation feature flag is on (see lib/generation/feature-flag.ts). */
  generate: "Generate",
  gallery: "Gallery",
  templates: "Templates",
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
  remix: "Remix in Prompt",
  openImago: "Open in Imago",
  /** Behind the native-generation feature flag. */
  generateImage: "Generate image",
  generateRewrite: "Generate rewrite",
  improveInPrompt: "Improve in Prompt",
} as const;

/** Route URLs are frozen for compatibility and SEO. */
export const ROUTES = {
  library: "/library",
  /** Canonical unified workspace. /generate and /critique 301 here. */
  prompt: "/prompt",
  /**
   * The canonical Generate route once the native-generation feature flag is
   * on (see lib/generation/feature-flag.ts) — kept as "legacyBuilder" for
   * historical reasons (it 301-redirected to /prompt before Generate
   * shipped) and because it's already threaded through Library/Gallery/
   * Prompt as the "Generate" handoff target.
   */
  legacyBuilder: "/generate",
  /** Permanent redirect to /prompt?mode=critique. Never link to this. */
  legacyCritic: "/critique",
  gallery: "/gallery",
  blog: "/blog",
  templates: "/templates",
  // Commercial launch (Phase 6). Auth and account are noindex; the rest are public.
  signIn: "/sign-in",
  signUp: "/sign-up",
  account: "/account",
  pricing: "/pricing",
  help: "/help",
  privacy: "/privacy",
  terms: "/terms",
} as const;

export const NAV_ITEMS: ReadonlyArray<{
  to: (typeof ROUTES)[keyof typeof ROUTES];
  label: string;
  exact?: boolean;
}> = [
  { to: ROUTES.library, label: TOOL.library, exact: true },
  { to: ROUTES.prompt, label: TOOL.prompt },
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
  headline: "Better prompts. Better images.",
  tagline: "Learn what works. Build what you want. Make it.",
  body: `Browse ${LEGACY_MODEL_NAME} prompt examples, build a prompt from your idea or reference image, critique existing prompts for ${TARGET_MODEL_NAME}, and generate or edit the image directly in Depikt.`,
  concept: "A prompt workspace and image generator for ChatGPT Images.",
} as const;

// ---------- SEO / metadata for current product pages ----------

export interface PageMeta {
  title: string;
  description: string;
}

export const SEO: Record<
  | "root"
  | "home"
  | "prompt"
  | "library"
  | "gallery"
  | "blog"
  | "mcp"
  | "templates"
  | "generate"
  | "pricing"
  | "help"
  | "privacy"
  | "terms"
  | "signIn"
  | "signUp"
  | "account",
  PageMeta
> = {
  root: {
    title: "Depikt — Better Prompts, Better Images",
    description:
      "Explore image prompts, build and improve your own, find visual references, and generate or edit images directly with Depikt.",
  },
  home: {
    title: "Depikt — Better Prompts, Better Images",
    description:
      "Explore image prompts, build and improve your own, find visual references, and generate or edit images directly with Depikt.",
  },
  prompt: {
    title: "AI Image Prompt Builder & Critic | Depikt",
    description:
      "Build better image prompts from an idea or reference, or critique and improve an existing prompt with Depikt.",
  },
  library: {
    title: `AI Image Prompt Library — ${LIBRARY_PROMPT_COUNT} Examples | Depikt`,
    description: `Explore ${LIBRARY_PROMPT_COUNT} curated image prompts for posters, photography, edits, infographics, UI concepts, products, illustrations, and more.`,
  },
  gallery: {
    title: "AI Image Reference Gallery | Depikt",
    description:
      "Explore visual references for image generation, then use them directly in Generate or bring them into Prompt to build a more precise instruction.",
  },
  blog: {
    title: "AI Image Prompting & Generation Guides | Depikt",
    description:
      "Field notes on image prompting, references, editing, generation, experiments, and practical workflows that actually work.",
  },

  mcp: {
    title: "Depikt MCP — Prompt Library for AI Assistants",
    description:
      "Connect MCP-compatible assistants to Depikt's public prompts, templates, and image-generation guides through a read-only MCP server.",
  },
  templates: {
    title: "AI Image Prompt Templates | Depikt",
    description:
      "Start with a structured template for portraits, products, posters, infographics, edits, references, branding, and other image tasks.",
  },
  /** Behind the native-generation feature flag; live once GENERATION_ENABLED is on. */
  generate: {
    title: "AI Image Generator & Editor | Depikt",
    description:
      "Create and edit images from prompts and references with Depikt, with automatic format handling and intelligent GPT Image 2.5 model routing.",
  },
  pricing: {
    title: "Pricing | Depikt",
    description:
      "Start free with 5 image credits. Pro and Max include monthly image credits, with extra credit packs available anytime.",
  },
  help: {
    title: "Help | Depikt",
    description:
      "Learn how image credits, generation, references, billing, and your Depikt account work.",
  },
  privacy: {
    title: "Privacy Policy | Depikt",
    description:
      "How Depikt handles account data, prompts, reference images, generated images, billing, and analytics.",
  },
  terms: {
    title: "Terms of Service | Depikt",
    description: "Terms for using Depikt, subscriptions, image credits, and generated images.",
  },
  /** noindex */
  signIn: {
    title: "Sign in | Depikt",
    description: "Sign in to Depikt to generate and edit images.",
  },
  /** noindex */
  signUp: {
    title: "Create account | Depikt",
    description: "Create a free Depikt account and get 5 image credits.",
  },
  /** noindex, nofollow */
  account: { title: "Account | Depikt", description: "Your Depikt plan, credits, and usage." },
};

// ---------- auth surface copy ----------

export const AUTH_COPY = {
  signInTitle: "Sign in to Depikt",
  signUpTitle: "Create your Depikt account",
  generateTitle: "Sign in to generate",
  generateBody:
    "Your image will start as soon as you're signed in. New accounts get 5 image credits.",
  newToDepikt: "New to Depikt?",
  createAccount: "Create an account",
  haveAccount: "Already have an account?",
  signIn: "Sign in",
  legalPrefix: "By continuing, you agree to the",
  signOut: "Sign out",
} as const;

// ---------- MCP integration (public, read-only) ----------

/**
 * The MCP server itself is served at MCP.endpointPath by src/routes/mcp.ts
 * (generated by @lovable.dev/mcp-js). MCP.pagePath is the human-facing
 * explanation and connection page. Marketing copy says "public" and
 * "read-only"; the auth details stay in the technical block on that page.
 */
export const MCP = {
  endpointPath: "/mcp",
  pagePath: "/integrations/mcp",
  postSlug: "your-ai-assistant-can-now-use-depikt",
  eyebrow: "Works with AI assistants",
  headline: "Bring Depikt into your AI assistant",
  body: "ChatGPT, Claude, and other MCP-compatible assistants can search Depikt’s prompt library, open complete prompts, browse templates, and read guides directly.",
  connect: "Connect Depikt",
  learn: "Learn about MCP",
  meta: "Public · Read-only · Published content only",
  libraryNote: "Also available to MCP-compatible assistants.",
  libraryLink: "Use this library from ChatGPT or Claude",
  safety:
    "Depikt’s MCP integration is public and read-only. It exposes only approved content already published on depikt.app. There is no access to private user data, drafts, accounts, or write actions.",
  capabilities: [
    {
      tool: "search_prompts",
      title: "Search prompts",
      body: "Find relevant prompts by concept, category, or use case.",
    },
    {
      tool: "get_prompt",
      title: "Open a prompt",
      body: "Retrieve the full prompt and supporting information.",
    },
    {
      tool: "list_templates",
      title: "Browse templates",
      body: "See the structures Depikt provides for different types of image work.",
    },
    {
      tool: "get_template",
      title: "Open a template",
      body: "Read one structure in full and fill it in with your own details.",
    },
    {
      tool: "search_guides",
      title: "Find guides",
      body: "Search Depikt’s prompting guides by topic or category.",
    },
    {
      tool: "get_guide",
      title: "Read a guide",
      body: "Use one of Depikt’s prompting guides directly inside the conversation.",
    },
  ],
  cannot: [
    "Change or delete prompts",
    "Access accounts or private user data",
    "Read drafts or unpublished content",
    "Write anything to Depikt",
  ],
} as const;

/** Search-facing names for structured data. */
export const JSONLD_NAMES = {
  site: "Depikt",
  prompt: "Depikt Prompt Workspace",
  library: "Depikt Prompt Library",
  gallery: "Depikt Reference Gallery",
  templates: "Depikt Prompt Templates",
  /** Behind the native-generation feature flag. */
  generate: "Depikt Generate",
} as const;

export const JSONLD_DESCRIPTIONS = {
  prompt: `Prompt workspace for ${TARGET_MODEL_NAME} with two modes: Build turns a rough idea or reference image into a structured image prompt, Critique scores an existing prompt and returns a rewrite.`,
  app: `Depikt connects image prompt discovery, prompt building and critique, a visual reference gallery, reusable templates, and native image generation and editing for ${TARGET_MODEL_NAME}. Generation is routed internally between GPT Image 2.5 models; users describe what they want rather than choosing a model.`,
  library: `A curated collection of ${LIBRARY_PROMPT_COUNT} prompts across 10 categories: ${LEGACY_LIBRARY_COUNT} ${LEGACY_MODEL_NAME} examples and ${IMAGES_25_LIBRARY_COUNT} ${TARGET_MODEL_NAME} recipes with reviewed results.`,
  gallery:
    "A gallery of reference images you can carry into the Prompt workspace in Build mode, or generate with directly, as a style, subject, or composition reference.",
  /** Behind the native-generation feature flag. */
  generate:
    "Generate and edit images from a prompt and optional reference images. Depikt resolves the requested format automatically and routes generation between GPT Image 2.5 Flare and Sunburst internally; there is no model or quality selector. Supports editing, regeneration, and version history.",
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
