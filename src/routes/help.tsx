import { renderMarkdown } from "@/lib/markdown";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CreditCard, ImageIcon, Rocket, Search, UserRound, X, type LucideIcon } from "lucide-react";
import { Header } from "@/components/Header";
import { ContactCard, DocsLayout, SidebarCard } from "@/components/DocsLayout";
import { ScrollRow } from "@/components/ScrollRow";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HELP_SECTIONS, type HelpSection } from "@/data/legal";
import { ROUTES, SEO } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import { pageSeoHead } from "@/lib/seo";

const PAGE_URL = absoluteUrl(ROUTES.help);

export const Route = createFileRoute("/help")({
  head: () => {
    const { meta, links } = pageSeoHead(SEO.help, {
      url: PAGE_URL,
      image: getOgImageForPath("help"),
    });
    const faqJsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: HELP_SECTIONS.flatMap((s) =>
        s.items.map((i) => ({
          "@type": "Question",
          name: i.q,
          acceptedAnswer: { "@type": "Answer", text: i.a },
        })),
      ),
    };
    return {
      meta,
      links,
      scripts: [{ type: "application/ld+json", children: JSON.stringify(faqJsonLd) }],
    };
  },
  component: HelpPage,
});

function filterSections(sections: ReadonlyArray<HelpSection>, query: string): HelpSection[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...sections];
  return sections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)),
    }))
    .filter((s) => s.items.length > 0);
}

/**
 * Self-service help. Deliberately not "Support": there is no human channel
 * yet, and this page never pretends there is one. A search box filters the
 * existing FAQ in the browser (no backend, no new dependency); category
 * cards are quick links into the same sections below, not separate routes.
 */
const SECTION_ICONS: Record<string, LucideIcon> = {
  "getting-started": Rocket,
  "images-and-references": ImageIcon,
  "plans-and-credits": CreditCard,
  "account-and-data": UserRound,
};

function HelpPage() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterSections(HELP_SECTIONS, query), [query]);
  const searching = query.trim().length > 0;
  const resultCount = filtered.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-20 pt-12 sm:px-6 sm:pt-20 lg:pb-28">
        <PageHero
          eyebrow="Help"
          title="How Depikt"
          accent="works."
          lede="Answers about creating images, credits, references, billing, and your account."
        />

        <div className="relative mt-10 max-w-[620px]">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[color:var(--text-tertiary)]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help…"
            aria-label="Search help"
            className="h-14 w-full rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] pl-14 pr-14 text-[16px] text-[color:var(--text-primary)] shadow-[0_14px_36px_-24px_rgba(17,17,17,0.35)] transition-[border-color,box-shadow] placeholder:text-[color:var(--text-quaternary)] focus:border-[color:var(--text-primary)] focus:shadow-[0_0_0_4px_rgba(17,17,17,0.06),0_14px_36px_-24px_rgba(17,17,17,0.35)] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[color:var(--text-tertiary)] transition-colors hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {searching && (
          <p aria-live="polite" className="mt-4 text-[13px] text-[color:var(--text-tertiary)]">
            {resultCount} {resultCount === 1 ? "answer" : "answers"} for “{query.trim()}”
          </p>
        )}

        {!searching && (
          <nav aria-label="Help topics" className="mt-8 lg:hidden">
            <ScrollRow ariaLabel="Help topics" innerClassName="gap-2 pb-1">
              {HELP_SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 text-[14px] font-medium text-[color:var(--text-secondary)]"
                >
                  {s.title}
                </a>
              ))}
            </ScrollRow>
          </nav>
        )}

        <DocsLayout
          sidebar={
            <>
              <SidebarCard label="Topics">
                <nav aria-label="Help topics">
                  {HELP_SECTIONS.map((s) => {
                    const Icon = SECTION_ICONS[s.id] ?? Rocket;
                    return (
                      <a
                        key={s.id}
                        href={`#${s.id}`}
                        className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-[14px] text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-primary)] lg:min-h-10"
                      >
                        <Icon aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                        <span className="flex-1">{s.title}</span>
                        <span className="text-[12px] tabular-nums text-[color:var(--text-quaternary)]">
                          {s.items.length}
                        </span>
                      </a>
                    );
                  })}
                </nav>
              </SidebarCard>
              <ContactCard />
            </>
          }
        >
          {filtered.length === 0 ? (
            <div className="surface-card p-10 text-center">
              <p className="text-body-md font-medium text-[color:var(--text-primary)]">
                No results for “{query.trim()}”.
              </p>
              <p className="mt-1 text-body-sm text-[color:var(--text-tertiary)]">
                Try a shorter word, like “credits” or “reference”.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filtered.map((section) => {
                const Icon = SECTION_ICONS[section.id] ?? Rocket;
                return (
                  <section
                    key={section.id}
                    id={section.id}
                    aria-labelledby={`${section.id}-title`}
                    className="surface-card scroll-mt-24 overflow-hidden"
                  >
                    <div className="flex items-center gap-3 border-b border-[color:var(--border-subtle)] px-5 py-4 sm:px-6">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--bg-subtle)]">
                        <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      </span>
                      <h2
                        id={`${section.id}-title`}
                        className="flex-1 text-[19px] font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]"
                      >
                        {section.title}
                      </h2>
                      <span className="text-[13px] tabular-nums text-[color:var(--text-tertiary)]">
                        {section.items.length}
                      </span>
                    </div>
                    <Accordion
                      type="multiple"
                      className="divide-y divide-[color:var(--border-subtle)]"
                    >
                      {section.items.map((item) => (
                        <AccordionItem
                          key={item.q}
                          value={item.q}
                          className="border-0 px-5 sm:px-6"
                        >
                          <AccordionTrigger className="min-h-14 gap-4 py-4 text-left text-[16px] font-medium leading-snug text-[color:var(--text-primary)] hover:no-underline">
                            {item.q}
                          </AccordionTrigger>
                          <AccordionContent className="pb-5 text-[16px] leading-relaxed text-[color:var(--text-secondary)] [&_p:first-child]:mt-0 [&_p]:my-3">
                            {renderMarkdown(item.a).nodes}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </section>
                );
              })}
              <div className="lg:hidden">
                <ContactCard />
              </div>
            </div>
          )}
        </DocsLayout>
      </main>
      <Footer />
    </div>
  );
}
