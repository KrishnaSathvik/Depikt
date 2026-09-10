import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HELP_SECTIONS } from "@/data/legal";
import { ROUTES, SEO } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";

const PAGE_URL = absoluteUrl(ROUTES.help);

export const Route = createFileRoute("/help")({
  head: () => {
    const ogImage = getOgImageForPath("home");
    const faqJsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: HELP_SECTIONS.flatMap((s) =>
        s.items.map((i) => ({
          "@type": "Question",
          name: i.q,
          acceptedAnswer: { "@type": "Answer", text: i.a },
        })),
      ),
    };
    return {
      meta: [
        { title: SEO.help.title },
        { name: "description", content: SEO.help.description },
        { property: "og:title", content: SEO.help.title },
        { property: "og:description", content: SEO.help.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: PAGE_URL },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: SEO.help.title },
        { name: "twitter:description", content: SEO.help.description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: PAGE_URL }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(faqJsonLd) }],
    };
  },
  component: HelpPage,
});

/**
 * Self-service help. Deliberately not "Support": there is no human channel
 * yet, and this page never pretends there is one.
 */
function HelpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-[760px] flex-1 px-4 py-12 sm:px-6 sm:py-20">
        <p className="eyebrow">Help</p>
        <h1 className="mt-3 text-display-md">How Depikt works.</h1>
        <p className="mt-4 text-body-lg text-[color:var(--text-secondary)]">
          Credits, generation, references, billing, and your account.
        </p>

        <nav aria-label="Help sections" className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
          {HELP_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-body-sm text-[color:var(--text-secondary)] underline-offset-4 hover:text-[color:var(--text-primary)] hover:underline"
            >
              {s.title}
            </a>
          ))}
        </nav>

        {HELP_SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="mt-14 scroll-mt-24 border-t border-[color:var(--border-subtle)] pt-8"
          >
            <h2 className="text-heading-md">{section.title}</h2>
            <dl className="mt-6 space-y-8">
              {section.items.map((item) => (
                <div key={item.q}>
                  <dt className="text-body-md font-medium text-[color:var(--text-primary)]">
                    {item.q}
                  </dt>
                  <dd className="mt-2 text-body-md leading-relaxed text-[color:var(--text-secondary)]">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}
