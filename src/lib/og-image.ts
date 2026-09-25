import { OG_ROUTE_IMAGES, OG_ROUTE_READY, type OgRouteKey } from "@/lib/og-routes";
import { absoluteUrl } from "@/lib/site";

/** Stable branded cards keep crawlers and repeated requests consistent. */
export function getOgImageForPath(key?: OgRouteKey): string {
  return absoluteUrl(OG_ROUTE_IMAGES[key && OG_ROUTE_READY.has(key) ? key : "home"]);
}
/** @deprecated Use getOgImageForPath(key). */
export function getRandomOgImage(): string {
  return getOgImageForPath();
}
