import { createFileRoute, redirect } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GenerateWorkspace } from "@/components/generate/GenerateWorkspace";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { JSONLD_DESCRIPTIONS, JSONLD_NAMES, SEO } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";

const GENERATE_URL = absoluteUrl("/generate");

/**
 * /generate. Behind the native-generation feature flag: while off, this
 * keeps its historical behavior — a permanent redirect to the unified
 * Prompt workspace in Build mode — so nothing about the shipped product
 * changes until GENERATION_ENABLED/VITE_GENERATION_ENABLED is flipped.
 * When on, this is the real generation page (see
 * src/components/generate/GenerateWorkspace.tsx). Canonical metadata is
 * defined unconditionally so it's correct the moment the flag flips.
 */
export const Route = createFileRoute("/generate")({
  validateSearch: (search: Record<string, unknown>) => search,
  beforeLoad: ({ search }) => {
    if (isNativeGenerationEnabled()) return;
    throw redirect({
      to: "/prompt",
      search: { ...(search as Record<string, unknown>), mode: "build" as const },
      replace: true,
      statusCode: 301,
    });
  },
  head: () => {
    const ogImage = getOgImageForPath("generate");
    return {
      meta: [
        { title: SEO.generate.title },
        { name: "description", content: SEO.generate.description },
        { property: "og:title", content: SEO.generate.title },
        { property: "og:description", content: SEO.generate.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: GENERATE_URL },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: SEO.generate.title },
        { name: "twitter:description", content: SEO.generate.description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: GENERATE_URL }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: JSONLD_NAMES.generate,
            url: GENERATE_URL,
            applicationCategory: "DesignApplication",
            operatingSystem: "Any",
            description: JSONLD_DESCRIPTIONS.generate,
          }),
        },
      ],
    };
  },
  component: GeneratePage,
});

function GeneratePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="flex-1">
        <GenerateWorkspace />
      </main>
      <Footer />
    </div>
  );
}
