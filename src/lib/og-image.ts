import { OG_THUMBNAIL_URLS } from "@/data/og-thumbnails";
import { OG_ROUTE_IMAGES, OG_ROUTE_READY, type OgRouteKey } from "@/lib/og-routes";
import { absoluteUrl } from "@/lib/site";

/**
 * OG image for a route. A route whose branded card is ready (see
 * OG_ROUTE_READY) always gets that fixed card. Otherwise, fall back to a
 * random curated-prompt thumbnail per SSR request, or the home card when no
 * thumbnails are available.
 */
export function getOgImageForPath(key?: OgRouteKey): string {
  if (key && OG_ROUTE_READY.has(key)) return absoluteUrl(OG_ROUTE_IMAGES[key]);
  if (OG_THUMBNAIL_URLS.length === 0) return absoluteUrl(OG_ROUTE_IMAGES.home);
  return OG_THUMBNAIL_URLS[Math.floor(Math.random() * OG_THUMBNAIL_URLS.length)];
}

/** @deprecated Use getOgImageForPath(key). */
export function getRandomOgImage(): string {
  return getOgImageForPath();
}
