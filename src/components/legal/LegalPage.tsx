import { useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { ContactCard, DocsLayout, SidebarCard } from "@/components/DocsLayout";
import { renderMarkdown } from "@/lib/markdown";
import { LEGAL_LAST_UPDATED, formatEffectiveDate } from "@/data/legal";

/**
 * The shared shell for Privacy and Terms: hero with the effective date, then
 * the DocsLayout used by Help — a sticky contents card (headings come from
 * renderMarkdown's own ## scan, so it can never drift from the sections) and
 * a contact card beside the document card. On phones the contents fold into
 * a <details> card above the document.
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
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-20 pt-12 sm:px-6 sm:pt-20 lg:pb-28">
        <PageHero
          eyebrow={eyebrow}
          title={title}
          lede={intro}
          actions={
            <p className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-3.5 py-1.5 text-[13px] font-medium text-[color:var(--text-secondary)]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[color:var(--success)]" />
              Effective {formatEffectiveDate(LEGAL_LAST_UPDATED)}
            </p>
          }
        />

        <DocsLayout
          sidebar={
            <>
              {toc.length > 0 && (
                <SidebarCard label="On this page">
                  <ol>
                    {toc.map((h, i) => (
                      <li key={h.id}>
                        <a
                          href={`#${h.id}`}
                          className="flex min-h-11 items-center gap-2.5 rounded-xl px-2 text-[13px] leading-snug text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-primary)] lg:min-h-9"
                        >
                          <span className="w-5 shrink-0 tabular-nums text-[color:var(--text-quaternary)]">
                            {i + 1}
                          </span>
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </SidebarCard>
              )}
              <ContactCard />
            </>
          }
        >
          {toc.length > 0 && (
            <details className="surface-card mb-6 p-4 lg:hidden">
              <summary className="flex min-h-11 cursor-pointer items-center px-2 text-[14px] font-medium text-[color:var(--text-primary)]">
                On this page
              </summary>
              <ol className="mt-2">
                {toc.map((h, i) => (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      className="flex min-h-11 items-center gap-2.5 rounded-xl px-2 text-[13px] leading-snug text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-primary)] lg:min-h-9"
                    >
                      <span className="w-5 shrink-0 tabular-nums text-[color:var(--text-quaternary)]">
                        {i + 1}
                      </span>
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          )}
          <article className="surface-card px-6 py-8 sm:px-10 sm:py-12">
            <div className="prose-content max-w-[68ch] [&_h2]:scroll-mt-24 [&_h2]:border-t [&_h2]:border-[color:var(--border-subtle)] [&_h2]:pt-10 [&_h2:first-child]:border-0 [&_h2:first-child]:pt-0 [&_h2]:!text-[24px] sm:[&_h2]:!text-[26px]">
              {nodes}
            </div>
          </article>
          <div className="mt-6 lg:hidden">
            <ContactCard />
          </div>
        </DocsLayout>
      </main>
      <Footer />
    </div>
  );
}
