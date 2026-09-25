import { useGalleryReference } from "@/hooks/use-gallery-reference";
import { createFileRoute, Link, useNavigate, stripSearchParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Star, X } from "lucide-react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { Header } from "@/components/Header";
import { Pagination } from "@/components/Pagination";
import { ScrollRow } from "@/components/ScrollRow";
import { LibraryCard } from "@/components/library/LibraryCard";
import { TemplatesBrowser } from "@/components/library/TemplatesBrowser";
import { GalleryBrowser } from "@/components/library/GalleryBrowser";
import { PromptDetailDialog } from "@/components/library/PromptDetailDialog";
import { activeTemplates, type Template } from "@/data/templates";
import { GALLERY_IMAGES } from "@/data/gallery-images";
import { fetchLibrary } from "@/lib/library";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import { pageSeoHead } from "@/lib/seo";
import { ROUTES, SEO, TOOL } from "@/lib/product";
import { useFavoriteIds } from "@/lib/favorites";
import {
  BROWSE_CATEGORIES,
  buildBrowseEntries,
  availableBrowseCategories,
  filterBrowseEntries,
  type BrowseEntry,
  type BrowseType,
  type BrowseCategory,
} from "@/lib/library-browse";
import { saveGenerationHandoff } from "@/lib/generation/handoff";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import type { LibraryPrompt } from "@/types/library";
import { useOwnedLibrary } from "@/hooks/use-owned-library";

const PAGE_SIZE = 12;
interface LibrarySearch {
  tab: Exclude<BrowseType, "all">;
  page: number;
  q: string;
  category: BrowseCategory;
  collection: "all" | "gpt-image-2" | "gpt-image-2.5";
  favorites: boolean;
}
const searchSchema: z.ZodType<LibrarySearch> = z.object({
  tab: z.enum(["prompts", "templates", "gallery"]).catch("prompts").default("prompts"),
  page: z.number().int().min(1).catch(1).default(1),
  q: z.string().max(400).catch("").default(""),
  category: z.enum(BROWSE_CATEGORIES).catch("All").default("All"),
  collection: z.enum(["all", "gpt-image-2", "gpt-image-2.5"]).catch("all").default("all"),
  favorites: z.boolean().catch(false).default(false),
});

export const Route = createFileRoute("/library")({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [
      stripSearchParams({
        tab: "prompts",
        page: 1,
        q: "",
        category: "All",
        collection: "all",
        favorites: false,
      }),
    ],
  },
  loader: async (): Promise<LibraryPrompt[]> => fetchLibrary(),
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  head: ({ match }) => {
    const tab: LibrarySearch["tab"] = match.search.tab;
    const page =
      tab === "templates" ? SEO.templates : tab === "gallery" ? SEO.gallery : SEO.library;
    const url = tab === "prompts" ? absoluteUrl("/library") : absoluteUrl(`/library?tab=${tab}`);
    const { meta, links } = pageSeoHead(page, {
      url,
      image: getOgImageForPath(tab === "templates" || tab === "gallery" ? tab : "library"),
    });
    return {
      meta,
      links,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Depikt Library",
            url,
            description: page.description,
          }),
        },
      ],
    };
  },
  component: LibraryPage,
});

function LibraryPage() {
  const publicPrompts = Route.useLoaderData();
  const owned = useOwnedLibrary();
  const prompts = useMemo(
    () => [...new Map([...publicPrompts, ...owned.prompts].map((p) => [p.id, p])).values()],
    [publicPrompts, owned.prompts],
  );
  const search = searchSchema.parse(Route.useSearch());
  const navigate = useNavigate({ from: "/library" });
  const [selectedPrompt, setSelectedPrompt] = useState<LibraryPrompt | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const favoriteIds = useFavoriteIds();
  const { attach, attaching } = useGalleryReference();
  const entries = useMemo(
    () => buildBrowseEntries(prompts, activeTemplates, GALLERY_IMAGES),
    [prompts],
  );
  const categories = useMemo(
    () => availableBrowseCategories(entries, search.tab),
    [entries, search.tab],
  );
  const activeCategory = categories.includes(search.category) ? search.category : "All";
  const filtered = filterBrowseEntries(
    entries,
    { ...search, category: activeCategory },
    favoriteIds,
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(search.page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const update = (patch: Partial<LibrarySearch>, replace = false) =>
    void navigate({
      search: { ...search, category: activeCategory, page: 1, ...patch },
      replace,
      resetScroll: false,
    });
  const open = (entry: BrowseEntry) => {
    setTrigger(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    if (entry.type === "prompts") setSelectedPrompt(entry.prompt);
    else if (entry.type === "templates") setSelectedTemplate(entry.template);
    else setSelectedReference(entry.filename);
  };
  const handleUseEntry = (entry: BrowseEntry) => {
    if (entry.type === "gallery") {
      void attach(entry.filename);
      return;
    }
    if (entry.type !== "prompts") {
      open(entry);
      return;
    }
    if (!isNativeGenerationEnabled()) {
      void navigate({
        to: "/",
        search: { mode: "build", prefill: entry.prompt.prompt },
        hash: "create",
      });
      return;
    }
    saveGenerationHandoff({
      prompt: entry.prompt.prompt,
      references: [],
      sourceType: "library",
      sourceId: entry.prompt.id,
      routingHints: { category: entry.prompt.category },
    });
    void navigate({ to: ROUTES.legacyBuilder });
  };
  const activeFilters =
    search.category !== "All" || search.collection !== "all" || search.favorites || !!search.q;

  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-12">
        <p className="eyebrow">{TOOL.library}</p>
        <h1 className="mt-2 text-heading-xl sm:text-display-md">Find a starting point.</h1>
        <p className="mt-2 text-body-md text-[color:var(--text-secondary)]">
          Prompts, templates, and references for your next creation.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Library sections" className="flex gap-1.5">
            {(["prompts", "templates", "gallery"] as const).map((tab) => (
              <Link
                key={tab}
                to="/library"
                search={{
                  ...search,
                  tab,
                  category: "All",
                  collection: tab === "prompts" ? search.collection : "all",
                  page: 1,
                }}
                resetScroll={false}
                aria-current={search.tab === tab ? "page" : undefined}
                className={`pill ${search.tab === tab ? "pill-solid" : ""}`}
              >
                {tab[0].toUpperCase() + tab.slice(1)}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => update({ favorites: !search.favorites })}
            aria-pressed={search.favorites}
            className={`pill inline-flex gap-1.5 ${search.favorites ? "pill-solid" : ""}`}
          >
            <Star className={`h-3.5 w-3.5 ${search.favorites ? "fill-current" : ""}`} />
            Favorites{favoriteIds.size > 0 ? ` (${favoriteIds.size})` : ""}
          </button>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]" />
          <input
            type="search"
            maxLength={400}
            value={search.q}
            onChange={(e) => update({ q: e.target.value }, true)}
            aria-label={`Search ${search.tab === "gallery" ? "references" : search.tab}`}
            placeholder={`Search ${search.tab === "gallery" ? "references" : search.tab}...`}
            className="h-11 w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg)] pl-11 pr-4 text-body-md focus-visible:outline-offset-2"
          />
        </div>
        {owned.error && (
          <p role="status" className="mt-3 text-body-sm">
            Your saved prompts could not be loaded. Public Library content is still available.
          </p>
        )}
        {categories.length > 1 && (
          <div className="mt-3 flex items-center gap-3 border-b border-[color:var(--border-subtle)] pb-3">
            <ScrollRow
              ariaLabel="Categories"
              activeKey={activeCategory}
              className="min-w-0 flex-1"
              innerClassName="gap-1.5"
            >
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => update({ category })}
                  aria-pressed={activeCategory === category}
                  className={`shrink-0 rounded-md px-3 py-2 text-body-sm ${activeCategory === category ? "bg-[color:var(--bg-subtle)] font-medium" : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"}`}
                >
                  {category}
                </button>
              ))}
            </ScrollRow>
          </div>
        )}
        <div className="my-4 flex min-h-6 items-center justify-between gap-3 text-body-sm text-[color:var(--text-tertiary)]">
          <p aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "starting point" : "starting points"}
            {search.collection !== "all"
              ? ` · ${search.collection === "gpt-image-2" ? "GPT Image 2" : "Images 2.5"}`
              : ""}
          </p>
          {activeFilters && (
            <button
              type="button"
              onClick={() =>
                update({ q: "", category: "All", collection: "all", favorites: false })
              }
              className="inline-flex items-center gap-1 hover:text-[color:var(--text-primary)]"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}
        </div>
        {pageItems.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pageItems.map((entry) => (
              <LibraryCard
                key={entry.key}
                entry={entry}
                busy={entry.type === "gallery" && attaching}
                isFavorited={favoriteIds.has(entry.key)}
                onOpen={() => open(entry)}
                onUse={() => handleUseEntry(entry)}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-body-md">
              {search.favorites
                ? "No favorites match this view."
                : "No starting points match your search."}
            </p>
            <p className="mt-2 text-body-sm text-[color:var(--text-secondary)]">
              Try another content type or clear your filters.
            </p>
          </div>
        )}
        {totalPages > 1 && (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={(page) => {
              update({ page });
              document.querySelector("main")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        )}
      </main>
      <PromptDetailDialog
        prompt={prompts.find((p) => p.id === selectedPrompt?.id) ?? null}
        onClose={() => setSelectedPrompt(null)}
      />
      <TemplatesBrowser
        selected={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        trigger={trigger}
      />
      <GalleryBrowser selected={selectedReference} onClose={() => setSelectedReference(null)} />
    </div>
  );
}
