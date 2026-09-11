import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import { PRIVACY_INTRO, PRIVACY_MD } from "@/data/legal";
import { ROUTES, SEO } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";

const PAGE_URL = absoluteUrl(ROUTES.privacy);

export const Route = createFileRoute("/privacy")({
  head: () => {
    const ogImage = getOgImageForPath("home");
    return {
      meta: [
        { title: SEO.privacy.title },
        { name: "description", content: SEO.privacy.description },
        { property: "og:title", content: SEO.privacy.title },
        { property: "og:description", content: SEO.privacy.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: PAGE_URL },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: SEO.privacy.title },
        { name: "twitter:description", content: SEO.privacy.description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: PAGE_URL }],
    };
  },
  component: Page,
});

function Page() {
  return (
    <LegalPage eyebrow="Privacy" title="Privacy Policy" intro={PRIVACY_INTRO} md={PRIVACY_MD} />
  );
}
