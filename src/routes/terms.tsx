import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";

const PAGE_URL = absoluteUrl("/terms");

export const Route = createFileRoute("/terms")({
  head: () => {
    const ogImage = getOgImageForPath();
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
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-10 sm:px-6 sm:py-16 lg:px-12">
        <p className="eyebrow mb-2">Terms</p>
        <h1 className="text-display-md">Terms of Service</h1>
      </main>
      <Footer />
    </div>
  );
}
