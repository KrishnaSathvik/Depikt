import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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

const PAGE_URL = absoluteUrl(ROUTES.help);

export const Route = createFileRoute("/help")({
  head: () => {
    const ogImage = getOgImageForPath("home");
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
      meta: [
        { title: SEO.help.title },
        { name: "description", content: SEO.help.description },
        { property: "og:title", content: SEO.help.title },
        { property: "og:description", content: SEO.help.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: PAGE_URL },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: SEO.help.title },
        { name: "twitter:description", content: SEO.help.description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: PAGE_URL }],
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
function HelpPage() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterSections(HELP_SECTIONS, query), [query]);
  const searching = query.trim().length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-[800px] flex-1 px-4 py-12 sm:px-6 sm:py-20">
        <p className="eyebrow">Help</p>
        <h1 className="mt-3 text-display-md">How Depikt works.</h1>
        <p className="mt-4 text-body-lg text-[color:var(--text-secondary)]">
          Answers about creating images, credits, references, billing, and your account.
        </p>

        <div className="relative mt-8 max-w-md">
          <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help…"
            aria-label="Search help"
            className="w-full border-0 border-b border-[color:var(--border-default)] bg-transparent py-2.5 pl-7 pr-4 text-body-md text-[color:var(--text-primary)] placeholder:text-[color:var(--text-quaternary)] focus:border-[color:var(--text-primary)] focus:outline-none rounded-none"
          />
        </div>

        {!searching && (
          <nav aria-label="Help categories" className="mt-8 grid grid-cols-2 gap-3">
            {HELP_SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-lg border border-[color:var(--border-subtle)] px-4 py-3.5 transition-colors hover:border-[color:var(--border-default)]"
              >
                <p className="text-body-md font-medium text-[color:var(--text-primary)]">
                  {s.title}
                </p>
                <p className="mt-0.5 text-body-sm text-[color:var(--text-tertiary)]">
                  {s.items.length} {s.items.length === 1 ? "article" : "articles"}
                </p>
              </a>
            ))}
          </nav>
        )}

        {filtered.length === 0 ? (
          <p className="mt-14 text-body-sm text-[color:var(--text-tertiary)]">
            No results for "{query}".
          </p>
        ) : (
          filtered.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="mt-14 scroll-mt-24 border-t border-[color:var(--border-subtle)] pt-8"
            >
              <h2 className="text-heading-md">{section.title}</h2>
              <Accordion type="multiple" className="mt-4">
                {section.items.map((item) => (
                  <AccordionItem
                    key={item.q}
                    value={item.q}
                    className="border-[color:var(--border-subtle)]"
                  >
                    <AccordionTrigger className="text-body-md font-medium text-[color:var(--text-primary)] hover:no-underline py-4">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-body-md leading-relaxed text-[color:var(--text-secondary)]">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))
        )}
      </main>
      <Footer />
    </div>
  );
}
