import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { templates } from "@/data/templates";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";

const PAGE_TITLE = "Prompt Templates — One question, one citable prompt | Depikt";
const PAGE_DESCRIPTION =
  "A growing index of one-question, one-prompt templates for GPT Image 2. Each template answers a specific question (\"What's a prompt for a 3-panel storyboard?\") with a single copy-paste prompt.";
const PAGE_URL = absoluteUrl("/templates");

export const Route = createFileRoute("/templates/")({
  head: () => {
    const ogImage = getOgImageForPath();
    const collectionJsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Depikt Prompt Templates",
      description: PAGE_DESCRIPTION,
      url: PAGE_URL,
      hasPart: templates.map((r) => ({
        "@type": "HowTo",
        name: r.question,
        description: r.short_answer,
        url: `${PAGE_URL}/${r.slug}`,
      })),
    };
    return {
      meta: [
        { title: PAGE_TITLE },
        { name: "description", content: PAGE_DESCRIPTION },
        { property: "og:title", content: PAGE_TITLE },
        { property: "og:description", content: PAGE_DESCRIPTION },
        { property: "og:type", content: "website" },
        { property: "og:url", content: PAGE_URL },
        { property: "og:image", content: ogImage },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: PAGE_TITLE },
        { name: "twitter:description", content: PAGE_DESCRIPTION },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: PAGE_URL }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(collectionJsonLd) }],
    };
  },
  component: TemplatesIndex,
});

function TemplatesIndex() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto max-w-[1200px] px-6 lg:px-12 py-16">
        <header className="max-w-[60ch]">
          <p className="eyebrow">Prompt Templates</p>
          <h1 className="mt-4 text-display-lg text-[color:var(--text-primary)]">
            One question. One prompt. Ready to ship.
          </h1>
          <p className="mt-4 text-body-lg text-[color:var(--text-secondary)]">
            Every template answers one specific question with a single copy-paste prompt for GPT
            Image 2. Built so you (or ChatGPT, or Perplexity) can find the exact thing you're
            looking for and lift it verbatim.
          </p>
        </header>

        <section className="mt-12 grid gap-px bg-[color:var(--border-subtle)] border border-[color:var(--border-subtle)] sm:grid-cols-2">
          {templates.map((r) => (
            <Link
              key={r.slug}
              to="/templates/$slug"
              params={{ slug: r.slug }}
              className="group block bg-[color:var(--bg-elevated)] p-6 hover:bg-[color:var(--bg-subtle)] transition-colors"
            >
              <span className="font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[color:var(--text-tertiary)]">
                {r.category}
              </span>
              <h2 className="mt-3 text-heading-sm text-[color:var(--text-primary)] group-hover:underline underline-offset-4">
                {r.question}
              </h2>
              <p className="mt-2 text-body-sm text-[color:var(--text-secondary)] line-clamp-2">
                {r.short_answer}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-mono-sm text-[color:var(--text-tertiary)] group-hover:text-[color:var(--text-primary)] transition-colors">
                Read template <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </section>

        <aside className="mt-16 rounded-md border border-[color:var(--accent)] bg-[color:var(--accent)] px-8 py-8 sm:px-10 sm:py-10 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-white/80" />
          <h3 className="mt-3 text-heading-md text-white">Don't see your exact question?</h3>
          <p className="mt-2 text-body-sm text-white/70">
            The generator writes a template-style prompt from any rough idea in seconds.
          </p>
          <Link to="/generate" className="mt-5 inline-block">
            <button className="rounded-md bg-white px-5 py-2.5 text-body-sm font-medium text-[color:var(--accent)] hover:bg-[color:var(--bg-subtle)]">
              Open the generator
            </button>
          </Link>
        </aside>
      </main>
    </div>
  );
}
