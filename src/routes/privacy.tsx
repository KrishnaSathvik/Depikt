import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import { PRIVACY_INTRO, PRIVACY_MD } from "@/data/legal";
import { ROUTES, SEO } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import { pageSeoHead } from "@/lib/seo";

const PAGE_URL = absoluteUrl(ROUTES.privacy);

export const Route = createFileRoute("/privacy")({
  head: () => {
    const { meta, links } = pageSeoHead(SEO.privacy, {
      url: PAGE_URL,
      image: getOgImageForPath("privacy"),
    });
    return { meta, links };
  },
  component: Page,
});

function Page() {
  return (
    <LegalPage eyebrow="Privacy" title="Privacy Policy" intro={PRIVACY_INTRO} md={PRIVACY_MD} />
  );
}
