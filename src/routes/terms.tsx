import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import { TERMS_MD } from "@/data/legal";
import { ROUTES, SEO } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import { pageSeoHead } from "@/lib/seo";

const PAGE_URL = absoluteUrl(ROUTES.terms);
const TERMS_INTRO =
  "The rules for using Depikt, subscriptions, image credits, and generated content.";

export const Route = createFileRoute("/terms")({
  head: () => {
    const { meta, links } = pageSeoHead(SEO.terms, {
      url: PAGE_URL,
      image: getOgImageForPath("terms"),
    });
    return { meta, links };
  },
  component: Page,
});

function Page() {
  return <LegalPage eyebrow="Terms" title="Terms of Service" intro={TERMS_INTRO} md={TERMS_MD} />;
}
