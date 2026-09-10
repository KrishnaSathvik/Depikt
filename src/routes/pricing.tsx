import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PlanCards } from "@/components/billing/PlanCards";
import { useAuth } from "@/lib/auth-context";
import { useAccountSummary } from "@/lib/billing/use-account-summary";
import { PRICING_COPY } from "@/lib/billing/copy";
import { CATALOG, isProductKey, type BillingInterval, type PlanProduct } from "@/lib/billing/plans";
import { HELP_SECTIONS } from "@/data/legal";
import { trackEvent } from "@/lib/analytics";
import { ROUTES, SEO } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";

const PAGE_URL = absoluteUrl(ROUTES.pricing);

export interface PricingSearch {
  plan?: string;
  interval?: BillingInterval;
}

function planKeyFromSearch(raw: unknown): string | undefined {
  if (!isProductKey(raw)) return undefined;
  const product = CATALOG[raw];
  return product.kind === "plan" ? product.key : undefined;
}

/** Resolves a ?plan= search value to its plan product, never trusting the raw string. */
function resolvePlanProduct(key: string | undefined): PlanProduct | null {
  if (!key || !isProductKey(key)) return null;
  const product = CATALOG[key];
  return product.kind === "plan" ? product : null;
}

export const Route = createFileRoute("/pricing")({
  validateSearch: (search: Record<string, unknown>): PricingSearch => ({
    ...(planKeyFromSearch(search.plan) ? { plan: planKeyFromSearch(search.plan) } : {}),
    ...(search.interval === "year" || search.interval === "month"
      ? { interval: search.interval }
      : {}),
  }),
  head: () => {
    const ogImage = getOgImageForPath("pricing");
    return {
      meta: [
        { title: SEO.pricing.title },
        { name: "description", content: SEO.pricing.description },
        { property: "og:title", content: SEO.pricing.title },
        { property: "og:description", content: SEO.pricing.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: PAGE_URL },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: SEO.pricing.title },
        { name: "twitter:description", content: SEO.pricing.description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: PAGE_URL }],
    };
  },
  component: PricingPage,
});

const FAQ = HELP_SECTIONS.find((s) => s.id === "plans-and-credits")?.items.slice(0, 4) ?? [];

function PricingPage() {
  const { plan: resumeKeyParam, interval: intervalParam } = Route.useSearch();
  const resumeProduct = resolvePlanProduct(resumeKeyParam);
  const resumeKey = resumeProduct?.key ?? null;
  const { user } = useAuth();
  const summary = useAccountSummary(user);
  const [interval, setInterval] = useState<BillingInterval>(
    () => intervalParam ?? resumeProduct?.interval ?? "month",
  );

  useEffect(() => {
    trackEvent("pricing_viewed", { interval });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-12 sm:px-6 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-[640px] text-center">
          <p className="eyebrow">{PRICING_COPY.eyebrow}</p>
          <h1 className="mt-3 text-display-lg">{PRICING_COPY.headline}</h1>
          <p className="mt-4 text-body-lg text-[color:var(--text-secondary)]">{PRICING_COPY.sub}</p>
        </div>

        {resumeProduct && user && (
          <p className="mx-auto mt-8 max-w-[640px] rounded-md border border-[color:var(--border-subtle)] px-4 py-3 text-center text-body-sm text-[color:var(--text-secondary)]">
            You're signed in. Continue with {resumeProduct.plan === "pro" ? "Pro" : "Max"} below
            whenever you're ready.
          </p>
        )}

        <div className="mt-12">
          <PlanCards
            interval={interval}
            onIntervalChange={setInterval}
            currentPlan={summary.plan}
            resumeKey={resumeKey}
          />
        </div>

        <section className="mt-20 border-t border-[color:var(--border-subtle)] pt-10">
          <h2 className="text-heading-md">{PRICING_COPY.faqHeading}</h2>
          <dl className="mt-6 grid gap-8 md:grid-cols-2">
            {FAQ.map((item) => (
              <div key={item.q}>
                <dt className="text-body-md font-medium text-[color:var(--text-primary)]">
                  {item.q}
                </dt>
                <dd className="mt-1.5 text-body-sm text-[color:var(--text-secondary)]">{item.a}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-body-sm text-[color:var(--text-secondary)]">
            More in{" "}
            <Link
              to={ROUTES.help}
              className="underline underline-offset-4 hover:text-[color:var(--text-primary)]"
            >
              Help
            </Link>
            .
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
