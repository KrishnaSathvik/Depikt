import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import { TERMS_MD } from "@/data/legal";
import { ROUTES, SEO } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";

const PAGE_URL = absoluteUrl(ROUTES.terms);
const TERMS_INTRO =
  "The rules for using Depikt, subscriptions, image credits, and generated content.";

export const Route = createFileRoute("/terms")({
  head: () => {
    const ogImage = getOgImageForPath("home");
    return {
      meta: [
        { title: SEO.terms.title },
        { name: "description", content: SEO.terms.description },
        { property: "og:title", content: SEO.terms.title },
        { property: "og:description", content: SEO.terms.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: PAGE_URL },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: SEO.terms.title },
        { name: "twitter:description", content: SEO.terms.description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: PAGE_URL }],
    };
  },
  component: Page,
});

function Page() {
  return <LegalPage eyebrow="Terms" title="Terms of Service" intro={TERMS_INTRO} md={TERMS_MD} />;
}
