import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Copy, Check } from "lucide-react";
import {
  CTA,
  JSONLD_DESCRIPTIONS,
  JSONLD_NAMES,
  LEGACY_MODEL_NAME,
  POSITIONING,
  SEO,
  TARGET_MODEL_NAME,
  TOOL,
} from "@/lib/product";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getLatestGuides } from "@/data/posts";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";

const HOME_URL = absoluteUrl("/");

const TITLE = SEO.home.title;
const DESCRIPTION = SEO.home.description;

export const Route = createFileRoute("/")({
  head: () => {
    const ogImage = getOgImageForPath();
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESCRIPTION },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESCRIPTION },
        { property: "og:type", content: "website" },
        { property: "og:url", content: HOME_URL },
        { property: "og:image", content: ogImage },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: TITLE },
        { name: "twitter:description", content: DESCRIPTION },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: HOME_URL }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: JSONLD_NAMES.site,
            url: HOME_URL,
            applicationCategory: "DesignApplication",
            operatingSystem: "Any",
            description: JSONLD_DESCRIPTIONS.app,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        },
      ],
    };
  },
  component: LandingPage,
});

const ROUGH_INPUT = "a poster about climate change";

const POLISHED_PROMPT = `Editorial print poster, 2:3 portrait. Bold sans-serif headline "THE CLOCK IS TICKING" set in condensed grotesk, top-aligned, near-black ink on warm off-white paper stock. Below: a single full-bleed cyanotype-style image of a melting Arctic ice shelf at golden hour, deep teal sea meeting pale sky, one lone polar bear silhouette mid-frame for scale. Subtle paper grain, faint registration marks in corners. Bottom strip: small mono caption "ARCTIC SEA ICE — SEPT 2026" with a thin 6-tick data sparkline trending down. Restrained palette: ivory, deep teal, near-black, one orange accent. Risograph print feel. High legibility, museum gift-shop quality.`;

// Learn → Build → Improve. The step word is an eyebrow; the tool name stays
// the visible title so the cards match the navigation.
const FEATURES = [
  {
    to: "/library" as const,
    index: "01",
    step: "Learn",
    title: TOOL.library,
    body: `500 proven ${LEGACY_MODEL_NAME} prompt examples across 10 categories, each with a note on why it works. Study them, copy them, or use one as a remix starting point.`,
    cta: "Browse the library",
  },
  {
    to: "/generate" as const,
    index: "02",
    step: "Build",
    title: TOOL.builder,
    body: `Turn a rough idea or a reference image into a ${TARGET_MODEL_NAME}-ready prompt, with the intent, aspect ratio, exact text, and reference handling spelled out.`,
    cta: "Open the Prompt Builder",
  },
  {
    to: "/critique" as const,
    index: "03",
    step: "Improve",
    title: TOOL.critic,
    body: "Paste an existing prompt and find the weak instructions, contradictions, missing edit protection, and unnecessary bloat. Get a score, a breakdown, and a rewrite.",
    cta: "Open the Prompt Critic",
  },
];

// What changed in the model, and what Depikt does about each one. Model
// facts paraphrase OpenAI's launch post; the right column is Depikt's job.
const WHY_RETUNED = [
  {
    model: "Better at preserving the subjects in your reference photos.",
    depikt: "The Builder asks how a reference should be used and writes that into the prompt.",
  },
  {
    model: "Edits only what you asked for and keeps the rest the same.",
    depikt: "The Critic scores edit preservation and flags prompts that never say what to keep.",
  },
  {
    model:
      "More accurate real-world content and more complex layouts, including transparent backgrounds.",
    depikt:
      "Exact text, hierarchy, ratio, and transparency are separate fields in the intent stage.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <Header />
      <AnnouncementBar />
      <main>
        <Hero />
        <FeatureGrid />
        <WhyRetuned />
        <BeforeAfter />
        <LatestGuides />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

/* ============================================================ */

function Hero() {
  return (
    <section className="border-b border-[color:var(--border-subtle)]">
      <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-14 sm:px-6 md:pb-28 md:pt-24 lg:px-12">
        <p className="eyebrow reveal">{POSITIONING.eyebrow}</p>
        <h1
          className="reveal mt-6 max-w-[14ch] text-display-lg md:text-display-xl text-[color:var(--text-primary)]"
          style={{ animationDelay: "60ms" }}
        >
          {POSITIONING.headline}
        </h1>
        <div
          className="reveal mt-8 flex flex-col gap-8 md:mt-10 md:flex-row md:items-end md:justify-between"
          style={{ animationDelay: "120ms" }}
        >
          <p className="max-w-[48ch] text-body-lg text-[color:var(--text-secondary)]">
            Describe what you want, or attach a reference image. The {TOOL.builder} writes a precise{" "}
            {TARGET_MODEL_NAME} prompt you paste into ChatGPT.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/generate">
                {CTA.buildHero} <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/library">{CTA.browse}</Link>
            </Button>
          </div>
        </div>
        <p
          className="reveal mt-8 font-mono text-[11.5px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          style={{ animationDelay: "180ms" }}
        >
          Free · No login · Depikt writes the prompt; ChatGPT makes the image
        </p>
      </div>
    </section>
  );
}

/* ============================================================ */

function FeatureGrid() {
  return (
    <section className="border-b border-[color:var(--border-subtle)]">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 md:py-24 lg:px-12">
        <div className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12">
          <div>
            <p className="eyebrow">Learn · Build · Improve</p>
            <h2 className="mt-4 text-display-md text-[color:var(--text-primary)]">
              Three tools, one workflow.
            </h2>
          </div>
          <p className="max-w-[56ch] text-body-lg text-[color:var(--text-secondary)] md:pt-9">
            Learn from prompts that worked, build your own from an idea or a reference, then improve
            it before you spend a generation. The Builder and Critic are tuned for{" "}
            {TARGET_MODEL_NAME}: precise edits, reference fidelity, exact text, and clean layouts.
          </p>
        </div>

        <div className="mt-12 grid border-t border-[color:var(--border-subtle)] md:mt-16 md:grid-cols-3">
          {FEATURES.map((f) => (
            <Link
              key={f.to}
              to={f.to}
              className="group flex flex-col border-b border-[color:var(--border-subtle)] py-8 transition-colors hover:bg-[color:var(--bg-muted)] md:border-b-0 md:border-r md:px-8 md:py-10 md:first:pl-0 md:last:border-r-0"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                  {f.index} · {f.step}
                </span>
                <ArrowUpRight className="h-4 w-4 text-[color:var(--text-quaternary)] transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[color:var(--text-primary)]" />
              </div>
              <h3 className="mt-6 text-heading-md text-[color:var(--text-primary)]">{f.title}</h3>
              <p className="mt-3 max-w-[38ch] text-body-md text-[color:var(--text-secondary)]">
                {f.body}
              </p>
              <span className="mt-8 inline-flex items-center gap-1.5 text-body-sm font-medium text-[color:var(--text-primary)] underline-offset-4 group-hover:underline">
                {f.cta}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */

function WhyRetuned() {
  return (
    <section className="border-b border-[color:var(--border-subtle)]">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 md:py-24 lg:px-12">
        <div className="max-w-[60ch]">
          <p className="eyebrow">Why Depikt was retuned</p>
          <h2 className="mt-4 text-display-md text-[color:var(--text-primary)]">
            {TARGET_MODEL_NAME} rewards prompts that say what to change, what to keep, and where the
            text goes.
          </h2>
        </div>
        <dl className="mt-12 border-t border-[color:var(--border-subtle)]">
          <div className="hidden grid-cols-2 gap-8 py-3 font-mono text-[11.5px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)] md:grid">
            <span>What the model does now</span>
            <span>What Depikt does about it</span>
          </div>
          {WHY_RETUNED.map((row) => (
            <div
              key={row.model}
              className="grid gap-2 border-t border-[color:var(--border-subtle)] py-6 md:grid-cols-2 md:gap-8"
            >
              <dt className="text-body-lg text-[color:var(--text-primary)]">{row.model}</dt>
              <dd className="text-body-md text-[color:var(--text-secondary)]">{row.depikt}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-body-sm text-[color:var(--text-tertiary)]">
          Model behaviour is as described in OpenAI's announcement of {TARGET_MODEL_NAME}. Depikt
          does not generate images.
        </p>
      </div>
    </section>
  );
}

/* ============================================================ */

function BeforeAfter() {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(POLISHED_PROMPT);
      setCopied(true);
      toast.success("Prompt copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <section className="border-b border-[color:var(--border-subtle)]">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 md:py-24 lg:px-12">
        <div className="max-w-[60ch]">
          <p className="eyebrow">From rough idea to image-ready prompt</p>
          <h2 className="mt-4 text-display-md text-[color:var(--text-primary)]">
            One sentence in. A real prompt out.
          </h2>
          <p className="mt-4 text-body-lg text-[color:var(--text-secondary)]">
            The {TOOL.builder} first works out what you are asking for (format, reference use,
            ratio, exact text), then writes the prompt. You take it to ChatGPT to make the image.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 items-stretch gap-0 overflow-hidden rounded-lg border border-[color:var(--border-default)] lg:grid-cols-5">
          {/* Before */}
          <div className="flex flex-col border-b border-[color:var(--border-subtle)] p-6 lg:col-span-2 lg:border-b-0 lg:border-r lg:p-8">
            <span className="eyebrow">You type</span>
            <p className="mt-6 text-heading-md text-[color:var(--text-primary)]">“{ROUGH_INPUT}”</p>
            <div className="mt-auto flex items-center gap-2 pt-10 text-[color:var(--text-tertiary)]">
              <ArrowRight className="h-4 w-4" />
              <span className="text-body-sm">The {TOOL.builder} rewrites it</span>
            </div>
          </div>

          {/* After */}
          <div className="ink flex flex-col lg:col-span-3">
            <div className="flex items-center justify-between border-b border-[color:var(--ink-border)] px-6 py-4">
              <span className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[color:var(--ink-text-secondary)]">
                Depikt prompt · Poster · 2:3
              </span>
              <button
                type="button"
                onClick={onCopy}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--ink-text-secondary)] transition-colors hover:text-[color:var(--ink-text)]"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="flex-1 whitespace-pre-wrap break-words px-6 py-6 font-mono text-[13px] leading-[1.7] text-[color:var(--ink-text)]">
              {POLISHED_PROMPT}
            </pre>
          </div>
        </div>

        <div className="mt-8">
          <Button asChild variant="outline">
            <Link to="/generate">
              Build one from your own idea <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */

function LatestGuides() {
  const guides = getLatestGuides(3);
  return (
    <section className="border-b border-[color:var(--border-subtle)]">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 md:py-24 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[60ch]">
            <p className="eyebrow">Latest guides</p>
            <h2 className="mt-4 text-display-md text-[color:var(--text-primary)]">
              Prompting {TARGET_MODEL_NAME}, deconstructed.
            </h2>
          </div>
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-body-sm font-medium text-[color:var(--text-primary)] underline-offset-4 hover:underline"
          >
            All posts <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid border-t border-[color:var(--border-subtle)] md:grid-cols-3">
          {guides.map((p) => (
            <Link
              key={p.slug}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="group flex flex-col border-b border-[color:var(--border-subtle)] py-7 transition-colors hover:bg-[color:var(--bg-muted)] md:border-b-0 md:border-r md:px-8 md:py-8 md:first:pl-0 md:last:border-r-0"
            >
              <div className="flex items-center gap-3 font-mono text-[11.5px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]">
                <span>{p.category}</span>
                <span aria-hidden>·</span>
                <span className="tabular-nums">{p.read_time}</span>
              </div>
              <h3 className="mt-5 text-heading-sm text-[color:var(--text-primary)] underline-offset-4 group-hover:underline">
                {p.title}
              </h3>
              <p className="mt-3 line-clamp-3 text-body-sm text-[color:var(--text-secondary)]">
                {p.excerpt}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */

function FinalCTA() {
  return (
    <section>
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 md:py-32 lg:px-12">
        <h2 className="max-w-[16ch] text-display-md md:text-display-lg text-[color:var(--text-primary)]">
          Your next image is one good prompt away.
        </h2>
        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-[44ch] text-body-lg text-[color:var(--text-secondary)]">
            No account. No credit card. Build a prompt, open it in ChatGPT, and make the image.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/generate">
                {CTA.buildHero} <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/library">Browse the library</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
