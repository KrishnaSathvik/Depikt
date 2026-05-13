import { OG_THUMBNAIL_URLS } from "@/data/og-thumbnails";
import { absoluteUrl } from "@/lib/site";

/**
 * Deterministic OG image picker. Same input string (route path or slug)
 * always returns the same image URL, so og:image and twitter:image on the
 * same page point to the same asset.
 */
export function getOgImageForPath(key: string): string {
  if (OG_THUMBNAIL_URLS.length === 0) return absoluteUrl("/og-default.png");
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % OG_THUMBNAIL_URLS.length;
  return OG_THUMBNAIL_URLS[index];
}

/** @deprecated Use getOgImageForPath(routePath) — randomized images cause OG/Twitter mismatches. */
export function getRandomOgImage(): string {
  return absoluteUrl("/og-default.png");
}
