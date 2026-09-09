import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  ExternalLink,
  Search,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  Trash2,
  Wand2,
} from "lucide-react";

import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { PromptSurface } from "@/components/PromptSurface";
import { SampleImage } from "@/components/SampleImage";
import { fetchLibrary, copyPrompt, openInImago } from "@/lib/library";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import {
  CTA,
  JSONLD_DESCRIPTIONS,
  JSONLD_NAMES,
  LIBRARY_COPY,
  MCP,
  SEO,
  TOOL,
  historyKindLabel,
} from "@/lib/product";
import {
  TARGET_MODEL_LABELS,
  availableCollections,
  normalizeTargetModel,
  shouldShowCollectionFilter,
  type TargetModel,
} from "@/lib/target-model";
import {
  SOURCE_TYPE_LABELS,
  STATUS_LABELS,
  normalizeSourceType,
  normalizeStatus,
} from "@/lib/library-metadata";

const LIBRARY_URL = absoluteUrl("/library");
import type { LibraryPrompt } from "@/types/library";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFavoriteIds, toggleFavoriteLocal } from "@/lib/favorites";
import {
  useHistory,
  removeHistoryEntry,
  clearAllHistory,
  formatRelativeTime,
} from "@/lib/history-db";
import { migrateLocalStorageHistory } from "@/lib/migrate-history";

const PAGE_SIZE = 12;

const searchSchema = z.object({
  page: fallback(z.number().int().min(1), 1).default(1),
  view: fallback(z.enum(["browse", "favorites", "history"]), "browse").default("browse"),
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

type ViewTab = "browse" | "favorites" | "history";

function HomePage() {
  // Loader-provided data — always populated, never blocks paint after first load.
  const prompts = Route.useLoaderData();
  const { page, view, collection } = Route.useSearch();
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
    navigate({ search: { page: 1, view, collection: c } });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<LibraryPrompt | null>(null);

  const favoriteIds = useFavoriteIds();
  const historyEntries = useHistory();

  // One-time migration from localStorage to IndexedDB
  useEffect(() => {
    migrateLocalStorageHistory();
  }, []);

  // Reset to page 1 whenever the filter set changes.
  const setCategory = (c: CategoryFilter) => {
    setActiveCategory(c);
    if (page !== 1) navigate({ search: { page: 1, view, collection } });
  };
  const setSearchInput = (v: string) => {
    setSearch(v);
    if (page !== 1) navigate({ search: { page: 1, view, collection } });
  };

  const setView = (v: ViewTab) => {
    navigate({ search: { page: 1, view: v, collection } });
    setActiveCategory("All");
    setSearch("");
  };

  // Debounce search 150ms to smooth keystrokes on slower devices.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 150);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => {
    // Choose base list: full library or favorites-only
    let list: LibraryPrompt[] =
      view === "favorites"
        ? prompts.filter((p: LibraryPrompt) => favoriteIds.has(`${p.source}-${p.id}`))
        : prompts;

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
  }, [
    prompts,
    activeCategory,
    activeCollection,
    showCollections,
    debouncedSearch,
    view,
    favoriteIds,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  const goToPage = (p: number) => {
    const next = Math.max(1, Math.min(totalPages, p));
    navigate({ search: { page: next, view, collection } });
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

          {/* View tabs */}
          <div className="mt-4 flex items-center gap-6 border-b border-[color:var(--border-subtle)] md:mt-7">
            <ViewTabButton active={view === "browse"} onClick={() => setView("browse")}>
              Browse
            </ViewTabButton>
            <ViewTabButton active={view === "favorites"} onClick={() => setView("favorites")}>
              <Star className="h-3.5 w-3.5" />
              Favorites
            </ViewTabButton>
            <ViewTabButton active={view === "history"} onClick={() => setView("history")}>
              <Clock className="h-3.5 w-3.5" />
              History
            </ViewTabButton>
          </div>

          {/* Search — only for browse and favorites */}
          {view !== "history" && (
            <div className="relative mt-3 max-w-2xl md:mt-5">
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
          )}
        </div>

        {/* Collection chips — only once a second collection exists */}
        {view !== "history" && showCollections && (
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

        {/* Category chips — only for browse and favorites */}
        {view !== "history" && (
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
        )}
      </section>

      {/* Content */}
      {view === "history" ? (
        <HistoryView entries={historyEntries} />
      ) : (
        <section className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6 md:py-8 lg:px-12">
          {/* Grid header */}
          <div className="mb-4 flex items-center justify-between gap-4 md:mb-6">
            <p className="text-[13px] text-[color:var(--text-tertiary)]">
              {filtered.length} prompts · thumbnails are sample outputs
              {activeCollection !== "all" && ` from ${TARGET_MODEL_LABELS[activeCollection]}`}
            </p>
            <Button asChild size="sm" className="shrink-0">
              <Link to="/generate">
                <Wand2 className="h-3.5 w-3.5" />
                Build your own
              </Link>
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-body-md text-[color:var(--text-tertiary)]">
                {view === "favorites"
                  ? "No favorites yet. Star prompts to save them here."
                  : "No prompts match those filters."}
              </p>
              {(activeCategory !== "All" || search) && (
                <button
                  onClick={() => {
                    setActiveCategory("All");
                    setSearch("");
                    if (page !== 1) navigate({ search: { page: 1, view } });
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
                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                />
              )}
            </>
          )}
        </section>
      )}

      <PromptDetailDialog prompt={selected} onClose={() => setSelected(null)} />
      <Footer />
    </div>
  );
}

function ViewTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 pb-3 text-body-sm font-medium transition-colors border-b -mb-px ${
        active
          ? "border-[color:var(--text-primary)] text-[color:var(--text-primary)]"
          : "border-transparent text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  // Build page numbers: 1, 2, ..., last  (with ellipsis when needed)
  const pages: (number | "ellipsis")[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    // Always show first page
    pages.push(1);

    if (currentPage > 3) {
      pages.push("ellipsis");
    }

    // Middle pages around current
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) {
      pages.push("ellipsis");
    }

    // Always show last page
    pages.push(totalPages);
  }

  const btnBase =
    "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border text-body-sm font-medium tabular-nums transition-colors";
  const btnInactive =
    "border-[color:var(--border-default)] bg-transparent text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]";
  const btnActive = "border-[color:var(--ink)] bg-[color:var(--ink)] text-[color:var(--ink-text)]";
  const btnDisabled = "cursor-not-allowed opacity-40";

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className={`${btnBase} px-3 gap-1 ${currentPage === 1 ? btnDisabled : btnInactive}`}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            className="inline-flex h-10 w-8 items-center justify-center text-[color:var(--text-tertiary)]"
          >
            &hellip;
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-label={`Page ${p}`}
            aria-current={p === currentPage ? "page" : undefined}
            className={`${btnBase} ${p === currentPage ? btnActive : btnInactive}`}
          >
            {p}
          </button>
        ),
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className={`${btnBase} px-3 gap-1 ${currentPage === totalPages ? btnDisabled : btnInactive}`}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

// ─── PromptCard ──────────────────────────────────────────────────────────────

function PromptCard({
  prompt,
  onOpen,
  isFavorited,
}: {
  prompt: LibraryPrompt;
  onOpen: () => void;
  isFavorited: boolean;
}) {
  return (
    <article
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View prompt: ${prompt.title}`}
      className="group relative flex cursor-pointer flex-col bg-[color:var(--bg-elevated)] transition-colors hover:bg-[color:var(--bg-muted)] focus-visible:z-10"
    >
      {/* Star icon */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFavoriteLocal(`${prompt.source}-${prompt.id}`, prompt.source);
        }}
        className={`absolute top-3 right-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full transition-all ${
          prompt.thumbnail_url ? "bg-black/40 backdrop-blur-sm" : "bg-[color:var(--bg-subtle)]"
        } ${
          isFavorited
            ? "text-[color:var(--accent-orange)] opacity-100"
            : "text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-[color:var(--accent-orange)]"
        }`}
        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        <Star className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
      </button>

      {/* Thumbnail */}
      {prompt.thumbnail_url ? (
        <div className="relative aspect-square w-full overflow-hidden bg-[color:var(--bg-subtle)]">
          {/* Square frame, whole image: landscape and portrait results are never cropped. */}
          <img
            src={prompt.thumbnail_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <div className="flex aspect-[3/1] items-end px-5 pt-5 sm:aspect-auto">
          <span className="text-[13px] font-medium text-[color:var(--text-tertiary)]">
            {prompt.category}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h2 className="text-heading-sm text-[color:var(--text-primary)] line-clamp-2">
          {prompt.title}
        </h2>
        <p className="line-clamp-2 text-body-sm text-[color:var(--text-secondary)]">
          {prompt.prompt}
        </p>
        <span className="mt-auto flex items-center gap-1 pt-3 text-body-sm font-medium text-[color:var(--text-primary)] underline-offset-4 group-hover:underline">
          View prompt
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </article>
  );
}

function HistoryView({ entries }: { entries: import("@/lib/db").HistoryRecord[] }) {
  const navigate = useNavigate();

  const handleRestore = (entry: import("@/lib/db").HistoryRecord) => {
    if (entry.kind === "critique") {
      navigate({ to: "/critique", search: { restore: entry.id } });
    } else {
      navigate({ to: "/generate", search: { restore: entry.id } });
    }
  };

  if (entries.length === 0) {
    return (
      <section className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-20 text-center sm:px-6 lg:px-12">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--bg-subtle)] border border-[color:var(--border-subtle)]">
          <Clock className="h-4 w-4 text-[color:var(--text-tertiary)]" />
        </div>
        <p className="text-body-md text-[color:var(--text-tertiary)]">
          No history yet. Build or critique a prompt to get started.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6 lg:px-12">
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-[13px] text-[color:var(--text-tertiary)]">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </p>
        <button
          onClick={() => {
            if (confirm("Clear all history? This can't be undone.")) clearAllHistory();
          }}
          className="inline-flex items-center gap-1.5 text-body-sm text-[color:var(--text-tertiary)] hover:text-[color:var(--error)] transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-1 gap-px border border-[color:var(--border-subtle)] bg-[color:var(--border-subtle)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {entries.map((entry) => (
          <article
            key={entry.id}
            className="group relative flex cursor-pointer flex-col gap-3 bg-[color:var(--bg-elevated)] p-6 transition-colors hover:bg-[color:var(--bg-muted)]"
            onClick={() => handleRestore(entry)}
          >
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-[color:var(--text-primary)]">
                {historyKindLabel(entry.kind)}
              </span>
              {typeof entry.result.category === "string" && (
                <>
                  <span className="text-[color:var(--text-tertiary)]">·</span>
                  <span className="truncate text-[13px] text-[color:var(--text-secondary)]">
                    {entry.result.category}
                  </span>
                </>
              )}
            </div>
            <p className="line-clamp-2 text-body-sm text-[color:var(--text-primary)]">
              {entry.roughIdea}
            </p>
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="text-[13px] text-[color:var(--text-tertiary)]">
                {formatRelativeTime(entry.createdAt)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeHistoryEntry(entry.id);
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-[color:var(--text-tertiary)] hover:text-[color:var(--error)] hover:bg-[color:var(--bg-subtle)] opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove from history"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PromptDetailDialog({
  prompt,
  onClose,
}: {
  prompt: LibraryPrompt | null;
  onClose: () => void;
}) {
  if (!prompt) return null;

  return (
    <Dialog open={!!prompt} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1rem)] max-w-4xl overflow-y-auto bg-[color:var(--bg-elevated)] p-0 sm:max-h-[90vh]">
        {/* 1. The sample output is the proof of the prompt, so it comes first. */}
        {prompt.thumbnail_url && (
          <SampleImage
            src={prompt.thumbnail_url}
            alt={`Sample output for ${prompt.title}`}
            maxHeightClass="max-h-[52vh] sm:max-h-[60vh]"
            className="border-b border-[color:var(--border-subtle)]"
          />
        )}
        <div className="p-6 sm:p-8">
          <DialogHeader className="pr-8">
            <p className="eyebrow">
              {prompt.category} · {TARGET_MODEL_LABELS[normalizeTargetModel(prompt.target_model)]}{" "}
              collection
              {normalizeStatus(prompt.status) !== "approved" &&
                ` · ${STATUS_LABELS[normalizeStatus(prompt.status)]}`}
            </p>
            <DialogTitle className="text-heading-lg text-[color:var(--text-primary)]">
              {prompt.title}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <PromptSurface label="Prompt">{prompt.prompt}</PromptSurface>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link
                to="/generate"
                search={{ prefill: prompt.user_input || prompt.prompt, remixRef: prompt.prompt }}
              >
                <Wand2 className="h-3.5 w-3.5" />
                {CTA.remix}
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => openInImago(prompt.prompt)}>
              Open in Imago
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => copyPrompt(prompt.prompt)}>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
          <p className="mt-2 text-[13px] text-[color:var(--text-tertiary)]">
            <span className="hidden sm:inline">
              Opens Imago with your prompt copied. Paste with{" "}
              <kbd className="px-1 py-0.5 rounded bg-[color:var(--bg-subtle)] border border-[color:var(--border-subtle)] font-mono text-[10px]">
                ⌘V
              </kbd>
            </span>
            <span className="sm:hidden">
              Opens Imago with your prompt copied. Long-press the text field and tap Paste.
            </span>
          </p>

          {prompt.why_it_works && (
            <div className="mt-6 border-t border-[color:var(--border-subtle)] pt-6">
              <p className="eyebrow mb-2">Why it works</p>
              <p className="text-body-md text-[color:var(--text-secondary)]">
                {prompt.why_it_works}
              </p>
            </div>
          )}

          {/* Provenance line: only Images 2.5 rows carry a source type other than the default. */}
          {normalizeTargetModel(prompt.target_model) === "gpt-image-2.5" && (
            <p className="mt-4 text-[13px] text-[color:var(--text-tertiary)]">
              {SOURCE_TYPE_LABELS[normalizeSourceType(prompt.source_type)]}
              {prompt.source_creator ? ` · ${prompt.source_creator}` : ""}
              {prompt.source_url ? (
                <>
                  {" · "}
                  <a
                    href={prompt.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    source
                  </a>
                </>
              ) : null}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
