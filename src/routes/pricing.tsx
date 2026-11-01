import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PlanCards } from "@/components/billing/PlanCards";
import { PageHero } from "@/components/PageHero";
import { Capabilities } from "@/components/Capabilities";
import { isGroundingEnabled, isValidationRepairEnabled } from "@/lib/generation/feature-flag";
import { useAuth } from "@/lib/auth-context";
import { useAccountSummary } from "@/lib/billing/use-account-summary";
import { PRICING_COPY } from "@/lib/billing/copy";
import { CATALOG, isProductKey, type BillingInterval, type PlanProduct } from "@/lib/billing/plans";
import { HELP_SECTIONS } from "@/data/legal";
import { trackEvent } from "@/lib/analytics";
import { ROUTES, SEO, homeCapabilities } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import { pageSeoHead } from "@/lib/seo";

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
  // Resolve on the server so client hydration matches the release controls.
  loader: () => ({
    capabilities: homeCapabilities({
      grounding: isGroundingEnabled(),
      validation: isValidationRepairEnabled(),
    }),
  }),
  head: () => {
    const { meta, links } = pageSeoHead(SEO.pricing, {
      url: PAGE_URL,
      image: getOgImageForPath("pricing"),
    });
    return { meta, links };
  },
  component: PricingPage,
});

const PRICING_FAQ_QUESTIONS = [
  "How do monthly credits work?",
  "Do credits roll over?",
  "Can I buy credits without subscribing?",
  "How do annual plans work?",
  "What happens if I cancel?",
];
const planCredits = HELP_SECTIONS.find((s) => s.id === "plans-and-credits")?.items ?? [];
const FAQ = PRICING_FAQ_QUESTIONS.map((q) => planCredits.find((i) => i.q === q)).filter(
  (i): i is (typeof planCredits)[number] => i !== undefined,
);

/** The headline's last two words carry the brand gradient ("…with Depikt."). */
const HEADLINE = (() => {
  const words = PRICING_COPY.headline.split(" ");
  return words.length > 2
    ? { title: words.slice(0, -2).join(" "), accent: words.slice(-2).join(" ") }
    : { title: PRICING_COPY.headline, accent: undefined };
})();

function PricingPage() {
  const { plan: resumeKeyParam, interval: intervalParam } = Route.useSearch();
  const { capabilities } = Route.useLoaderData();
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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-20 pt-14 sm:px-6 sm:pb-28 sm:pt-20">
        <PageHero
          eyebrow={PRICING_COPY.eyebrow}
          title={HEADLINE.title}
          accent={HEADLINE.accent}
          lede={PRICING_COPY.sub}
        />

        {resumeProduct && user && (
          <p className="mt-8 flex max-w-[560px] items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-5 py-3 text-center text-[14px] text-[color:var(--text-secondary)] shadow-[0_1px_2px_rgba(17,17,17,0.04)]">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full bg-[image:var(--brand-gradient)]"
            />
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

        <p className="mt-10 text-[14px] text-[color:var(--text-secondary)]">
          Questions about credits, plans, or billing?{" "}
          <Link
            to={ROUTES.help}
            hash="plans-and-credits"
            className="font-medium text-[color:var(--text-primary)] underline underline-offset-4"
          >
            See Help
          </Link>
          .
        </p>
      </main>
      <Capabilities capabilities={capabilities} />
      <Footer />
    </div>
  );
}
