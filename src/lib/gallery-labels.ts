import { GALLERY_METADATA } from "../data/gallery-metadata.ts";
const UUID_FILE_RE =
  /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\./;

/**
 * Visible gallery names. UUID filenames are never shown as titles.
 * Do not invent style or category metadata — only an intentional fallback.
 */
export function galleryLabel(filename: string, index = 0): string {
  if (GALLERY_METADATA[filename]) return GALLERY_METADATA[filename].title;
  const n = index + 1;
  if (UUID_FILE_RE.test(filename)) return `Gallery reference ${n}`;
  if (/^IMG_/i.test(filename)) return `Gallery photo ${n}`;
  const stem = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return stem || `Gallery reference ${n}`;
}
