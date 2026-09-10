import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PRIVACY_MD } from "@/data/legal";
import { renderMarkdown } from "@/lib/markdown";
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
  const { nodes } = useMemo(() => renderMarkdown(PRIVACY_MD), []);
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-[720px] flex-1 px-4 py-12 sm:px-6 sm:py-20">
        <p className="eyebrow">Privacy</p>
        <h1 className="mt-3 text-display-md">Privacy Policy</h1>
        <div className="prose-content mt-10">{nodes}</div>
      </main>
      <Footer />
    </div>
  );
}
