import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ListTree } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  CURRENT_MODEL_CATEGORY,
  getPostBySlug,
  getRelatedPosts,
  type PostFaqItem,
} from "@/data/posts";
import { TOOL } from "@/lib/product";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getOgImageForPath } from "@/lib/og-image";

export const Route = createFileRoute("/blog/$slug")({
  beforeLoad: ({ params }) => {
    if (params.slug === "$slug") {
      throw redirect({ to: "/blog", statusCode: 301 });
    }
  },
  loader: ({ params }) => {
    const post = getPostBySlug(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.post) return { meta: [{ title: "Post not found" }] };
    const { post } = loaderData;
    const url = absoluteUrl(`/blog/${post.slug}`);
    const ogImage = post.cover_image
      ? post.cover_image.startsWith("http")
        ? post.cover_image
        : absoluteUrl(post.cover_image)
      : getOgImageForPath("blog");

    const articleJsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.excerpt,
      image: ogImage,
      datePublished: post.published,
      dateModified: post.updated ?? post.published,
      author: { "@type": "Organization", name: post.author },
      publisher: { "@type": "Organization", name: "Depikt" },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    };

    const breadcrumbJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Blog", item: absoluteUrl("/blog") },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    };

    const scripts: { type: string; children: string }[] = [
      { type: "application/ld+json", children: JSON.stringify(articleJsonLd) },
      { type: "application/ld+json", children: JSON.stringify(breadcrumbJsonLd) },
    ];

    if (post.faq && post.faq.length > 0) {
      const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faq.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      };
      scripts.push({ type: "application/ld+json", children: JSON.stringify(faqJsonLd) });
    }

    return {
      meta: [
        { title: post.seo_title },
        { name: "description", content: post.seo_description },
        { property: "og:title", content: post.seo_title },
        { property: "og:description", content: post.seo_description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "article:published_time", content: post.published },
        { property: "article:modified_time", content: post.updated ?? post.published },
        { property: "article:author", content: post.author },
        { property: "article:section", content: post.category },
        { property: "og:image", content: ogImage },
        ...(!post.cover_image || post.cover_image.startsWith("/og/")
          ? [
              { property: "og:image:width", content: "1200" },
              { property: "og:image:height", content: "630" },
            ]
          : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: post.seo_title },
        { name: "twitter:description", content: post.seo_description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts,
    };
  },
  notFoundComponent: PostNotFound,
  component: PostPage,
});

function PostNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-32 text-center">
        <p className="badge-eyebrow">Error · 404</p>
        <h1 className="mt-5 text-[40px] font-semibold leading-tight tracking-[-0.03em]">
          Post not found
        </h1>
        <p className="mt-3 text-body-md text-[color:var(--text-secondary)]">
          That article doesn’t exist.
        </p>
        <Button asChild variant="outline" size="lg" className="mt-8">
          <Link to="/blog">Back to blog</Link>
        </Button>
      </main>
      <Footer />
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function CategoryPill({ category }: { category: string }) {
  const current = category === CURRENT_MODEL_CATEGORY;
  return (
    <span
      className={cn(
        "inline-flex items-center self-start rounded-full border px-3 py-1 text-[13px] font-medium",
        current
          ? "border-transparent bg-[color:var(--text-primary)] text-[color:var(--bg)]"
          : "border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] text-[color:var(--text-secondary)]",
      )}
    >
      {category}
    </span>
  );
}

function PostPage() {
  const { post } = Route.useLoaderData();
  const related = useMemo(
    () => getRelatedPosts(post.slug, post.category, 2),
    [post.slug, post.category],
  );

  const { nodes, headings } = useMemo(() => renderMarkdown(post.content), [post.content]);

  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? "");
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -65% 0px", threshold: 0 },
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />

      <article className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-20 pt-8 sm:px-6 lg:px-10 lg:pb-28 lg:pt-12">
        <Link
          to="/blog"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-[14px] font-medium text-[color:var(--text-tertiary)] transition-colors hover:text-[color:var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to blog
        </Link>

        {/* Post header */}
        <header className="mx-auto mt-6 max-w-[860px] text-center lg:mt-10">
          <CategoryPill category={post.category} />
          <h1 className="mt-6 text-balance text-[36px] font-semibold leading-[1.06] tracking-[-0.035em] text-[color:var(--text-primary)] sm:text-[52px]">
            {post.title}
          </h1>
          <p className="mx-auto mt-5 max-w-[62ch] text-pretty text-[17px] leading-relaxed text-[color:var(--text-secondary)] sm:text-[19px]">
            {post.subtitle}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[13px] text-[color:var(--text-tertiary)]">
            <span className="inline-flex items-center gap-2 font-medium text-[color:var(--text-secondary)]">
              <span aria-hidden className="h-5 w-5 rounded-full bg-[image:var(--brand-gradient)]" />
              By {post.author}
            </span>
            <span aria-hidden>·</span>
            <time dateTime={post.published} className="tabular-nums">
              {formatDate(post.published)}
            </time>
            {post.updated && post.updated !== post.published && (
              <>
                <span aria-hidden>·</span>
                <span className="tabular-nums">Updated {formatDate(post.updated)}</span>
              </>
            )}
            <span aria-hidden>·</span>
            <span className="tabular-nums">{post.read_time}</span>
          </div>
        </header>

        {post.cover_image && (
          <figure className="mx-auto mt-10 max-w-[1040px] lg:mt-14">
            <img
              src={post.cover_image}
              alt={post.cover_alt ?? ""}
              width={1200}
              height={630}
              className="w-full rounded-[24px] border border-[color:var(--border-subtle)] shadow-[0_30px_60px_-40px_rgba(17,17,17,0.35)]"
            />
          </figure>
        )}

        <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              {headings.length > 0 && (
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                    On this page
                  </p>
                  <ul className="mt-4 space-y-px border-l border-[color:var(--border-subtle)]">
                    {headings.map((h) => (
                      <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
                        <a
                          href={`#${h.id}`}
                          className={cn(
                            "-ml-px block border-l-2 py-1.5 pl-3 text-[13px] leading-snug transition-colors",
                            activeId === h.id
                              ? "border-[color:var(--text-primary)] font-medium text-[color:var(--text-primary)]"
                              : "border-transparent text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]",
                          )}
                        >
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>

          <div className="min-w-0 lg:max-w-[720px]">
            {/* Mobile TOC */}
            {headings.length > 0 && (
              <div className="mb-8 lg:hidden">
                <button
                  type="button"
                  onClick={() => setTocOpen((v) => !v)}
                  aria-expanded={tocOpen}
                  aria-controls="mobile-toc"
                  className="flex min-h-[48px] w-full items-center justify-between rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3 text-body-sm font-medium"
                >
                  <span className="inline-flex items-center gap-2">
                    <ListTree aria-hidden className="h-4 w-4 text-[color:var(--text-tertiary)]" />
                    On this page
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 transition-transform ${tocOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {tocOpen && (
                  <ul
                    id="mobile-toc"
                    className="mt-2 space-y-0.5 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-3 text-body-sm"
                  >
                    {headings.map((h) => (
                      <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
                        <a
                          href={`#${h.id}`}
                          onClick={() => setTocOpen(false)}
                          className="block rounded-lg px-2 py-2.5 text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-primary)]"
                        >
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* "What this page answers" — TL;DR block for LLM crawlers and skimmers */}
            {post.faq && post.faq.length > 0 && (
              <aside
                aria-label="What this page answers"
                className="mb-12 rounded-[20px] border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] p-6 sm:p-7"
              >
                <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                  What this page answers
                </p>
                <ul className="mt-4 space-y-2.5 text-body-md text-[color:var(--text-primary)]">
                  {post.faq.map((f: PostFaqItem) => (
                    <li key={f.question} className="flex gap-3">
                      <span
                        aria-hidden
                        className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-[image:var(--brand-gradient)]"
                      />
                      <span>{f.question}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            )}

            {/* Article body */}
            <div className="prose-content">{nodes}</div>

            {/* CTA */}
            <div className="relative mt-16 overflow-hidden rounded-[24px] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-7 sm:p-10">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ backgroundImage: "var(--page-glow)" }}
              />
              <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[color:var(--text-primary)]">
                    Build a prompt that follows this guide.
                  </h2>
                  <p className="mt-2 max-w-[44ch] text-body-md text-[color:var(--text-secondary)]">
                    Paste a rough idea. Get back a structured prompt.
                  </p>
                </div>
                <Button
                  asChild
                  size="lg"

                  className="shrink-0 self-start md:self-auto"
                >
                  <Link to="/prompt" search={{ mode: "build" as const }}>
                    Open {TOOL.improvePrompt} <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <section aria-label={`More in ${post.category}`} className="mt-20 lg:mt-24">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
                More in {post.category}
              </h2>
              <Link
                to="/blog"
                className="inline-flex min-h-11 items-center gap-1 text-[14px] font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
              >
                All posts <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to="/blog/$slug"
                  params={{ slug: r.slug }}
                  className="surface-card surface-card-interactive group flex flex-col p-6 sm:p-7"
                >
                  <div className="flex items-center justify-between gap-3">
                    <CategoryPill category={r.category} />
                    <span className="text-[13px] tabular-nums text-[color:var(--text-tertiary)]">
                      {r.read_time}
                    </span>
                  </div>
                  <h3 className="mt-5 text-balance text-[20px] font-semibold leading-snug tracking-[-0.015em] text-[color:var(--text-primary)]">
                    {r.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-body-sm text-[color:var(--text-secondary)]">
                    {r.excerpt}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[14px] font-medium text-[color:var(--text-primary)]">
                    Read
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
      <Footer />
    </div>
  );
}
