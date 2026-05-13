import { createFileRoute } from "@tanstack/react-router";
import { posts } from "@/data/posts";
import { absoluteUrl } from "@/lib/site";

// Static "site shell last meaningfully changed" date — bump when you ship a
// real content/structure change to a static route. Avoids advertising a fresh
// lastmod every request.
const STATIC_LASTMOD = "2026-05-13";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const latestPostDate =
          posts
            .map((p) => p.published)
            .sort()
            .at(-1) ?? STATIC_LASTMOD;
        // `/` is a redirect to /library, so it's intentionally omitted to keep
        // /library as the canonical landing page in search.
        const urls: { loc: string; lastmod: string; priority: string; changefreq?: string }[] = [
          { loc: absoluteUrl("/library"), lastmod: STATIC_LASTMOD, priority: "1.0", changefreq: "daily" },
          { loc: absoluteUrl("/generate"), lastmod: STATIC_LASTMOD, priority: "0.9", changefreq: "weekly" },
          { loc: absoluteUrl("/gallery"), lastmod: STATIC_LASTMOD, priority: "0.8", changefreq: "weekly" },
          { loc: absoluteUrl("/critique"), lastmod: STATIC_LASTMOD, priority: "0.8", changefreq: "weekly" },
          { loc: absoluteUrl("/blog"), lastmod: latestPostDate, priority: "0.9", changefreq: "weekly" },
          ...posts.map((p) => ({
            loc: absoluteUrl(`/blog/${p.slug}`),
            lastmod: p.published,
            priority: "0.8",
          })),
        ];
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod>${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ""}<priority>${u.priority}</priority></url>`,
  )
  .join("\n")}
</urlset>`;
        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
