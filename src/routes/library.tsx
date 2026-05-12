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
import { fetchLibrary, copyPrompt, openInImago } from "@/lib/library";
import { absoluteUrl } from "@/lib/site";
import { getRandomOgImage } from "@/lib/og-image";
import type { LibraryPrompt } from "@/types/library";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORY_GRADIENTS } from "@/data/examples";
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
});

export const Route = createFileRoute("/library")({
  validateSearch: zodValidator(searchSchema),
  // Load once, then keep the data fresh for 5 minutes. Going back to the
  // Library is now instant — TanStack Router serves the cached loader data
  // without re-fetching from Supabase.
  loader: async (): Promise<LibraryPrompt[]> => fetchLibrary(),
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  head: () => ({
    meta: [
      { title: "Prompt Library — Browse 500 Curated AI Image Prompts | Depikt" },
      {
        name: "description",
        content:
          "Turn any rough idea into a production-grade AI image prompt in seconds. Browse 500 curated prompts for posters, infographics, UI mockups, cinematic scenes, and more.",
      },
      {
        property: "og:title",
        content: "Prompt Library — Browse 500 Curated AI Image Prompts | Depikt",
      },
      {
        property: "og:description",
        content:
          "Turn any rough idea into a polished AI image prompt in seconds. Or browse 500 ready-to-use prompts across 10 categories.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: getRandomOgImage() },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Prompt Library — Browse 500 Curated AI Image Prompts | Depikt",
      },
      {
        name: "twitter:description",
        content:
          "Turn any rough idea into a polished AI image prompt in seconds. Or browse 500 ready-to-use prompts across 10 categories.",
      },
      { name: "twitter:image", content: getRandomOgImage() },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/library") }],
  }),
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
  const { page, view } = Route.useSearch();
  const navigate = useNavigate({ from: "/library" });
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All");
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
    if (page !== 1) navigate({ search: { page: 1, view } });
  };
  const setSearchInput = (v: string) => {
    setSearch(v);
    if (page !== 1) navigate({ search: { page: 1, view } });
  };

  const setView = (v: ViewTab) => {
    navigate({ search: { page: 1, view: v } });
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
  }, [prompts, activeCategory, debouncedSearch, view, favoriteIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  const goToPage = (p: number) => {
    const next = Math.max(1, Math.min(totalPages, p));
    navigate({ search: { page: next, view } });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <Header />

      {/*
        Hero zone — three tight blocks (headline → search → filters) so the
        grid starts above the fold on a 768px viewport. Headline is dominant,
        subline is supporting, Imago is a feature mention, not a pitch.
      */}
      <section className="border-b border-[color:var(--border-subtle)]">
        <div className="mx-auto max-w-[1400px] px-6 pt-6 pb-3 md:pt-14 md:pb-6">
          <h1 className="text-display-md text-[color:var(--text-primary)]">
            Curated prompt library for GPT Image 2.
          </h1>
          <p className="mt-2 hidden max-w-3xl text-body-lg text-[color:var(--text-secondary)] md:mt-3 md:block">
            500 sample prompts collected from across the web. Pick one that fits your
            vision, or use the Generator to craft your own from a rough idea.
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
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by mood, subject, or style…"
                aria-label="Search prompts"
                className="w-full rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] py-3 pl-11 pr-4 text-body-md text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15"
              />
            </div>
          )}
        </div>

        {/* Category chips — only for browse and favorites */}
        {view !== "history" && (
          <div className="mx-auto max-w-[1400px] px-6 pb-3 md:pb-5">
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`pill shrink-0 font-mono uppercase tracking-wider text-mono-sm transition-colors ${
                    activeCategory === c
                      ? "bg-[color:var(--accent)] text-[color:var(--bg-elevated)]"
                      : "border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-subtle)]"
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
        <section className="mx-auto max-w-[1400px] px-6 py-5 md:py-8">
          {/* Grid header */}
          <div className="mb-3 flex items-center justify-between gap-4 md:mb-5">
            <p className="text-[11px] text-[color:var(--text-tertiary)]">
              Images are sample outputs — your results will vary.
            </p>
            <Link
              to="/generate"
              className="pill inline-flex shrink-0 items-center gap-1.5 bg-[color:var(--accent)] text-[color:var(--bg-elevated)] hover:opacity-90"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Build your own
            </Link>
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
                  className="mt-4 text-mono-sm uppercase tracking-wider text-[color:var(--accent)] hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px">
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
      className={`inline-flex items-center gap-1.5 pb-3 text-body-sm font-medium transition-colors border-b-2 -mb-px ${
        active
          ? "border-[color:var(--accent)] text-[color:var(--text-primary)]"
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
    "inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-lg border text-body-sm font-medium transition-colors";
  const btnInactive =
    "border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-primary)]";
  const btnActive =
    "border-[color:var(--accent)] bg-[color:var(--accent)]/10 text-[color:var(--text-primary)] ring-1 ring-[color:var(--accent)]/30";
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
        )
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
  const gradient = CATEGORY_GRADIENTS[prompt.category] ?? CATEGORY_GRADIENTS["Open-Ended Creative"];

  return (
    <article
      onClick={onOpen}
      className="group relative flex cursor-pointer flex-col bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] transition-shadow hover:shadow-md-card"
    >
      {/* Star icon */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFavoriteLocal(`${prompt.source}-${prompt.id}`, prompt.source);
        }}
        className={`absolute top-3 right-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full transition-all ${
          prompt.thumbnail_url ? "bg-black/30 backdrop-blur-sm" : ""
        } ${
          isFavorited
            ? "text-[color:var(--accent-orange)] opacity-100"
            : "text-white opacity-0 group-hover:opacity-100 hover:text-[color:var(--accent-orange)]"
        }`}
        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        <Star className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
      </button>

      {/* Thumbnail */}
      {prompt.thumbnail_url ? (
        <div className="relative aspect-square w-full overflow-hidden">
          <img
            src={prompt.thumbnail_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      ) : (
        <div className="px-6 pt-6">
          <div className="h-2 w-12 rounded-sm" style={{ background: gradient }} aria-hidden />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4 pt-3">
        <h3 className="text-heading-sm text-[color:var(--text-primary)] line-clamp-2">{prompt.title}</h3>
        <p className="line-clamp-2 text-body-sm text-[color:var(--text-secondary)]">
          {prompt.prompt}
        </p>
        <span className="mt-auto flex items-center gap-1 pt-2 text-mono-sm uppercase tracking-wider text-[color:var(--accent)]">
          View prompt
          <ArrowRight className="h-3 w-3" />
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
      <section className="mx-auto max-w-[1400px] px-6 py-20 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--bg-subtle)] border border-[color:var(--border-subtle)]">
          <Clock className="h-4 w-4 text-[color:var(--text-tertiary)]" />
        </div>
        <p className="text-body-md text-[color:var(--text-tertiary)]">
          No history yet. Generate a prompt to get started.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="font-mono text-mono-sm uppercase tracking-wider text-[color:var(--text-tertiary)]">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px">
        {entries.map((entry) => (
          <article
            key={entry.id}
            className="group relative flex cursor-pointer flex-col gap-3 bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-6 transition-shadow hover:shadow-md-card"
            onClick={() => handleRestore(entry)}
          >
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-[10px] tracking-[0.08em] uppercase font-semibold ${
                  entry.kind === "critique"
                    ? "text-[color:var(--accent)]"
                    : "text-[color:var(--accent-orange)]"
                }`}
              >
                {entry.kind === "critique" ? "CRITIQUE" : "GENERATE"}
              </span>
              {typeof entry.result.category === "string" && (
                <>
                  <span className="text-[color:var(--text-tertiary)]">·</span>
                  <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[color:var(--text-secondary)] truncate">
                    {entry.result.category}
                  </span>
                </>
              )}
            </div>
            <p className="line-clamp-2 text-body-sm text-[color:var(--text-primary)]">
              {entry.roughIdea}
            </p>
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="font-mono text-[10px] text-[color:var(--text-tertiary)]">
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-[color:var(--bg-elevated)]">
        <DialogHeader>
          <p className="eyebrow text-[color:var(--text-tertiary)]">{prompt.category}</p>
          <DialogTitle className="text-display-md text-[color:var(--text-primary)]">
            {prompt.title}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6">
          <pre
            className="overflow-x-auto whitespace-pre-wrap rounded-md p-4 font-mono text-mono-sm text-[color:var(--text-primary)]"
            style={{ background: "var(--code-bg)" }}
          >
            {prompt.prompt}
          </pre>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/generate"
            search={{ prefill: prompt.user_input || prompt.prompt, remixRef: prompt.prompt }}
            className="pill flex items-center gap-2 bg-[color:var(--accent)] text-[color:var(--bg-elevated)] hover:opacity-90"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Remix in generator
          </Link>
          <button
            onClick={() => openInImago(prompt.prompt)}
            className="pill flex items-center gap-2 border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)]"
          >
            Open in Imago
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => copyPrompt(prompt.prompt)}
            className="pill flex items-center gap-2 border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)]"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </button>
        </div>
        <p className="mt-2 text-[11px] text-[color:var(--text-tertiary)]">
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
          <div className="mt-8 border-t border-[color:var(--border-subtle)] pt-6">
            <p className="eyebrow mb-2 text-[color:var(--text-tertiary)]">Why it works</p>
            <p className="text-body-md text-[color:var(--text-secondary)]">{prompt.why_it_works}</p>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
