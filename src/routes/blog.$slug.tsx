import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getPostBySlug, getRelatedPosts, type PostFaqItem } from "@/data/posts";
import { TOOL } from "@/lib/product";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl } from "@/lib/site";
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
      : getOgImageForPath();

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
        <p className="eyebrow">Error · 404</p>
        <h1 className="mt-4 text-display-md">Post not found</h1>
        <p className="mt-3 text-body-md text-[color:var(--text-secondary)]">
          That article doesn’t exist.
        </p>
        <Button asChild variant="outline" className="mt-8">
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

      <article className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-10 sm:px-6 lg:px-12">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-mono-sm text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to blog
        </Link>

        {/* Single grid wraps everything: header, content, and bottom blocks flow in the left column */}
        <div className="mt-8 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
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
                          className={`block border-l -ml-px py-1.5 pl-3 text-[13px] transition-colors ${
                            activeId === h.id
                              ? "border-[color:var(--text-primary)] text-[color:var(--text-primary)]"
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
          <div className="min-w-0 lg:max-w-[760px] lg:justify-self-start">
            {/* Post header */}
            <header>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[color:var(--text-tertiary)]">
                <span>{post.category}</span>
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

              <h1 className="mt-6 text-display-md md:text-display-lg text-[color:var(--text-primary)]">
                {post.title}
              </h1>
              <p className="mt-5 text-body-lg text-[color:var(--text-secondary)]">
                {post.subtitle}
              </p>
              <p className="mt-6 text-[13px] text-[color:var(--text-tertiary)]">By {post.author}</p>
            </header>

            {post.cover_image && (
              <figure className="mt-10">
                <img
                  src={post.cover_image}
                  alt={post.cover_alt ?? ""}
                  width={1200}
                  height={630}
                  className="w-full rounded-md border border-[color:var(--border-subtle)]"
                />
              </figure>
            )}

            {/* Mobile TOC */}
            {headings.length > 0 && (
              <div className="mt-8 lg:hidden">
                <button
                  type="button"
                  onClick={() => setTocOpen((v) => !v)}
                  aria-expanded={tocOpen}
                  aria-controls="mobile-toc"
                  className="flex min-h-[44px] w-full items-center justify-between rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-4 py-3 text-body-sm font-medium"
                >
                  <span>On this page</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 transition-transform ${tocOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {tocOpen && (
                  <ul
                    id="mobile-toc"
                    className="mt-2 space-y-1 rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4 text-body-sm"
                  >
                    {headings.map((h) => (
                      <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
                        <a
                          href={`#${h.id}`}
                          onClick={() => setTocOpen(false)}
                          className="block py-2 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
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
                className="mt-10 border-t border-[color:var(--text-primary)] pt-5"
              >
                <p className="eyebrow">What this page answers</p>
                <ul className="mt-4 space-y-2 text-body-md text-[color:var(--text-secondary)] list-disc pl-5 marker:text-[color:var(--text-quaternary)]">
                  {post.faq.map((f: PostFaqItem) => (
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
            <div className="mt-14 border-t border-[color:var(--text-primary)] pt-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-heading-md text-[color:var(--text-primary)]">
                    Build a prompt that follows this guide.
                  </h3>
                  <p className="mt-2 max-w-[48ch] text-body-md text-[color:var(--text-secondary)]">
                    Paste a rough idea. Get back a structured prompt.
                  </p>
                </div>
                <Button asChild size="lg" className="shrink-0">
                  <Link to="/prompt" search={{ mode: "build" as const }}>
                    Open {TOOL.prompt} <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Related posts */}
            {related.length > 0 && (
              <div className="mt-12 border-t border-[color:var(--text-primary)] pt-5">
                <p className="eyebrow">More in {post.category}</p>
                <div className="mt-4 grid gap-px bg-[color:var(--border-subtle)] border border-[color:var(--border-subtle)] sm:grid-cols-2">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      to="/blog/$slug"
                      params={{ slug: r.slug }}
                      className="group block bg-[color:var(--bg-elevated)] p-6 hover:bg-[color:var(--bg-muted)] transition-colors"
                    >
                      <span className="text-[13px] font-medium text-[color:var(--text-tertiary)]">
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
        </div>
      </article>
      <Footer />
    </div>
  );
}
