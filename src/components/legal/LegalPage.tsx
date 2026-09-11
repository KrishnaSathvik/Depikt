import { useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { renderMarkdown } from "@/lib/markdown";
import { LEGAL_LAST_UPDATED, formatEffectiveDate } from "@/data/legal";

/**
 * The shared shell for Privacy and Terms: eyebrow/title/intro/effective
 * date, then a sticky left table of contents (desktop only -- headings come
 * straight from renderMarkdown's own ## scan, so the TOC can never drift
 * from the actual section list) beside the readable prose column. Pricing
 * and Help don't use this: they're a selling page and a support surface,
 * not trust/legal documents, so they keep their own layouts -- shared
 * typography/spacing/chrome, not a forced identical template.
 */
export function LegalPage({
  eyebrow,
  title,
  intro,
  md,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  md: string;
}) {
  const { nodes, headings } = useMemo(() => renderMarkdown(md), [md]);
  const toc = headings.filter((h) => h.level === 2);

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-12 sm:px-6 sm:py-20 lg:px-12">
        <div className="max-w-[760px]">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 text-display-md">{title}</h1>
          <p className="mt-4 text-body-lg text-[color:var(--text-secondary)]">{intro}</p>
          <p className="mt-3 text-body-sm text-[color:var(--text-tertiary)]">
            Effective {formatEffectiveDate(LEGAL_LAST_UPDATED)}
          </p>
        </div>

        {/* No items-start: the nav column must stretch to the content
            column's full height (the default cross-axis stretch), or its
            sticky child has nowhere to travel and disappears as soon as
            the (short) TOC's own box scrolls past. */}
        <div className="mt-14 lg:flex lg:gap-16">
          {toc.length > 0 && (
            <nav aria-label="On this page" className="hidden lg:block lg:w-[220px] lg:shrink-0">
              <div className="sticky top-24">
                <p className="eyebrow">On this page</p>
                <ul className="mt-4 space-y-2.5">
                  {toc.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className="block text-body-sm text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          )}
          <div className="prose-content min-w-0 max-w-[760px] flex-1">{nodes}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
