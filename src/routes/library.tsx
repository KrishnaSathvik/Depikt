import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Wand2 } from "lucide-react";

import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { fetchLibrary } from "@/lib/library";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import { JSONLD_DESCRIPTIONS, JSONLD_NAMES, LIBRARY_COPY, MCP, SEO, TOOL } from "@/lib/product";
import {
  TARGET_MODEL_LABELS,
  availableCollections,
  normalizeTargetModel,
  shouldShowCollectionFilter,
  type TargetModel,
} from "@/lib/target-model";

const LIBRARY_URL = absoluteUrl("/library");
import type { LibraryPrompt } from "@/types/library";
import { useFavoriteIds } from "@/lib/favorites";
import { PromptCard } from "@/components/library/PromptCard";
import { PromptDetailDialog } from "@/components/library/PromptDetailDialog";

const PAGE_SIZE = 12;

const searchSchema = z.object({
  page: fallback(z.number().int().min(1), 1).default(1),
  // Collection filter lives in the URL so the homepage can deep-link to Images 2.5.
  collection: fallback(z.enum(["all", "gpt-image-2", "gpt-image-2.5"]), "all").default("all"),
});

export const Route = createFileRoute("/library")({
  validateSearch: zodValidator(searchSchema),
  // Load once, then keep the data fresh for 5 minutes. Going back to the
  // Library is now instant — TanStack Router serves the cached loader data
  // without re-fetching from Supabase.
  loader: async (): Promise<LibraryPrompt[]> => fetchLibrary(),
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  head: () => {
    const LIBRARY_OG_IMAGE = getOgImageForPath("library");
    return {
      meta: [
        { title: SEO.library.title },
        { name: "description", content: SEO.library.description },
        { property: "og:title", content: SEO.library.title },
        { property: "og:description", content: SEO.library.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: LIBRARY_URL },
        { property: "og:image", content: LIBRARY_OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: SEO.library.title },
        { name: "twitter:description", content: SEO.library.description },
        { name: "twitter:image", content: LIBRARY_OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: LIBRARY_URL }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: JSONLD_NAMES.library,
            url: LIBRARY_URL,
            description: JSONLD_DESCRIPTIONS.library,
          }),
        },
      ],
    };
  },
  component: HomePage,
});

const CATEGORIES = [
  "All",
  "Posters",
  "Infographics",
  "UI Mockups",
  "Social Posts",
  "Cinematic",
  "Storyboards",
  "Interior/Food/Fashion",
  "Visual Summaries",
  "Image Edits",
  "Open-Ended Creative",
] as const;

type CategoryFilter = (typeof CATEGORIES)[number];

function HomePage() {
  // Loader-provided data — always populated, never blocks paint after first load.
  const prompts = Route.useLoaderData();
  const { page, collection } = Route.useSearch();
  const navigate = useNavigate({ from: "/library" });
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All");
  // Collection (target model) filter. Rendered only once more than one
  // collection actually has prompts, so there is never an empty Images 2.5 tab.
  const collections = useMemo(() => availableCollections(prompts), [prompts]);
  const showCollections = shouldShowCollectionFilter(prompts);
  // A collection that has no rows falls back to "all" so the URL can never show an empty list.
  const activeCollection: TargetModel | "all" =
    showCollections && collections.some((c) => c.value === collection) ? collection : "all";
  const setActiveCollection = (c: TargetModel | "all") =>
    navigate({ search: { page: 1, collection: c } });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<LibraryPrompt | null>(null);

  // Favoriting a prompt from here still works (the star on each card) —
  // only the dedicated Favorites/History browsing views moved to Account
  // (Creations · Favorites · History · Profile · Plan & Credits).
  const favoriteIds = useFavoriteIds();

  // Reset to page 1 whenever the filter set changes.
  const setCategory = (c: CategoryFilter) => {
    setActiveCategory(c);
    if (page !== 1) navigate({ search: { page: 1, collection } });
  };
  const setSearchInput = (v: string) => {
    setSearch(v);
    if (page !== 1) navigate({ search: { page: 1, collection } });
  };

  // Debounce search 150ms to smooth keystrokes on slower devices.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 150);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => {
    let list: LibraryPrompt[] = prompts;

    if (activeCategory !== "All") {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (showCollections && activeCollection !== "all") {
      list = list.filter((p) => normalizeTargetModel(p.target_model) === activeCollection);
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.prompt.toLowerCase().includes(q) ||
          (p.user_input ?? "").toLowerCase().includes(q) ||
          (p.tags ?? []).some((t: string) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [prompts, activeCategory, activeCollection, showCollections, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  const goToPage = (p: number) => {
    const next = Math.max(1, Math.min(totalPages, p));
    navigate({ search: { page: next, collection } });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />

      {/*
        Hero zone — three tight blocks (headline → search → filters) so the
        grid starts above the fold on a 768px viewport. Headline is dominant,
        subline is supporting, Imago is a feature mention, not a pitch.
      */}
      <section className="border-b border-[color:var(--border-subtle)]">
        <div className="mx-auto max-w-[1400px] px-4 pt-8 pb-3 sm:px-6 md:pt-14 md:pb-6 lg:px-12">
          <p className="eyebrow">{TOOL.library}</p>
          <h1 className="mt-4 max-w-[22ch] text-display-md md:text-display-lg text-[color:var(--text-primary)]">
            {LIBRARY_COPY.headline}
          </h1>
          <p className="mt-3 max-w-[60ch] text-body-lg text-[color:var(--text-secondary)]">
            {LIBRARY_COPY.subline}
          </p>
          <p className="mt-2 text-body-sm font-medium text-[color:var(--text-tertiary)]">
            {LIBRARY_COPY.collections}
          </p>
          <p className="mt-1 text-body-sm text-[color:var(--text-tertiary)]">
            {MCP.libraryNote}{" "}
            <Link
              to={MCP.pagePath}
              className="font-medium text-[color:var(--text-secondary)] underline-offset-4 hover:underline"
            >
              {MCP.libraryLink} →
            </Link>
          </p>

          {/* Search */}
          <div className="relative mt-4 max-w-2xl md:mt-7">
            <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by mood, subject, or style…"
              aria-label="Search prompts"
              className="w-full border-0 border-b border-[color:var(--border-default)] bg-transparent py-3 pl-7 pr-4 text-body-lg text-[color:var(--text-primary)] placeholder:text-[color:var(--text-quaternary)] focus:border-[color:var(--text-primary)] focus:outline-none focus-visible:outline-none rounded-none"
            />
          </div>
        </div>

        {/* Collection chips — only once a second collection exists */}
        {showCollections && (
          <div className="mx-auto max-w-[1400px] px-4 pb-2 sm:px-6 lg:px-12">
            <div
              role="group"
              aria-label="Collection"
              className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {collections.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setActiveCollection(c.value)}
                  aria-pressed={activeCollection === c.value}
                  className={`pill shrink-0 ${
                    activeCollection === c.value
                      ? "pill-solid"
                      : "hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
                  }`}
                >
                  {c.label} · {c.count}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category chips */}
        <div className="mx-auto max-w-[1400px] px-4 pb-4 sm:px-6 md:pb-6 lg:px-12">
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                aria-pressed={activeCategory === c}
                className={`pill shrink-0 ${
                  activeCategory === c
                    ? "pill-solid"
                    : "hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6 md:py-8 lg:px-12">
        {/* Grid header */}
        <div className="mb-4 flex items-center justify-between gap-4 md:mb-6">
          <p className="text-[13px] text-[color:var(--text-tertiary)]">
            {filtered.length} prompts · thumbnails are sample outputs
            {activeCollection !== "all" && ` from ${TARGET_MODEL_LABELS[activeCollection]}`}
          </p>
          <Button asChild size="sm" className="shrink-0">
            <Link to="/prompt" search={{ mode: "build" as const }}>
              <Wand2 className="h-3.5 w-3.5" />
              Build your own
            </Link>
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-body-md text-[color:var(--text-tertiary)]">
              No prompts match those filters.
            </p>
            {(activeCategory !== "All" || search) && (
              <button
                onClick={() => {
                  setActiveCategory("All");
                  setSearch("");
                  if (page !== 1) navigate({ search: { page: 1, collection } });
                }}
                className="mt-4 text-body-sm font-medium text-[color:var(--text-primary)] underline underline-offset-4"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-px border border-[color:var(--border-subtle)] bg-[color:var(--border-subtle)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pageItems.map((p: LibraryPrompt) => (
                <PromptCard
                  key={`${p.source}-${p.id}`}
                  prompt={p}
                  onOpen={() => setSelected(p)}
                  isFavorited={favoriteIds.has(`${p.source}-${p.id}`)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={goToPage} />
            )}
          </>
        )}
      </section>

      <PromptDetailDialog prompt={selected} onClose={() => setSelected(null)} />
      <Footer />
    </div>
  );
}
