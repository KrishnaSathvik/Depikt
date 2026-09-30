import { History, ArrowRight } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  HOME_ACTION,
  homeCapabilities,
  JSONLD_DESCRIPTIONS,
  JSONLD_NAMES,
  SEO,
} from "@/lib/product";
import { isGroundingEnabled, isValidationRepairEnabled } from "@/lib/generation/feature-flag";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LaunchModule } from "@/components/LaunchModule";
import { CreateWorkspace } from "@/components/CreateWorkspace";
import { validateCreatorSearch } from "@/lib/creator-search";
import { useEffect, useRef, type ReactNode } from "react";

import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import { pageSeoHead } from "@/lib/seo";

const HOME_URL = absoluteUrl("/");

export const Route = createFileRoute("/")({
  validateSearch: validateCreatorSearch,
  // Resolve on the server so client hydration matches the release controls.
  loader: () => ({
    capabilities: homeCapabilities({
      grounding: isGroundingEnabled(),
      validation: isValidationRepairEnabled(),
    }),
  }),
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
      <main>
        <LaunchModule />
        <section
          id="create"
          className="scroll-mt-28 py-8 sm:py-10"
          aria-label="Make something with Depikt"
        >
          <div className="mx-auto max-w-[1040px] px-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-heading-xl">Make something with Depikt</h1>
              <Link
                to="/history"
                className="inline-flex shrink-0 items-center gap-1.5 text-body-sm text-[color:var(--text-secondary)] hover:underline"
              >
                <History className="h-3.5 w-3.5" /> History <span aria-hidden>→</span>
              </Link>
            </div>
            <p className="mt-3 text-body-md text-[color:var(--text-secondary)]">
              Describe what you want to create.
            </p>
          </div>
          <CreateWorkspace />
          <p className="mx-auto mt-6 max-w-[1040px] px-4 text-body-sm sm:px-6">
            Need a starting point?{" "}
            <Link
              to="/library"
              className="ml-2 inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
            >
              Browse Library <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </section>
        <Capabilities />
      </main>
      <Footer />
    </div>
  );
}

function Capabilities() {
  const { capabilities } = Route.useLoaderData();
  return (
    <section className="border-t border-[color:var(--border-subtle)]">
      <Reveal>
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 md:py-20 lg:px-12">
          <h2 className="max-w-[22ch] text-heading-xl text-[color:var(--text-primary)] md:text-display-md">
            {HOME_ACTION.capabilitiesTitle}
          </h2>
          <div className="mt-12 grid gap-12 md:grid-cols-2 md:gap-x-16 md:gap-y-16">
            {capabilities.map((c) => (
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
