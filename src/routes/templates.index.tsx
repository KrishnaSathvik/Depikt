import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PromptSurface } from "@/components/PromptSurface";
import {
  COMPATIBILITY_NOTE,
  TEMPLATE_GROUPS,
  activeTemplates,
  buildTemplateStarter,
  getTemplatesByGroup,
  type Template,
} from "@/data/templates";
import { SEO, TOOL } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";

const PAGE_URL = absoluteUrl("/templates");

const GROUP_BLURB: Record<(typeof TEMPLATE_GROUPS)[number], string> = {
  Create: "Make a new image from scratch.",
  Structure: "Images that carry information: sections, labels, panels, screens.",
  Edit: "Change an image you already have.",
  References: "Bring an existing subject or style into a new image.",
  Brand: "Marks and how they look in the real world.",
};

export const Route = createFileRoute("/templates/")({
  head: () => {
    const ogImage = getOgImageForPath();
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

function TemplatesIndex() {
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-12 sm:px-6 lg:px-12 lg:py-16">
        <header className="max-w-[62ch]">
          <p className="eyebrow">Templates</p>
          <h1 className="mt-4 text-display-lg text-[color:var(--text-primary)]">
            Start with a structure.
          </h1>
          <p className="mt-4 text-body-lg text-[color:var(--text-secondary)]">
            Reusable frameworks for common image tasks. Choose one, add your details, and continue
            in {TOOL.builder}. Every structure is written to work with any modern image model — no
            model-specific switches or flags.
          </p>
        </header>

        {TEMPLATE_GROUPS.map((group) => {
          const items = getTemplatesByGroup(group);
          if (items.length === 0) return null;
          return (
            <section key={group} className="mt-14" aria-labelledby={`group-${group}`}>
              <div className="border-b border-[color:var(--text-primary)] pb-3">
                <h2
                  id={`group-${group}`}
                  className="text-heading-md text-[color:var(--text-primary)]"
                >
                  {group}
                </h2>
                <p className="mt-1 text-body-sm text-[color:var(--text-secondary)]">
                  {GROUP_BLURB[group]}
                </p>
              </div>
              <div className="mt-px grid gap-px bg-[color:var(--border-subtle)] border-x border-b border-[color:var(--border-subtle)] lg:grid-cols-2">
                {items.map((t) => (
                  <TemplateCard key={t.id} template={t} />
                ))}
              </div>
            </section>
          );
        })}

        <aside className="mt-16 border-t border-[color:var(--text-primary)] pt-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-heading-md">Looking for finished examples instead?</h2>
              <p className="mt-2 max-w-[52ch] text-body-md text-[color:var(--text-secondary)]">
                Templates give you a structure to fill in. The Library shows complete prompts that
                already produced a result.
              </p>
            </div>
            <Button asChild variant="outline" size="lg" className="shrink-0">
              <Link to="/library">
                Browse the {TOOL.library} <ArrowRight />
              </Link>
            </Button>
          </div>
        </aside>
      </main>
      <Footer />
    </div>
  );
}

function TemplateCard({ template }: { template: Template }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const panelId = `template-panel-${template.id}`;
  const note = COMPATIBILITY_NOTE[template.compatibility];

  const useTemplate = () => {
    const starter = buildTemplateStarter(template, values).slice(0, 4000);
    navigate({ to: "/generate", search: { prefill: starter } });
  };

  return (
    <article className="bg-[color:var(--bg-elevated)] p-6">
      <h3 className="text-heading-sm text-[color:var(--text-primary)]">{template.title}</h3>
      <p className="mt-2 text-body-sm text-[color:var(--text-secondary)]">{template.description}</p>

      <dl className="mt-4 space-y-1">
        <div className="flex gap-2 text-body-sm">
          <dt className="shrink-0 text-[color:var(--text-tertiary)]">Best for</dt>
          <dd className="text-[color:var(--text-secondary)]">{template.best_for}</dd>
        </div>
        <div className="flex gap-2 text-body-sm">
          <dt className="shrink-0 text-[color:var(--text-tertiary)]">You provide</dt>
          <dd className="text-[color:var(--text-secondary)]">
            {template.fields.map((f) => f.label).join(" · ")}
          </dd>
        </div>
      </dl>

      {note && <p className="mt-3 text-[13px] text-[color:var(--text-tertiary)]">{note}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button onClick={useTemplate} className="min-h-11">
          Use template <ArrowRight />
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide details" : "Fill in details"}
          <ChevronDown
            className={`transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </Button>
      </div>

      {open && (
        <div id={panelId} className="mt-6 space-y-4">
          {template.fields.map((field) => {
            const inputId = `${template.id}-${field.key}`;
            const placeholder = template.example_input[field.key] ?? "";
            return (
              <div key={field.key}>
                <label
                  htmlFor={inputId}
                  className="block text-[13px] font-medium text-[color:var(--text-secondary)]"
                >
                  {field.label}
                  {field.hint && (
                    <span className="ml-2 font-normal text-[color:var(--text-tertiary)]">
                      {field.hint}
                    </span>
                  )}
                </label>
                {field.long ? (
                  <Textarea
                    id={inputId}
                    rows={2}
                    className="mt-1.5"
                    placeholder={placeholder}
                    value={values[field.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    id={inputId}
                    className="mt-1.5"
                    placeholder={placeholder}
                    value={values[field.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  />
                )}
              </div>
            );
          })}

          <PromptSurface label="Structure">{buildTemplateStarter(template, values)}</PromptSurface>

          <Button onClick={useTemplate} className="min-h-11 w-full sm:w-auto">
            Continue in {TOOL.builder} <ArrowRight />
          </Button>
        </div>
      )}
    </article>
  );
}
