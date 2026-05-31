import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { getTemplateBySlug, templates } from "@/data/templates";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";

export const Route = createFileRoute("/templates/$slug")({
  loader: ({ params }) => {
    const template = getTemplateBySlug(params.slug);
    if (!template) throw notFound();
    return { template };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.template) return { meta: [{ title: "Template not found" }] };
    const { template } = loaderData;
    const url = absoluteUrl(`/templates/${template.slug}`);
    const ogImage = getOgImageForPath(`/templates/${template.slug}`);

    const howToJsonLd = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: template.question,
      description: template.short_answer,
      step: [
        { "@type": "HowToStep", name: "Copy the prompt", text: template.prompt },
        { "@type": "HowToStep", name: "Paste into GPT Image 2", text: "Paste this prompt into ChatGPT, the OpenAI API, or fal.ai to generate the image." },
      ],
    };

    const faqJsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: template.question,
          acceptedAnswer: { "@type": "Answer", text: `${template.short_answer}\n\nPrompt:\n${template.prompt}\n\nWhy it works: ${template.why_it_works}` },
        },
      ],
    };

    return {
      meta: [
        { title: `${template.question} — Depikt` },
        { name: "description", content: template.short_answer },
        { property: "og:title", content: template.question },
        { property: "og:description", content: template.short_answer },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImage },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: template.question },
        { name: "twitter:description", content: template.short_answer },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(howToJsonLd) },
        { type: "application/ld+json", children: JSON.stringify(faqJsonLd) },
      ],
    };
  },
  notFoundComponent: TemplateNotFound,
  component: TemplatePage,
});

function TemplateNotFound() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-32 text-center">
        <p className="eyebrow">Error · 404</p>
        <h1 className="mt-4 text-display-md">Template not found</h1>
        <Link to="/templates" className="mt-8 inline-block">
          <Button variant="outline">Back to templates</Button>
        </Link>
      </main>
    </div>
  );
}

function TemplatePage() {
  const { template } = Route.useLoaderData();
  const [copied, setCopied] = useState(false);
  const related = templates.filter((r) => r.slug !== template.slug).slice(0, 3);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(template.prompt);
      setCopied(true);
      toast.success("Prompt copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto max-w-3xl px-6 lg:px-12 py-10">
        <Link
          to="/templates"
          className="inline-flex items-center gap-1.5 text-mono-sm text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All templates
        </Link>

        <header className="mt-8">
          <span className="font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[color:var(--text-tertiary)]">
            {template.category}
          </span>
          <h1 className="mt-4 text-display-md text-[color:var(--text-primary)]">
            {template.question}
          </h1>
        </header>

        {/* TL;DR */}
        <aside
          aria-label="Short answer"
          className="mt-8 rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-6"
        >
          <p className="eyebrow">Short answer</p>
          <p className="mt-3 text-body-lg text-[color:var(--text-primary)]">
            {template.short_answer}
          </p>
        </aside>

        {/* The prompt */}
        <section className="mt-10 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--border-subtle)]">
            <span className="pill">
              <Sparkles className="h-3 w-3 mr-1.5" />
              Copy-paste prompt
            </span>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-1.5 text-body-sm font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="px-6 py-5 text-[13px] leading-relaxed font-mono text-[color:var(--code-text)] bg-[color:var(--code-bg)] whitespace-pre-wrap break-words">
            {template.prompt}
          </pre>
        </section>

        {/* Why it works */}
        <section className="mt-10">
          <p className="eyebrow">Why it works</p>
          <p className="mt-3 text-body-md text-[color:var(--text-secondary)]">
            {template.why_it_works}
          </p>
        </section>

        {/* CTA */}
        <div className="mt-12 rounded-md border border-[color:var(--accent)] bg-[color:var(--accent)] px-8 py-8 text-center">
          <h3 className="text-heading-md text-white">Want one for your exact idea?</h3>
          <p className="mt-2 text-body-sm text-white/70">
            Depikt's generator writes a template-style prompt from any rough sentence.
          </p>
          <Link to="/generate" className="mt-5 inline-block">
            <Button
              size="default"
              variant="secondary"
              className="bg-white text-[color:var(--accent)] hover:bg-[color:var(--bg-subtle)] border-transparent"
            >
              Open the generator <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-14">
            <p className="eyebrow">More templates</p>
            <div className="mt-4 grid gap-px bg-[color:var(--border-subtle)] border border-[color:var(--border-subtle)] sm:grid-cols-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to="/templates/$slug"
                  params={{ slug: r.slug }}
                  className="group block bg-[color:var(--bg-elevated)] p-5 hover:bg-[color:var(--bg-subtle)] transition-colors"
                >
                  <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-[color:var(--text-tertiary)]">
                    {r.category}
                  </span>
                  <h5 className="mt-2 text-body-md font-medium text-[color:var(--text-primary)] group-hover:underline underline-offset-4">
                    {r.question}
                  </h5>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
