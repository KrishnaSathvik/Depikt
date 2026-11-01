import { History, ArrowRight } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { JSONLD_DESCRIPTIONS, JSONLD_NAMES, SEO } from "@/lib/product";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LaunchModule } from "@/components/LaunchModule";
import { CreateWorkspace } from "@/components/CreateWorkspace";
import { validateCreatorSearch } from "@/lib/creator-search";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import { pageSeoHead } from "@/lib/seo";

const HOME_URL = absoluteUrl("/");

export const Route = createFileRoute("/")({
  validateSearch: validateCreatorSearch,
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

function LandingPage() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <Header />
      <main>
        <LaunchModule />
        <section
          id="create"
          className="studio scroll-mt-16 pb-16 pt-10 sm:pb-24 sm:pt-14"
          aria-label="Make something with Depikt"
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <p className="eyebrow text-[color:var(--text-secondary)]">
                Make something with Depikt
              </p>
              <Link
                to="/history"
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-body-sm text-[color:var(--text-secondary)] hover:underline sm:min-h-0"
              >
                <History className="h-3.5 w-3.5" /> History <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
          <CreateWorkspace />
          <p className="mx-auto mt-12 max-w-[1200px] px-4 text-center text-body-sm text-[color:var(--text-secondary)] sm:px-6">
            Need a starting point?{" "}
            <Link
              to="/library"
              className="ml-2 inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
            >
              Browse Library <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
