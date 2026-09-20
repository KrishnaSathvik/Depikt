import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  ANNOUNCEMENT,
  CTA,
  HOME_ACTION,
  JSONLD_DESCRIPTIONS,
  JSONLD_NAMES,
  ROUTES,
  SEO,
  TARGET_MODEL_NAME,
  TOOL,
} from "@/lib/product";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LaunchModule } from "@/components/LaunchModule";
import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { GALLERY_IMAGES } from "@/data/gallery-images";
import { galleryLabel } from "@/lib/gallery-labels";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import { pageSeoHead } from "@/lib/seo";

const HOME_URL = absoluteUrl("/");

export const Route = createFileRoute("/")({
  head: () => {
    const { meta, links } = pageSeoHead(SEO.home, {
      url: HOME_URL,
      image: getOgImageForPath("home"),
    });
    return {
      meta,
      links,
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

const START_WAYS = [
  {
    to: ROUTES.legacyBuilder,
    title: HOME_ACTION.generate.title,
    body: HOME_ACTION.generate.body,
  },
  {
    to: ROUTES.library,
    title: HOME_ACTION.library.title,
    body: HOME_ACTION.library.body,
  },
  {
    to: ROUTES.templates,
    title: HOME_ACTION.templates.title,
    body: HOME_ACTION.templates.body,
  },
] as const;

const PROOF_IMAGES = [
  { slug: "board-game-box-cover", alt: "Board game box cover generated in Depikt" },
  { slug: "holiday-card-exact-greeting", alt: "Holiday card with exact greeting text" },
  { slug: "watercolor-ink-fashion-illustration", alt: "Watercolor ink fashion illustration" },
  { slug: "architectural-minimalist-poster-pavilion", alt: "Minimalist architectural poster" },
  { slug: "podcast-cover-art-exact-title", alt: "Podcast cover with exact title" },
  { slug: "sticker-pack-poster", alt: "Sticker pack poster" },
  { slug: "four-season-cabin-strip", alt: "Four-season cabin strip" },
  { slug: "youtube-thumbnail-exact-title", alt: "YouTube thumbnail with exact title" },
] as const;

const CAPABILITIES = [
  {
    label: "References",
    heading: "Keep the subject. Change the setting.",
    body: `${TARGET_MODEL_NAME} is better at keeping people and objects recognizable. Attach a reference in Generate and say how it should be used.`,
  },
  {
    label: "Edits",
    heading: "Change one thing. Protect everything else.",
    body: "Edit an existing result in place. Say what changes and what must stay — Depikt writes that into the next request.",
  },
  {
    label: "Layouts",
    heading: "Control structure, hierarchy, and exact text.",
    body: "Posters, cards, and other structured visuals hold type and layout more reliably when the prompt names the words and the frame.",
  },
  {
    label: "Consistency",
    heading: "Carry approved choices forward.",
    body: "Reference Packs and regenerates keep a face, product, or brand from drifting across a series.",
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
      <LaunchModule />
      <main>
        <ProductAction />
        <ProofStrip />
        <StartWays />
        <Capabilities />
        <GalleryPeek />
        <PricingNote />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

function ProductCtas({ size = "lg" }: { size?: "default" | "lg" }) {
  const generationLive = isNativeGenerationEnabled();
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button asChild size={size}>
        <Link to={ROUTES.legacyBuilder}>
          {generationLive ? CTA.generateImage : CTA.improvePrompt} <ArrowRight />
        </Link>
      </Button>
      <Button asChild size={size} variant="outline">
        <Link to={ROUTES.library}>{CTA.browseShort}</Link>
      </Button>
    </div>
  );
}

function ProductAction() {
  return (
    <section>
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 md:py-16 lg:px-12">
        <h2 className="max-w-[18ch] text-heading-xl text-[color:var(--text-primary)] md:text-display-md">
          {HOME_ACTION.title}
        </h2>
        <p className="mt-3 max-w-[52ch] text-body-lg text-[color:var(--text-secondary)]">
          {HOME_ACTION.body}
        </p>
        <div className="mt-6">
          <ProductCtas />
        </div>
      </div>
    </section>
  );
}

function ProofStrip() {
  return (
    <section className="border-t border-[color:var(--border-subtle)]">
      <Reveal>
        <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 md:py-14 lg:px-12">
          <p className="eyebrow">Real results</p>
          <ul className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible [&::-webkit-scrollbar]:hidden lg:grid-cols-8">
            {PROOF_IMAGES.map((img) => (
              <li
                key={img.slug}
                className="w-[42vw] shrink-0 overflow-hidden border border-[color:var(--border-default)] bg-[color:var(--bg-subtle)] sm:w-auto"
              >
                <Link
                  to={ROUTES.library}
                  search={{ page: 1, collection: ANNOUNCEMENT.primary.collection }}
                  aria-label={img.alt}
                  className="block aspect-[3/4]"
                >
                  <img
                    src={`/library/images-2-5/${img.slug}.webp`}
                    alt={img.alt}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}

function StartWays() {
  const generationLive = isNativeGenerationEnabled();
  const ways = generationLive
    ? START_WAYS
    : [
        {
          to: ROUTES.prompt,
          title: TOOL.improvePrompt,
          body: "We'll refine what you wrote into a stronger image prompt.",
        },
        START_WAYS[1],
        START_WAYS[2],
      ];
  return (
    <section className="border-t border-[color:var(--border-subtle)]">
      <Reveal>
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 md:py-16 lg:px-12">
          <p className="eyebrow">Three ways to start</p>
          <div className="mt-8 grid gap-10 md:grid-cols-3 md:gap-12">
            {ways.map((f) => (
              <Link key={f.to} to={f.to} className="group flex flex-col">
                <div className="flex items-center justify-between border-t border-[color:var(--text-primary)] pt-4">
                  <h3 className="text-heading-sm text-[color:var(--text-primary)]">{f.title}</h3>
                  <ArrowUpRight className="h-4 w-4 text-[color:var(--text-quaternary)] transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[color:var(--text-primary)]" />
                </div>
                <p className="mt-3 max-w-[38ch] text-body-md text-[color:var(--text-secondary)]">
                  {f.body}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Capabilities() {
  return (
    <section className="border-t border-[color:var(--border-subtle)]">
      <Reveal>
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 md:py-20 lg:px-12">
          <p className="eyebrow">References and edits</p>
          <h2 className="mt-3 max-w-[22ch] text-heading-xl text-[color:var(--text-primary)] md:text-display-md">
            Attach a reference, then generate or edit from there.
          </h2>
          <div className="mt-12 grid gap-12 md:grid-cols-2 md:gap-x-16 md:gap-y-16">
            {CAPABILITIES.map((c) => (
              <div key={c.label} className="max-w-[46ch]">
                <p className="text-[13px] font-medium text-[color:var(--text-tertiary)]">
                  {c.label}
                </p>
                <h3 className="mt-3 text-heading-md text-[color:var(--text-primary)]">
                  {c.heading}
                </h3>
                <p className="mt-3 text-body-md text-[color:var(--text-secondary)]">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function GalleryPeek() {
  const peek = GALLERY_IMAGES.slice(0, 8);
  return (
    <section className="border-t border-[color:var(--border-subtle)]">
      <Reveal>
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 md:py-16 lg:px-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{HOME_ACTION.gallery.title}</p>
              <h2 className="mt-3 max-w-[22ch] text-heading-xl text-[color:var(--text-primary)]">
                {HOME_ACTION.gallery.body}
              </h2>
            </div>
            <Link
              to={ROUTES.gallery}
              className="inline-flex items-center gap-1.5 text-body-sm font-medium text-[color:var(--text-primary)] underline-offset-4 hover:underline"
            >
              Open Gallery <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
            {peek.map((filename, i) => (
              <li key={filename}>
                <Link
                  to={ROUTES.gallery}
                  aria-label={galleryLabel(filename, i)}
                  className="block aspect-square overflow-hidden bg-[color:var(--bg-subtle)]"
                >
                  <img
                    src={`/gallery/${filename}`}
                    alt={galleryLabel(filename, i)}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}

function PricingNote() {
  return (
    <section className="border-t border-[color:var(--border-subtle)]">
      <Reveal>
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 md:py-16 lg:px-12">
          <p className="eyebrow">Credits</p>
          <h2 className="mt-3 max-w-[20ch] text-heading-xl text-[color:var(--text-primary)]">
            {HOME_ACTION.pricingTitle}
          </h2>
          <p className="mt-3 max-w-[48ch] text-body-lg text-[color:var(--text-secondary)]">
            {HOME_ACTION.pricingBody}
          </p>
          <Link
            to={ROUTES.pricing}
            className="mt-5 inline-flex items-center gap-1.5 text-body-sm font-medium text-[color:var(--text-primary)] underline-offset-4 hover:underline"
          >
            See pricing <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="border-t border-[color:var(--border-subtle)]">
      <Reveal>
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 md:py-24 lg:px-12">
          <h2 className="max-w-[14ch] text-heading-xl md:text-display-md text-[color:var(--text-primary)]">
            {HOME_ACTION.finalTitle}
          </h2>
          <div className="mt-8">
            <ProductCtas />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
