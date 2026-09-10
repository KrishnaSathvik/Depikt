import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScrollRow } from "@/components/ScrollRow";
import { Button } from "@/components/ui/button";
import { TemplateSetup } from "@/components/TemplateSetup";
import {
  COMPATIBILITY_NOTE,
  TEMPLATE_GROUPS,
  TEMPLATE_GROUP_BLURB,
  TEMPLATE_GROUP_LABEL,
  activeTemplates,
  type Template,
  type TemplateGroup,
} from "@/data/templates";
import {
  previewFieldLabels,
  saveTemplateValues,
  type TemplateValues,
} from "@/lib/template-context";
import { trackEvent } from "@/lib/analytics";
import { SEO, TOOL } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import { cn } from "@/lib/utils";

const PAGE_URL = absoluteUrl("/templates");

type Category = "all" | TemplateGroup;

export const Route = createFileRoute("/templates/")({
  head: () => {
    const ogImage = getOgImageForPath("templates");
    const collectionJsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Depikt Templates",
      description: SEO.templates.description,
      url: PAGE_URL,
      hasPart: activeTemplates.map((t) => ({
        "@type": "CreativeWork",
        name: t.title,
        description: t.description,
        url: PAGE_URL,
      })),
    };
    return {
      meta: [
        { title: SEO.templates.title },
        { name: "description", content: SEO.templates.description },
        { property: "og:title", content: SEO.templates.title },
        { property: "og:description", content: SEO.templates.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: PAGE_URL },
        { property: "og:image", content: ogImage },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: SEO.templates.title },
        { name: "twitter:description", content: SEO.templates.description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: PAGE_URL }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(collectionJsonLd) }],
    };
  },
  component: TemplatesIndex,
});

/**
 * Templates: choose a task, answer a few focused questions, continue in Prompt.
 * Cards only help the user choose; the questions live in the setup panel, so
 * the grid never changes shape. The answered values are stored client-side
 * and Prompt receives only the template slug in the URL.
 */
function TemplatesIndex() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category>("all");
  const [selected, setSelected] = useState<Template | null>(null);
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);

  const sorted = useMemo(
    () => activeTemplates.slice().sort((a, b) => a.sort_order - b.sort_order),
    [],
  );
  const visible = category === "all" ? sorted : sorted.filter((t) => t.group === category);

  const start = (template: Template, from: HTMLElement | null) => {
    setSelected(template);
    setTrigger(from);
    setOpen(true);
  };

  const continueInPrompt = (values: TemplateValues) => {
    if (!selected) return;
    saveTemplateValues(selected.slug, values);
    trackEvent("template_sent_to_prompt", { template: selected.slug });
    setOpen(false);
    navigate({ to: "/prompt", search: { mode: "build" as const, template: selected.slug } });
  };

  const categories: { id: Category; label: string; count: number }[] = [
    { id: "all", label: "All", count: sorted.length },
    ...TEMPLATE_GROUPS.map((g) => ({
      id: g as Category,
      label: TEMPLATE_GROUP_LABEL[g],
      count: sorted.filter((t) => t.group === g).length,
    })),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-10 sm:px-6 sm:py-16 lg:px-12">
        <header className="max-w-[62ch]">
          <p className="eyebrow">{TOOL.templates}</p>
          <h1 className="mt-4 text-display-md sm:text-display-lg text-[color:var(--text-primary)]">
            Choose what you want to make.
          </h1>
          <p className="mt-4 max-w-[56ch] text-body-lg text-[color:var(--text-secondary)]">
            Pick a template for the image task you have in mind. Answer a few focused questions,
            then continue in {TOOL.prompt} to build the final prompt.
          </p>
        </header>

        {/* Category filters: inline on desktop, one scrollable row on mobile. */}
        <ScrollRow
          as="div"
          ariaLabel="Template categories"
          activeKey={category}
          className="mt-10 -mx-4 px-4 sm:mx-0 sm:px-0"
          innerClassName="gap-2"
        >
          {categories.map((c) => {
            const active = c.id === category;
            return (
              <button
                key={c.id}
                type="button"
                data-key={c.id}
                aria-pressed={active}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "pill shrink-0",
                  active
                    ? "pill-solid"
                    : "hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]",
                )}
              >
                {c.label}
                <span
                  className={cn(
                    "tabular-nums",
                    active ? "opacity-70" : "text-[color:var(--text-quaternary)]",
                  )}
                >
                  {c.count}
                </span>
              </button>
            );
          })}
        </ScrollRow>

        <p
          className="mt-4 min-h-[1.5em] text-body-sm text-[color:var(--text-tertiary)]"
          aria-live="polite"
        >
          {category === "all"
            ? `${sorted.length} templates. Every one is a starting structure, not a finished prompt.`
            : TEMPLATE_GROUP_BLURB[category]}
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Templates">
          {visible.map((t) => (
            <li key={t.id} className="flex">
              <TemplateCard template={t} onStart={(from) => start(t, from)} />
            </li>
          ))}
        </ul>

        <aside className="mt-16 flex flex-col gap-4 border-t border-[color:var(--border-subtle)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-heading-sm text-[color:var(--text-primary)]">
              Looking for finished examples instead?
            </h2>
            <p className="mt-1 max-w-[52ch] text-body-sm text-[color:var(--text-secondary)]">
              Templates help you start with a structure. The {TOOL.library} shows complete prompts
              and the images they produced.
            </p>
          </div>
          <Button asChild variant="outline" className="min-h-11 shrink-0">
            <Link to="/library">
              Browse the {TOOL.library} <ArrowRight />
            </Link>
          </Button>
        </aside>
      </main>
      <Footer />

      <TemplateSetup
        template={selected}
        open={open}
        onOpenChange={setOpen}
        onContinue={continueInPrompt}
        returnFocusTo={trigger}
      />
    </div>
  );
}

function TemplateCard({
  template,
  onStart,
}: {
  template: Template;
  onStart: (from: HTMLElement | null) => void;
}) {
  const note = COMPATIBILITY_NOTE[template.compatibility];
  return (
    <article
      onClick={(e) => onStart(e.currentTarget.querySelector("button"))}
      className="group flex w-full cursor-pointer flex-col border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-6 transition-colors hover:bg-[color:var(--bg-muted)]"
      data-template={template.slug}
    >
      <h3 className="text-heading-sm text-[color:var(--text-primary)]">{template.title}</h3>
      <p className="mt-2 text-body-sm text-[color:var(--text-secondary)]">{template.description}</p>

      <p className="mt-5 text-[12px] font-medium text-[color:var(--text-tertiary)]">
        You'll define
      </p>
      <p className="mt-1 text-body-sm text-[color:var(--text-secondary)]">
        {previewFieldLabels(template).join(" · ")}
      </p>
      {note && <p className="mt-3 text-[12px] text-[color:var(--text-quaternary)]">{note}</p>}

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStart(e.currentTarget);
          }}
          className="inline-flex min-h-11 items-center gap-1.5 text-body-sm font-medium text-[color:var(--text-primary)] underline-offset-4 group-hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Start
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
          <span className="sr-only"> {template.title}</span>
        </button>
      </div>
    </article>
  );
}
