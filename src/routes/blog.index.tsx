import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CURRENT_MODEL_CATEGORY, getPostsByDate, posts } from "@/data/posts";
import { TARGET_MODEL_NAME, TOOL } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";

const PAGE_TITLE = "AI Image Prompt Engineering — Depikt Blog";
const PAGE_DESCRIPTION = `Field-tested guides for getting better images from ${TARGET_MODEL_NAME}: prompting, precise edits, reference images, posters and infographics, plus the historical GPT Image 2 guides. Frameworks, examples, comparisons.`;
const PAGE_URL = absoluteUrl("/blog");

export const Route = createFileRoute("/blog/")({
  head: () => {
    const BLOG_INDEX_OG_IMAGE = getOgImageForPath();
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
        dateModified: p.updated ?? p.published,
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

type PostItem = (typeof posts)[number];

function Meta({ post }: { post: PostItem }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)] md:flex-col md:items-start md:gap-y-1.5">
      <span
        className={
          post.category === CURRENT_MODEL_CATEGORY ? "text-[color:var(--text-primary)]" : ""
        }
      >
        {post.category}
      </span>
      <span aria-hidden className="md:hidden">
        ·
      </span>
      <span className="flex items-center gap-2">
        <time dateTime={post.published} className="tabular-nums">
          {formatDate(post.published)}
        </time>
        <span aria-hidden>·</span>
        <span className="tabular-nums">{post.read_time}</span>
      </span>
    </div>
  );
}

function FeaturedPost({ post }: { post: PostItem }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="group grid gap-6 border-t border-[color:var(--text-primary)] py-10 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-12 md:py-12"
    >
      <div>
        <Meta post={post} />
        <h2 className="mt-5 max-w-[20ch] text-display-md md:text-display-lg text-[color:var(--text-primary)] underline-offset-[6px] group-hover:underline">
          {post.title}
        </h2>
      </div>
      <div className="flex flex-col justify-end">
        <p className="text-body-lg text-[color:var(--text-secondary)]">{post.subtitle}</p>
        <span className="mt-6 inline-flex items-center gap-1.5 text-body-sm font-medium text-[color:var(--text-primary)]">
          Read the guide
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function PostRow({ post }: { post: PostItem }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="group grid gap-3 border-t border-[color:var(--border-subtle)] py-7 md:grid-cols-[200px_minmax(0,1fr)] md:gap-10 md:py-8"
    >
      <Meta post={post} />
      <div className="min-w-0">
        <h3 className="text-heading-md text-[color:var(--text-primary)] underline-offset-4 group-hover:underline">
          {post.title}
        </h3>
        <p className="mt-2 max-w-[68ch] text-body-md text-[color:var(--text-secondary)]">
          {post.excerpt}
        </p>
      </div>
    </Link>
  );
}

function BlogIndex() {
  const sorted = getPostsByDate();
  const current = sorted.filter((p) => p.category === CURRENT_MODEL_CATEGORY);
  const older = sorted.filter((p) => p.category !== CURRENT_MODEL_CATEGORY);
  const [featured, ...restCurrent] = current.length > 0 ? current : sorted;
  const rest = current.length > 0 ? restCurrent : older.slice(1);

  const categoryCounts = Array.from(
    posts.reduce(
      (acc, p) => acc.set(p.category, (acc.get(p.category) ?? 0) + 1),
      new Map<string, number>(),
    ),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-12 sm:px-6 lg:px-12 lg:py-20">
        <header className="max-w-3xl">
          <p className="eyebrow">{TOOL.blog}</p>
          <h1 className="mt-4 text-display-lg md:text-display-xl">Field notes.</h1>
          <p className="mt-5 max-w-[52ch] text-body-lg text-[color:var(--text-secondary)]">
            Guides for getting better images from {TARGET_MODEL_NAME}, written by people who ship
            prompts every day. The older GPT Image 2 guides stay as written.
          </p>
        </header>

        <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-20">
          <div>
            {featured && <FeaturedPost post={featured} />}

            {rest.length > 0 && (
              <section aria-label={`${CURRENT_MODEL_CATEGORY} guides`}>
                {rest.map((post) => (
                  <PostRow key={post.slug} post={post} />
                ))}
              </section>
            )}

            {current.length > 0 && older.length > 0 && (
              <section aria-label="Earlier guides" className="mt-16">
                <div className="flex items-baseline justify-between border-t border-[color:var(--text-primary)] pt-4">
                  <p className="eyebrow">Earlier guides · GPT Image 2 era</p>
                  <span className="font-mono text-[11.5px] tabular-nums text-[color:var(--text-tertiary)]">
                    {older.length}
                  </span>
                </div>
                <div className="mt-2">
                  {older.map((post) => (
                    <PostRow key={post.slug} post={post} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-10 lg:sticky lg:top-24 lg:self-start">
            <div>
              <p className="eyebrow">Try Depikt</p>
              <h2 className="mt-3 text-heading-sm">
                Build prompts that follow every rule we write about.
              </h2>
              <Button asChild size="sm" className="mt-5">
                <Link to="/generate">
                  Open {TOOL.builder}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div>
              <p className="eyebrow">Categories</p>
              <ul className="mt-4 space-y-2">
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

      <Footer />
    </div>
  );
}
