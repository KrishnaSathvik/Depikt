import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Wand2, LayoutGrid, MessageSquare, Sparkles, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { posts } from "@/data/posts";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";

const HOME_URL = absoluteUrl("/");

const TITLE = "Depikt — AI image prompt generator for GPT Image 2";
const DESCRIPTION =
  "Turn rough ideas into production-grade AI image prompts for OpenAI's GPT Image 2. 500 curated prompts across 10 categories. Free, no login.";

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
          name: "Depikt",
          url: HOME_URL,
          applicationCategory: "DesignApplication",
          operatingSystem: "Any",
          description: DESCRIPTION,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
    };
  },
  component: LandingPage,
});

const ROUGH_INPUT = "a poster about climate change";

const POLISHED_PROMPT = `Editorial print poster, 2:3 portrait. Bold sans-serif headline "THE CLOCK IS TICKING" set in condensed grotesk, top-aligned, near-black ink on warm off-white paper stock. Below: a single full-bleed cyanotype-style image of a melting Arctic ice shelf at golden hour, deep teal sea meeting pale sky, one lone polar bear silhouette mid-frame for scale. Subtle paper grain, faint registration marks in corners. Bottom strip: small mono caption "ARCTIC SEA ICE — SEPT 2025" with a thin 6-tick data sparkline trending down. Restrained palette: ivory, deep teal, near-black, one orange accent. Risograph print feel. High legibility, museum gift-shop quality.`;

const FEATURES = [
  {
    to: "/library" as const,
    icon: LayoutGrid,
    title: "Library",
    body: "500 production-grade prompts across 10 categories. Posters, infographics, UI mockups, cinematic, and more. Copy and paste straight into ChatGPT.",
    cta: "Browse the library",
  },
  {
    to: "/generate" as const,
    icon: Wand2,
    title: "Generate",
    body: "Type one rough sentence. Get a structured prompt back — composition, lighting, type, palette, all spelled out. Tuned specifically for GPT Image 2.",
    cta: "Open the generator",
  },
  {
    to: "/critique" as const,
    icon: MessageSquare,
    title: "Critique",
    body: "Paste any prompt. Get a score, its weaknesses, concrete improvements, and a rewritten version ready to ship.",
    cta: "Try critique",
  },
];

const STATS = [
  { value: "500", label: "Curated prompts" },
  { value: "10", label: "Categories" },
  { value: "GPT Image 2", label: "Built for" },
  { value: "Free", label: "No login" },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <BrandHeader />
      <main>
        <Hero />
        <FeatureGrid />
        <BeforeAfter />
        <BlogTeaser />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

function BrandHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[color:var(--border-subtle)] bg-[color:var(--bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center px-6 lg:px-12">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="Depikt" width={28} height={28} className="h-7 w-7 dark:invert" />
          <span className="text-[15px] font-semibold tracking-tight text-[color:var(--text-primary)]">
            Depikt
          </span>
        </Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-[color:var(--bg)]">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12 py-10 text-center">
        <p className="text-body-sm text-[color:var(--text-tertiary)]">
          © {new Date().getFullYear()} Depikt. Built for GPT Image 2.
        </p>
      </div>
    </footer>
  );
}

/* ============================================================ */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[color:var(--border-subtle)]">
      <div className="absolute inset-0 grid-bg pointer-events-none" aria-hidden />
      <div className="relative mx-auto max-w-[1400px] px-6 lg:px-12 py-20 md:py-32 text-center">
        <p className="eyebrow">Built for OpenAI's GPT Image 2</p>
        <h1 className="mt-6 text-display-lg md:text-display-xl text-[color:var(--text-primary)] mx-auto max-w-[18ch]">
          Stop fighting the prompt. Start shipping the image.
        </h1>
        <p className="mt-6 text-body-lg text-[color:var(--text-secondary)] mx-auto max-w-[60ch]">
          Depikt turns one rough sentence into a production-grade AI image prompt — composition,
          lighting, type, palette, all spelled out. Or browse 500 curated prompts ready to copy.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link to="/generate">
              Try the generator <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/library">Browse 500 prompts</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */

function StatStrip() {
  return (
    <section className="border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)]">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12 py-8 md:py-10">
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 text-center">
          {STATS.map((s) => (
            <li key={s.label}>
              <div className="text-heading-md md:text-heading-lg text-[color:var(--text-primary)] tabular-nums">
                {s.value}
              </div>
              <div className="mt-1 text-body-sm text-[color:var(--text-tertiary)]">{s.label}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ============================================================ */

function FeatureGrid() {
  return (
    <section className="border-b border-[color:var(--border-subtle)]">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12 py-20 md:py-28">
        <div className="max-w-[60ch]">
          <p className="eyebrow">What's inside</p>
          <h2 className="mt-4 text-display-md text-[color:var(--text-primary)]">
            Three tools, one workflow.
          </h2>
          <p className="mt-4 text-body-lg text-[color:var(--text-secondary)]">
            Browse what works, generate your own, then critique the result. Everything tuned for
            GPT Image 2's strengths — type rendering, photorealism, layout control.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <Link
              key={f.to}
              to={f.to}
              className="group flex flex-col rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-6 transition-all duration-150 ease-out hover:border-[color:var(--border-strong)] hover:shadow-md-card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[color:var(--bg-subtle)] text-[color:var(--text-primary)]">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-heading-sm text-[color:var(--text-primary)]">{f.title}</h3>
              <p className="mt-2 text-body-md text-[color:var(--text-secondary)]">{f.body}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-body-sm font-medium text-[color:var(--text-primary)]">
                {f.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
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
    <section className="border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)]">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12 py-20 md:py-28">
        <div className="max-w-[60ch]">
          <p className="eyebrow">From rough idea to ship-ready</p>
          <h2 className="mt-4 text-display-md text-[color:var(--text-primary)]">
            One sentence in. A real prompt out.
          </h2>
          <p className="mt-4 text-body-lg text-[color:var(--text-secondary)]">
            This is what Depikt actually does. No magic — just a system prompt tuned around how
            GPT Image 2 reads composition, type, and lighting cues.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
          {/* Before */}
          <div className="lg:col-span-2 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-6 flex flex-col">
            <div className="flex items-center gap-2">
              <span className="pill">You type</span>
            </div>
            <p className="mt-4 text-body-lg text-[color:var(--text-primary)] font-medium leading-snug">
              "{ROUGH_INPUT}"
            </p>
            <div className="mt-auto pt-6 flex items-center gap-2 text-[color:var(--text-tertiary)]">
              <ArrowRight className="h-4 w-4" />
              <span className="text-body-sm">Depikt rewrites it</span>
            </div>
          </div>

          {/* After */}
          <div className="lg:col-span-3 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--border-subtle)]">
              <span className="pill">
                <Sparkles className="h-3 w-3 mr-1.5" />
                Depikt prompt
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
            <pre className="flex-1 px-6 py-5 text-[13px] leading-relaxed font-mono text-[color:var(--code-text)] bg-[color:var(--code-bg)] whitespace-pre-wrap break-words">
              {POLISHED_PROMPT}
            </pre>
          </div>
        </div>

        <div className="mt-8">
          <Button asChild variant="outline">
            <Link to="/generate">
              Try it with your own idea <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */

function BlogTeaser() {
  const recent = posts.slice(0, 3);
  return (
    <section className="border-b border-[color:var(--border-subtle)]">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12 py-20 md:py-28">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="max-w-[60ch]">
            <p className="eyebrow">From the blog</p>
            <h2 className="mt-4 text-display-md text-[color:var(--text-primary)]">
              Prompting, deconstructed.
            </h2>
          </div>
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-body-sm font-medium text-[color:var(--text-primary)] hover:opacity-70 transition-opacity"
          >
            All posts <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {recent.map((p) => (
            <Link
              key={p.slug}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="group flex flex-col rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-6 transition-all duration-150 ease-out hover:border-[color:var(--border-strong)] hover:shadow-md-card"
            >
              <span className="pill self-start">{p.category}</span>
              <h3 className="mt-4 text-heading-sm text-[color:var(--text-primary)] leading-snug">
                {p.title}
              </h3>
              <p className="mt-3 text-body-md text-[color:var(--text-secondary)] line-clamp-3">
                {p.excerpt}
              </p>
              <div className="mt-auto pt-6 text-body-sm text-[color:var(--text-tertiary)]">
                {p.read_time} read
              </div>
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
    <section className="border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)]">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12 py-24 md:py-32 text-center">
        <h2 className="text-display-md md:text-display-lg text-[color:var(--text-primary)] mx-auto max-w-[20ch]">
          Your next image is one good prompt away.
        </h2>
        <p className="mt-5 text-body-lg text-[color:var(--text-secondary)] mx-auto max-w-[55ch]">
          No account. No credit card. Open the generator and ship something today.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link to="/generate">
              Open the generator <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/library">Browse the library</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
