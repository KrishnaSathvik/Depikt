import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { posts } from "@/data/posts";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";

const BLOG_INDEX_OG_IMAGE = getOgImageForPath("/blog");

const PAGE_TITLE = "AI Image Prompt Engineering — Depikt Blog";
const PAGE_DESCRIPTION =
  "Field-tested techniques for getting better AI images from GPT Image 2, Midjourney, Nano Banana Pro. Frameworks, examples, comparisons.";
const PAGE_URL = absoluteUrl("/blog");

export const Route = createFileRoute("/blog/")({
  head: () => {
    const blogJsonLd = {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Depikt Blog",
      description: PAGE_DESCRIPTION,
      url: PAGE_URL,
      blogPost: posts.map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        description: p.excerpt,
        datePublished: p.published,
        author: { "@type": "Organization", name: p.author },
        url: `${PAGE_URL}/${p.slug}`,
      })),
    };
    return {
      meta: [
        { title: PAGE_TITLE },
        { name: "description", content: PAGE_DESCRIPTION },
        { property: "og:title", content: PAGE_TITLE },
        { property: "og:description", content: PAGE_DESCRIPTION },
        { property: "og:type", content: "website" },
        { property: "og:url", content: PAGE_URL },
        { property: "og:image", content: BLOG_INDEX_OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: PAGE_TITLE },
        { name: "twitter:description", content: PAGE_DESCRIPTION },
        { name: "twitter:image", content: BLOG_INDEX_OG_IMAGE },
      ],
      links: [
        { rel: "canonical", href: PAGE_URL },
        {
          rel: "alternate",
          type: "application/rss+xml",
          title: "Depikt Blog RSS",
          href: absoluteUrl("/api/blog/rss.xml"),
        },
      ],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(blogJsonLd) }],
    };
  },
  component: BlogIndex,
});

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function PostCard({
  post,
  featured = false,
}: {
  post: (typeof posts)[number];
  featured?: boolean;
}) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className={`group block bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-7 sm:p-8 transition-[border-color,box-shadow] duration-200 ease-out hover:border-[color:var(--border-default)] hover:shadow-sm-card ${
        featured ? "sm:p-10" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[color:var(--text-tertiary)]">
          {post.category}
        </span>
        <span className="text-[color:var(--text-quaternary)]">·</span>
        <span className="font-mono text-[11px] tabular-nums text-[color:var(--text-tertiary)]">
          {formatDate(post.published)}
        </span>
      </div>

      <h3
        className={`mt-5 text-[color:var(--text-primary)] group-hover:underline underline-offset-4 decoration-[color:var(--border-default)] ${
          featured ? "text-display-md" : "text-heading-md"
        }`}
      >
        {post.title}
      </h3>
      <p
        className={`mt-4 text-[color:var(--text-secondary)] ${featured ? "text-body-lg" : "text-body-md"}`}
      >
        {post.excerpt}
      </p>
      <div className="mt-6 flex items-center gap-3 font-mono text-[12px] tracking-[0.04em] text-[color:var(--text-tertiary)]">
        <span>{post.author}</span>
        <span>·</span>
        <span className="tabular-nums">{post.read_time}</span>
        <ArrowRight className="ml-auto h-4 w-4 text-[color:var(--text-tertiary)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150" />
      </div>
    </Link>
  );
}

function BlogIndex() {
  const sorted = [...posts].sort(
    (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime(),
  );
  const [featured, ...rest] = sorted;

  const categoryCounts = Array.from(
    posts.reduce(
      (acc, p) => acc.set(p.category, (acc.get(p.category) ?? 0) + 1),
      new Map<string, number>(),
    ),
  );

  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <Header />

      <main className="mx-auto max-w-[1400px] px-6 lg:px-12 py-16 sm:py-24">
        <header className="max-w-3xl mb-16">
          <p className="eyebrow">Field notes</p>
          <h1 className="mt-4 text-display-lg">The Depikt Blog</h1>
          <p className="mt-5 text-body-lg text-[color:var(--text-secondary)]">
            Field-tested techniques for getting better AI images. Written by people who actually
            ship.
          </p>
        </header>

        <div className="grid gap-12 lg:grid-cols-[1fr_240px]">
          <div>
            {featured && (
              <div className="mb-px">
                <PostCard post={featured} featured />
              </div>
            )}
            <div className="grid gap-px bg-[color:var(--border-subtle)] border-x border-b border-[color:var(--border-subtle)] sm:grid-cols-2">
              {rest.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start space-y-8">
            <div className="border-l-2 border-[color:var(--accent)] pl-5">
              <p className="eyebrow">Try Depikt</p>
              <h3 className="mt-3 text-heading-sm">
                Generate prompts that follow every rule we write about.
              </h3>
              <Link to="/generate" className="mt-5 inline-block">
                <Button size="sm" className="gap-1.5">
                  Open generator
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            <div>
              <p className="eyebrow">Categories</p>
              <ul className="mt-4 space-y-2.5">
                {categoryCounts.map(([cat, count]) => (
                  <li
                    key={cat}
                    className="flex items-baseline justify-between text-body-sm text-[color:var(--text-secondary)]"
                  >
                    <span>{cat}</span>
                    <span className="font-mono text-[12px] tabular-nums text-[color:var(--text-tertiary)]">
                      {String(count).padStart(2, "0")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t border-[color:var(--border-subtle)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12 py-10 text-mono-sm text-[color:var(--text-tertiary)]">
          Depikt © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
