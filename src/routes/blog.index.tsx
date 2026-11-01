import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Pagination } from "@/components/Pagination";
import {
  ArrowRight,
  BookOpen,
  Lightbulb,
  ListChecks,
  Megaphone,
  Scale,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { ScrollRow } from "@/components/ScrollRow";
import { CURRENT_MODEL_CATEGORY, getPostsByDate, posts } from "@/data/posts";
import { SEO } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import { pageSeoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

const PAGE_URL = absoluteUrl("/blog");

export const Route = createFileRoute("/blog/")({
  head: () => {
    const { meta, links } = pageSeoHead(SEO.blog, {
      url: PAGE_URL,
      image: getOgImageForPath("blog"),
    });
    const blogJsonLd = {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Depikt Blog",
      description: SEO.blog.description,
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
      meta,
      links: [
        ...links,
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

/**
 * Posts without a cover still get a visual: a soft studio gradient keyed to
 * the post (stable per slug) with one glyph for its kind of guide. No
 * invented imagery: only posts that ship a cover_image show a picture.
 */
const ART_PALETTES = [
  ["#ffe1d2", "#ffc6b0", "#f7d6ff"],
  ["#e9e2ff", "#d6ccff", "#ffdbe8"],
  ["#dff1ff", "#c9e6ff", "#efe2ff"],
  ["#e2f6ec", "#c8edd9", "#e3f0ff"],
  ["#fff0d6", "#ffdcb3", "#ffd6e2"],
] as const;

function iconFor(category: string): LucideIcon {
  const c = category.toLowerCase();
  if (c === CURRENT_MODEL_CATEGORY.toLowerCase()) return Sparkles;
  if (c === "product") return Megaphone;
  if (c.includes("comparison")) return Scale;
  if (c.includes("how-to")) return ListChecks;
  if (c.includes("tip")) return Lightbulb;
  if (c.includes("mistake")) return TriangleAlert;
  return BookOpen;
}

function paletteFor(slug: string) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return ART_PALETTES[h % ART_PALETTES.length];
}

function PostArt({ post, large = false }: { post: PostItem; large?: boolean }) {
  if (post.cover_image) {
    return (
      <img
        src={post.cover_image}
        alt={post.cover_alt ?? ""}
        loading={large ? "eager" : "lazy"}
        className="h-full w-full object-cover object-left transition-transform duration-500 ease-out group-hover:scale-[1.02]"
      />
    );
  }
  const [a, b, c] = paletteFor(post.slug);
  const Icon = iconFor(post.category);
  return (
    <div
      aria-hidden
      className="relative h-full w-full overflow-hidden"
      style={{
        background: `radial-gradient(70% 90% at 15% 10%, ${b}, transparent 70%), radial-gradient(60% 80% at 90% 90%, ${c}, transparent 70%), ${a}`,
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(17,17,17,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(17,17,17,0.06) 1px, transparent 1px)",
          backgroundSize: large ? "40px 40px" : "28px 28px",
          maskImage: "radial-gradient(80% 80% at 50% 50%, black, transparent)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "flex items-center justify-center rounded-full border border-white/70 bg-white/60 shadow-[0_10px_30px_-12px_rgba(17,17,17,0.25)] backdrop-blur-md transition-transform duration-500 ease-out group-hover:scale-105",
            large ? "h-20 w-20" : "h-14 w-14",
          )}
        >
          <Icon
            className={cn("text-[color:var(--text-primary)]", large ? "h-8 w-8" : "h-6 w-6")}
            strokeWidth={1.5}
          />
        </span>
      </div>
    </div>
  );
}

function CategoryPill({ category }: { category: string }) {
  const current = category === CURRENT_MODEL_CATEGORY;
  return (
    <span
      className={cn(
        "inline-flex items-center self-start rounded-full border px-2.5 py-0.5 text-[12px] font-medium",
        current
          ? "border-transparent bg-[color:var(--text-primary)] text-[color:var(--bg)]"
          : "border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] text-[color:var(--text-secondary)]",
      )}
    >
      {category}
    </span>
  );
}

function Meta({ post }: { post: PostItem }) {
  return (
    <p className="flex items-center gap-2 text-[13px] text-[color:var(--text-tertiary)]">
      <time dateTime={post.published} className="tabular-nums">
        {formatDate(post.published)}
      </time>
      <span aria-hidden>·</span>
      <span className="tabular-nums">{post.read_time}</span>
    </p>
  );
}

function FeaturedPost({ post }: { post: PostItem }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="surface-card surface-card-interactive group grid overflow-hidden md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
    >
      <div className="aspect-[1200/630] overflow-hidden border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] md:aspect-auto md:min-h-[360px] md:border-b-0 md:border-r">
        <PostArt post={post} large />
      </div>
      <div className="flex flex-col p-6 sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
            Latest
          </span>
          <CategoryPill category={post.category} />
        </div>
        <h2 className="mt-5 text-balance text-[28px] font-semibold leading-[1.1] tracking-[-0.025em] text-[color:var(--text-primary)] sm:text-[36px]">
          {post.title}
        </h2>
        <p className="mt-4 text-pretty text-body-md text-[color:var(--text-secondary)]">
          {post.subtitle}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-8">
          <Meta post={post} />
          <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[color:var(--text-primary)] px-5 text-[14px] font-medium text-[color:var(--bg)]">
            Read the guide
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function PostCard({ post }: { post: PostItem }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="surface-card surface-card-interactive group flex h-full flex-col overflow-hidden"
    >
      <div className="aspect-[16/7] overflow-hidden border-b sm:aspect-[16/9] border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)]">
        <PostArt post={post} />
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <CategoryPill category={post.category} />
        <h3 className="mt-3 text-balance text-[19px] font-semibold leading-snug tracking-[-0.015em] text-[color:var(--text-primary)]">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-body-sm text-[color:var(--text-secondary)]">
          {post.excerpt}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <Meta post={post} />
          <ArrowRight
            aria-hidden
            className="h-4 w-4 text-[color:var(--text-tertiary)] transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-[color:var(--text-primary)]"
          />
        </div>
      </div>
    </Link>
  );
}

function PostGrid({ items }: { items: PostItem[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((post) => (
        <li key={post.slug}>
          <PostCard post={post} />
        </li>
      ))}
    </ul>
  );
}

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-6 flex items-baseline justify-between gap-4">
      <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
        {title}
      </h2>
      <span className="text-[13px] tabular-nums text-[color:var(--text-tertiary)]">
        {count} {count === 1 ? "guide" : "guides"}
      </span>
    </div>
  );
}

const PAGE_SIZE = 9;

function BlogIndex() {
  const [category, setCategory] = useState<string>("all");
  const sorted = getPostsByDate();

  const categoryCounts = useMemo(
    () =>
      Array.from(
        posts.reduce(
          (acc, p) => acc.set(p.category, (acc.get(p.category) ?? 0) + 1),
          new Map<string, number>(),
        ),
      ).sort((a, b) => b[1] - a[1]),
    [],
  );

  const filters = useMemo(() => {
    const all = { id: "all" as const, label: "All", count: posts.length };
    const cats = categoryCounts.map(([cat, count]) => ({
      id: cat,
      label: cat,
      count,
    }));
    return [all, ...cats] as Array<{ id: string; label: string; count: number }>;
  }, [categoryCounts]);

  // One date-ordered list (getPostsByDate) per filter. The newest post is
  // featured on the first page; the rest are paged, PAGE_SIZE at a time.
  const list = category === "all" ? sorted : sorted.filter((p) => p.category === category);
  const [featured, ...rest] = list;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = rest.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const gridRef = useRef<HTMLElement>(null);
  const goToPage = (next: number) => {
    setPage(next);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const chip = (f: { id: string; label: string; count: number }) => {
    const active = category === f.id;
    return (
      <button
        key={f.id}
        type="button"
        aria-pressed={active}
        data-active={active ? "true" : undefined}
        onClick={() => {
          setCategory(f.id);
          setPage(1);
        }}
        className={cn(
          "inline-flex min-h-11 shrink-0 snap-start items-center gap-1.5 rounded-full border px-4 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] sm:min-h-10",
          active
            ? "border-[color:var(--text-primary)] bg-[color:var(--text-primary)] text-[color:var(--bg)]"
            : "border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]",
        )}
      >
        {f.label}
        <span
          className={cn(
            "text-[12px] tabular-nums",
            active ? "text-[color:var(--bg)]/70" : "text-[color:var(--text-tertiary)]",
          )}
        >
          {f.count}
        </span>
      </button>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-20 pt-12 sm:px-6 lg:pb-28 lg:pt-20">
        <PageHero
          eyebrow="Blog"
          title="Field notes for"
          accent="better images."
          lede="Guides for writing better image prompts, from people who ship prompts every day."
        />

        <nav aria-label="Categories" className="mt-10 lg:mt-12">
          <ScrollRow
            className="-mx-4 sm:-mx-6 lg:hidden"
            innerClassName="gap-2 px-4 sm:px-6"
            activeKey={category}
            ariaLabel="Categories"
          >
            {filters.map(chip)}
          </ScrollRow>
          <div className="hidden flex-wrap gap-2 lg:flex">{filters.map(chip)}</div>
        </nav>

        <div className="mt-8 lg:mt-10">
          {!featured ? (
            <p className="surface-card p-10 text-center text-body-md text-[color:var(--text-secondary)]">
              No guides in this category yet.
            </p>
          ) : (
            <>
              {currentPage === 1 && <FeaturedPost post={featured} />}
              {rest.length > 0 && (
                <section
                  aria-label={category === "all" ? "All guides" : `${category} guides`}
                  className={cn("scroll-mt-24", currentPage === 1 && "mt-14")}
                  ref={gridRef}
                >
                  <SectionHeading
                    title={category === "all" ? "All guides" : category}
                    count={rest.length}
                  />
                  <PostGrid items={pageItems} />
                  {totalPages > 1 && (
                    <div className="mt-12">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={goToPage}
                      />
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
