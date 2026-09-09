/**
 * Route-level OG cards. Each key maps to a 1200×630 PNG under public/og/.
 * `OG_ROUTE_READY` lists the cards that have actually been generated and
 * committed; routes whose card is not ready keep the previous behavior.
 * Generation: node scripts/og-images-run.ts (prompts in research/og-images/).
 */

export type OgRouteKey = "home" | "library" | "builder" | "critic" | "gallery" | "blog" | "mcp";

export const OG_ROUTE_IMAGES: Record<OgRouteKey, string> = {
  home: "/og/home.png",
  library: "/og/library.png",
  builder: "/og/prompt-builder.png",
  critic: "/og/prompt-critic.png",
  gallery: "/og/gallery.png",
  blog: "/og/blog.png",
  mcp: "/og/mcp.png",
};

/** Cards that exist in public/og/. Add a key here after its PNG is committed. */
export const OG_ROUTE_READY: ReadonlySet<OgRouteKey> = new Set<OgRouteKey>([
  "home",
  "library",
  "builder",
  "critic",
  "gallery",
  "blog",
  "mcp",
]);
