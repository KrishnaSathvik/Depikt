import { createFileRoute } from "@tanstack/react-router";
import { posts } from "@/data/posts";
import { absoluteUrl } from "@/lib/site";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const Route = createFileRoute("/api/blog/rss/xml")({
  server: {
    handlers: {
      GET: async () => {
        const sorted = [...posts].sort(
          (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime(),
        );
        const lastBuild = new Date(sorted[0]?.published ?? new Date()).toUTCString();
        const items = sorted
          .map((p) => {
            const link = absoluteUrl(`/blog/${p.slug}`);
            const pubDate = new Date(p.published).toUTCString();
            return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(p.excerpt)}</description>
      <category>${escapeXml(p.category)}</category>
    </item>`;
          })
          .join("\n");

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Depikt Blog</title>
    <link>${absoluteUrl("/blog")}</link>
    <atom:link href="${absoluteUrl("/api/blog/rss.xml")}" rel="self" type="application/rss+xml" />
    <description>Field-tested techniques for getting better AI images from GPT Image 2, Midjourney, and Nano Banana Pro.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>`;
        return new Response(body, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
