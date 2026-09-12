import type { PageMeta } from "./product";

type HeadMeta =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

/**
 * Canonical page <head> for SEO + Open Graph. Every public route should go
 * through here so og:title/og:description/robots stay locked to SEO in
 * product.ts instead of silently falling back to the document title.
 */
export function pageSeoHead(
  page: PageMeta,
  opts: { url: string; image?: string },
): { meta: HeadMeta[]; links: Array<{ rel: string; href: string }> } {
  const ogTitle = page.ogTitle ?? page.title;
  const ogDescription = page.ogDescription ?? page.description;
  const meta: HeadMeta[] = [
    { title: page.title },
    { name: "description", content: page.description },
  ];
  if (page.robots) meta.push({ name: "robots", content: page.robots });
  meta.push(
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: ogDescription },
    { property: "og:type", content: "website" },
    { property: "og:url", content: opts.url },
  );
  if (opts.image) {
    meta.push(
      { property: "og:image", content: opts.image },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
    );
  }
  meta.push(
    { name: "twitter:card", content: opts.image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: ogTitle },
    { name: "twitter:description", content: ogDescription },
  );
  if (opts.image) meta.push({ name: "twitter:image", content: opts.image });
  return { meta, links: [{ rel: "canonical", href: opts.url }] };
}
