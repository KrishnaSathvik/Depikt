/**
 * Route-level OG cards. Each key maps to a 1200×630 PNG under public/og/.
 * `OG_ROUTE_READY` lists the cards that have actually been generated and
 * committed; routes whose card is not ready keep the previous behavior.
 * Generation: node scripts/og-images-run.ts (prompts in research/og-images/).
 *
 * Build and Critique share one Prompt card: they are two modes of one page,
 * and /generate and /critique only redirect there.
 */

export type OgRouteKey =
  | "home"
  | "library"
  | "prompt"
  | "generate"
  | "gallery"
  | "templates"
  | "blog"
  | "mcp"
  | "pricing";

export const OG_ROUTE_IMAGES: Record<OgRouteKey, string> = {
  home: "/og/home.png",
  library: "/og/library.png",
  prompt: "/og/prompt.png",
  generate: "/og/generate.png",
  gallery: "/og/gallery.png",
  templates: "/og/templates.png",
  blog: "/og/blog.png",
  mcp: "/og/mcp.png",
  pricing: "/og/pricing.png",
};

/**
 * Cards that exist in public/og/. Add a key here after its PNG is committed.
 * "pricing" is not ready yet — no card has been generated (that runs outside
 * the product with node scripts/og-images-run.ts, needing OPENAI_API_KEY);
 * until then it falls back to a random curated-prompt thumbnail like any
 * other not-yet-ready route.
 */
export const OG_ROUTE_READY: ReadonlySet<OgRouteKey> = new Set<OgRouteKey>([
  "home",
  "library",
  "prompt",
  "generate",
  "gallery",
  "templates",
  "blog",
  "mcp",
]);
