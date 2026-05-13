import { OG_THUMBNAIL_URLS } from "@/data/og-thumbnails";
import { absoluteUrl } from "@/lib/site";

/**
 * Picks a random OG thumbnail on each call. Called inside route head() so
 * each SSR request emits a different og:image (and matching twitter:image,
 * since we call it once per head() and reuse the result).
 *
 * Cached aggressively by some platforms (Twitter, Facebook) and re-fetched
 * by others (Discord, iMessage, Slack) — so in practice you get rotation
 * on the platforms that don't lock to first-fetch.
 */
export function getOgImageForPath(_key?: string): string {
  if (OG_THUMBNAIL_URLS.length === 0) return absoluteUrl("/og-default.png");
  return OG_THUMBNAIL_URLS[Math.floor(Math.random() * OG_THUMBNAIL_URLS.length)];
}

/** @deprecated Use getOgImageForPath() — now randomized. */
export function getRandomOgImage(): string {
  return getOgImageForPath();
}
