import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { getPostBySlug, getRelatedPosts } from "@/data/posts";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";

export const Route = createFileRoute("/blog/$slug")({
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
      ? (post.cover_image.startsWith("http") ? post.cover_image : absoluteUrl(post.cover_image))
      : getOgImageForPath(`/blog/${post.slug}`);

    const articleJsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.excerpt,
      image: ogImage,
      datePublished: post.published,
      dateModified: post.published,
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
        { property: "article:author", content: post.author },
        { property: "article:section", content: post.category },
        { property: "og:image", content: ogImage },
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
    <div className="min-h-screen bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-32 text-center">
        <p className="eyebrow">Error · 404</p>
        <h1 className="mt-4 text-display-md">Post not found</h1>
        <p className="mt-3 text-body-md text-[color:var(--text-secondary)]">
          That article doesn’t exist.
        </p>
        <Link to="/blog" className="mt-8 inline-block">
          <Button variant="outline">Back to blog</Button>
        </Link>
      </main>
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
    <div className="min-h-screen bg-[color:var(--bg)]">
      <Header />

      <article className="mx-auto max-w-[1400px] px-6 lg:px-12 py-10">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-mono-sm text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to blog
        </Link>

        {/* Single grid wraps everything: header, content, and bottom blocks flow in the left column */}
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_240px]">
          <div className="min-w-0">
            {/* Post header */}
            <header>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[color:var(--text-tertiary)]">
                  {post.category}
                </span>
                <span className="text-[color:var(--text-quaternary)]">·</span>
                <span className="font-mono text-[12px] tabular-nums text-[color:var(--text-tertiary)]">
                  {formatDate(post.published)}
                </span>
                <span className="text-[color:var(--text-quaternary)]">·</span>
                <span className="font-mono text-[12px] tabular-nums text-[color:var(--text-tertiary)]">
                  {post.read_time}
                </span>
              </div>

              <h1 className="mt-5 text-display-lg text-[color:var(--text-primary)]">{post.title}</h1>
              <p className="mt-4 text-body-lg text-[color:var(--text-secondary)]">{post.subtitle}</p>
            </header>

            {/* Mobile TOC */}
            {headings.length > 0 && (
              <div className="mt-8 lg:hidden">
                <button
                  type="button"
                  onClick={() => setTocOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-4 py-3 text-body-sm font-medium"
                >
                  <span>On this page</span>
                  <ArrowRight
                    className={`h-4 w-4 transition-transform ${tocOpen ? "rotate-90" : ""}`}
                  />
                </button>
                {tocOpen && (
                  <ul className="mt-2 space-y-1 rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4 text-body-sm">
                    {headings.map((h) => (
                      <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
                        <a
                          href={`#${h.id}`}
                          onClick={() => setTocOpen(false)}
                          className="block py-1 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
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
                className="mt-10 rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-6"
              >
                <p className="eyebrow">What this page answers</p>
                <ul className="mt-4 space-y-2 text-body-md text-[color:var(--text-secondary)] list-disc pl-5 marker:text-[color:var(--text-quaternary)]">
                  {post.faq.map((f) => (
                    <li key={f.question}>{f.question}</li>
                  ))}
                </ul>
              </aside>
            )}

            {/* Article body */}
            <div className="mt-10 border-t border-[color:var(--border-subtle)] pt-10">
              <div className="prose-content">{nodes}</div>
            </div>

            {/* CTA */}
            <div className="mt-14 rounded-md border border-[color:var(--accent)] bg-[color:var(--accent)] px-8 py-8 sm:px-10 sm:py-10 text-center">
              <p className="font-mono text-[11px] font-medium tracking-[0.1em] uppercase text-white/60">
                Generate yours
              </p>
              <h3 className="mt-2 text-heading-md text-white">
                Generate polished prompts in seconds.
              </h3>
              <p className="mt-2 text-body-sm text-white/70">
                Paste a rough idea. Get back a structured prompt that ships.
              </p>
              <Link to="/generate" className="mt-5 inline-block">
                <Button
                  size="default"
                  variant="secondary"
                  className="bg-white text-[color:var(--accent)] hover:bg-[color:var(--bg-subtle)] border-transparent"
                >
                  Open Depikt <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Related posts */}
            {related.length > 0 && (
              <div className="mt-12">
                <p className="eyebrow">More in {post.category}</p>
                <div className="mt-4 grid gap-px bg-[color:var(--border-subtle)] border border-[color:var(--border-subtle)] sm:grid-cols-2">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      to="/blog/$slug"
                      params={{ slug: r.slug }}
                      className="group block bg-[color:var(--bg-elevated)] p-6 hover:bg-[color:var(--bg-subtle)] transition-colors"
                    >
                      <span className="font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[color:var(--text-tertiary)]">
                        {r.category}
                      </span>
                      <h5 className="mt-3 text-heading-sm text-[color:var(--text-primary)] group-hover:underline underline-offset-4">
                        {r.title}
                      </h5>
                      <p className="mt-2 text-body-sm text-[color:var(--text-secondary)] line-clamp-2">
                        {r.excerpt}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-8">
              {headings.length > 0 && (
                <div>
                  <p className="eyebrow">On this page</p>
                  <ul className="mt-4 space-y-px border-l border-[color:var(--border-subtle)]">
                    {headings.map((h) => (
                      <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
                        <a
                          href={`#${h.id}`}
                          className={`block border-l-2 -ml-px py-1.5 pl-3 font-mono text-[12px] tracking-[0.04em] uppercase transition-colors ${
                            activeId === h.id
                              ? "border-[color:var(--accent)] text-[color:var(--text-primary)]"
                              : "border-transparent text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
                          }`}
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
        </div>
      </article>
    </div>
  );
}
