import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Check, Copy } from "lucide-react";
import {
  CTA,
  JSONLD_DESCRIPTIONS,
  JSONLD_NAMES,
  LEGACY_MODEL_NAME,
  POSITIONING,
  SEO,
  TARGET_MODEL_NAME,
  TOOL,
  LIBRARY_PROMPT_COUNT,
} from "@/lib/product";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { PromptSurface } from "@/components/PromptSurface";
import { useEffect, useRef, useState, type ReactNode } from "react";
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

// Learn → Build → Improve. The step word is a small label; the tool name
// stays the visible title so the cards match the navigation.
const FEATURES = [
  {
    to: "/library" as const,
    step: "Learn",
    title: TOOL.library,
    body: `${LIBRARY_PROMPT_COUNT} curated prompts across 10 categories, each with a note on why it works: the ${LEGACY_MODEL_NAME} collection plus ${TARGET_MODEL_NAME} recipes with reviewed results.`,
    cta: "Browse the library",
  },
  {
    to: "/generate" as const,
    step: "Build",
    title: TOOL.builder,
    body: "Turn a rough idea or a reference image into a precise prompt, with the intent, aspect ratio, exact text, and reference handling spelled out.",
    cta: "Open the Prompt Builder",
  },
  {
    to: "/critique" as const,
    step: "Improve",
    title: TOOL.critic,
    body: "Paste an existing prompt and find the weak instructions, contradictions, and missing edit protection. Get a score, a breakdown, and a rewrite.",
    cta: "Open the Prompt Critic",
  },
];

// Editorial capability stories. The first sentence of each body paraphrases
// OpenAI's launch post; the second is what Depikt does about it.
const CAPABILITIES = [
  {
    label: "Reference fidelity",
    heading: "Keep the subject. Change the setting.",
    body: `${TARGET_MODEL_NAME} is better at keeping the people and objects in a reference photo recognizable. Depikt asks how the reference should be used and writes that into the prompt.`,
  },
  {
    label: "Precision edits",
    heading: "Change one thing. Protect everything else.",
    body: "The model is better at editing only what you ask for. Depikt separates what changes from what must stay, and the Critic flags prompts that never say what to keep.",
  },
  {
    label: "Complex layouts",
    heading: "Control structure, hierarchy, and exact text.",
    body: "Layouts, real-world content, and transparent backgrounds are handled more reliably. Depikt treats exact text, ratio, and hierarchy as first-class instructions.",
  },
  {
    label: "Series consistency",
    heading: "Carry approved choices forward.",
    body: "Edits hold up better across a long conversation. Depikt restates what to preserve on every turn so a face or a product does not drift.",
  },
];

/**
 * Fades a section in the first time it scrolls into view. No-op (always
 * visible) when the viewer prefers reduced motion; see .reveal-on-scroll.
 */
function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.inview = "true";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal-on-scroll ${className ?? ""}`}>
      {children}
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <Header />
      <AnnouncementBar />
      <main>
        <Hero />
        <FeatureGrid />
        <Capabilities />
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
    <section>
      <div className="mx-auto max-w-[1400px] px-4 pb-20 pt-20 sm:px-6 md:pb-36 md:pt-36 lg:px-12">
        <h1 className="reveal max-w-[13ch] text-display-lg md:text-display-xl text-[color:var(--text-primary)]">
          {POSITIONING.headline}
        </h1>
        <p
          className="reveal mt-8 max-w-[44ch] text-body-lg text-[color:var(--text-secondary)]"
          style={{ animationDelay: "60ms" }}
        >
          Describe what you want, or add a reference. Depikt helps turn it into a clear, precise
          prompt.
        </p>
        <div
          className="reveal mt-10 flex flex-col gap-3 sm:flex-row"
          style={{ animationDelay: "120ms" }}
        >
          <Button asChild size="lg">
            <Link to="/generate">
              {CTA.buildHero} <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/library">{CTA.browseShort}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */

function FeatureGrid() {
  return (
    <section className="border-t border-[color:var(--border-subtle)]">
      <Reveal>
        <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 md:py-32 lg:px-12">
          <p className="eyebrow">Learn · Build · Improve</p>
          <h2 className="mt-4 max-w-[16ch] text-display-md text-[color:var(--text-primary)]">
            Three tools, one workflow.
          </h2>

          <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
            {FEATURES.map((f) => (
              <Link key={f.to} to={f.to} className="group flex flex-col">
                <div className="flex items-center justify-between border-t border-[color:var(--text-primary)] pt-5">
                  <span className="text-[13px] font-medium text-[color:var(--text-tertiary)]">
                    {f.step}
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
      </Reveal>
    </section>
  );
}

/* ============================================================ */

function Capabilities() {
  return (
    <section className="border-t border-[color:var(--border-subtle)]">
      <Reveal>
        <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 md:py-32 lg:px-12">
          <p className="eyebrow">What changed</p>
          <h2 className="mt-4 max-w-[22ch] text-display-md text-[color:var(--text-primary)]">
            The new model rewards prompts that say what to change, what to keep, and where the text
            goes.
          </h2>

          <div className="mt-16 grid gap-14 md:mt-24 md:grid-cols-2 md:gap-x-16 md:gap-y-20">
            {CAPABILITIES.map((c) => (
              <div key={c.label} className="max-w-[46ch]">
                <p className="text-[13px] font-medium text-[color:var(--text-tertiary)]">
                  {c.label}
                </p>
                <h3 className="mt-4 text-heading-lg text-[color:var(--text-primary)]">
                  {c.heading}
                </h3>
                <p className="mt-4 text-body-md text-[color:var(--text-secondary)]">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
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
    <section className="border-t border-[color:var(--border-subtle)]">
      <Reveal>
        <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 md:py-32 lg:px-12">
          <p className="eyebrow">From rough idea to image-ready prompt</p>
          <h2 className="mt-4 max-w-[16ch] text-display-md text-[color:var(--text-primary)]">
            One sentence in. A real prompt out.
          </h2>

          <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
            <div className="flex flex-col">
              <span className="text-[13px] font-medium text-[color:var(--text-tertiary)]">
                You type
              </span>
              <p className="mt-5 text-heading-lg text-[color:var(--text-primary)]">
                “{ROUGH_INPUT}”
              </p>
              <p className="mt-6 max-w-[38ch] text-body-md text-[color:var(--text-secondary)]">
                The {TOOL.builder} works out the format, the reference use, the ratio, and the exact
                text first, then writes the prompt.
              </p>
              <div className="mt-8">
                <Button asChild variant="outline">
                  <Link to="/generate">
                    Build one from your own idea <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>

            <PromptSurface
              label="Your prompt · Poster · 2:3"
              actions={
                <button
                  type="button"
                  onClick={onCopy}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-primary)]"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              }
            >
              {POLISHED_PROMPT}
            </PromptSurface>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ============================================================ */

function LatestGuides() {
  const guides = getLatestGuides(3);
  return (
    <section className="border-t border-[color:var(--border-subtle)]">
      <Reveal>
        <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 md:py-32 lg:px-12">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">From the blog</p>
              <h2 className="mt-4 text-display-md text-[color:var(--text-primary)]">
                Latest guides.
              </h2>
            </div>
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-body-sm font-medium text-[color:var(--text-primary)] underline-offset-4 hover:underline"
            >
              All posts <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
            {guides.map((p) => (
              <Link
                key={p.slug}
                to="/blog/$slug"
                params={{ slug: p.slug }}
                className="group flex flex-col border-t border-[color:var(--border-subtle)] pt-5"
              >
                <div className="flex items-center gap-2 text-[13px] text-[color:var(--text-tertiary)]">
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
      </Reveal>
    </section>
  );
}

/* ============================================================ */

function FinalCTA() {
  return (
    <section className="border-t border-[color:var(--border-subtle)]">
      <Reveal>
        <div className="mx-auto max-w-[1400px] px-4 py-24 sm:px-6 md:py-40 lg:px-12">
          <h2 className="max-w-[14ch] text-display-md md:text-display-lg text-[color:var(--text-primary)]">
            Your next image starts with a better prompt.
          </h2>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/generate">
                {CTA.buildHero} <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/library">{CTA.browseShort}</Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
