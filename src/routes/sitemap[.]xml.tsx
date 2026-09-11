import { createFileRoute } from "@tanstack/react-router";
import { posts } from "@/data/posts";
import { absoluteUrl } from "@/lib/site";
import { MCP } from "@/lib/product";

// Static "site shell last meaningfully changed" date — bump when you ship a
// real content/structure change to a static route. Avoids advertising a fresh
// lastmod every request.
const STATIC_LASTMOD = "2026-09-10";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const latestPostDate =
          posts
            .map((p) => p.updated ?? p.published)
            .sort()
            .at(-1) ?? STATIC_LASTMOD;
        const urls: { loc: string; lastmod: string; priority: string; changefreq?: string }[] = [
          { loc: absoluteUrl("/"), lastmod: STATIC_LASTMOD, priority: "1.0", changefreq: "weekly" },
          {
            loc: absoluteUrl("/library"),
            lastmod: STATIC_LASTMOD,
            priority: "0.9",
            changefreq: "daily",
          },
          {
            // Generate is now a mode of this same page (?mode=generate),
            // not its own URL — /generate only redirects here, same as
            // /critique, so neither gets its own sitemap entry.
            loc: absoluteUrl("/prompt"),
            lastmod: STATIC_LASTMOD,
            priority: "0.9",
            changefreq: "weekly",
          },
          {
            loc: absoluteUrl("/gallery"),
            lastmod: STATIC_LASTMOD,
            priority: "0.8",
            changefreq: "weekly",
          },
          {
            loc: absoluteUrl("/blog"),
            lastmod: latestPostDate,
            priority: "0.9",
            changefreq: "weekly",
          },
          {
            loc: absoluteUrl(MCP.pagePath),
            lastmod: STATIC_LASTMOD,
            priority: "0.8",
            changefreq: "monthly",
          },
          {
            loc: absoluteUrl("/templates"),
            lastmod: STATIC_LASTMOD,
            priority: "0.9",
            changefreq: "weekly",
          },
          {
            loc: absoluteUrl("/pricing"),
            lastmod: STATIC_LASTMOD,
            priority: "0.8",
            changefreq: "monthly",
          },
          {
            loc: absoluteUrl("/help"),
            lastmod: STATIC_LASTMOD,
            priority: "0.6",
            changefreq: "monthly",
          },
          {
            loc: absoluteUrl("/privacy"),
            lastmod: STATIC_LASTMOD,
            priority: "0.3",
            changefreq: "yearly",
          },
          {
            loc: absoluteUrl("/terms"),
            lastmod: STATIC_LASTMOD,
            priority: "0.3",
            changefreq: "yearly",
          },
          ...posts.map((p) => ({
            loc: absoluteUrl(`/blog/${p.slug}`),
            lastmod: p.updated ?? p.published,
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
