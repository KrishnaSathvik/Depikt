import { OG_THUMBNAIL_URLS } from "@/data/og-thumbnails";
import { absoluteUrl } from "@/lib/site";

export function getRandomOgImage(): string {
  if (OG_THUMBNAIL_URLS.length === 0) return absoluteUrl("/og-default.png");
  return OG_THUMBNAIL_URLS[Math.floor(Math.random() * OG_THUMBNAIL_URLS.length)];
}
