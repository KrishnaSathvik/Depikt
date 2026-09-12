import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlanCards } from "@/components/billing/PlanCards";
import { useBuyCredits } from "@/components/billing/BuyCreditsProvider";
import { openBillingPortal } from "@/lib/billing/client";
import { formatLongDate, formatShortDate } from "@/lib/billing/credit-state";
import {
  PLAN_LABEL,
  STARTER_CREDITS,
  formatUsd,
  planProduct,
  type BillingInterval,
  type PaidPlanKey,
} from "@/lib/billing/plans";
import type { AccountSummaryResponse } from "@/routes/api/billing/account";

/** "google" -> "Google", "azure" -> "Microsoft" (Supabase's provider id for
 *  it), missing/"email" -> "Email". Unknown ids fall back to Title Case. */
function signedInWithLabel(raw: string | null): string {
  if (!raw || raw === "email") return "Email";
  const known: Record<string, string> = {
    google: "Google",
    apple: "Apple",
    azure: "Microsoft",
    microsoft: "Microsoft",
    lovable: "Lovable",
  };
  return known[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
}

function planTitle(s: AccountSummaryResponse): string {
  if (s.plan === "free") return "Free";
  const name = PLAN_LABEL[s.plan];
  return s.billingInterval === "year" ? `${name} · Annual` : name;
}

function priceLine(s: AccountSummaryResponse): string | null {
  if (s.plan === "free") return null;
  const product = planProduct(s.plan as PaidPlanKey, s.billingInterval ?? "month");
  return `${formatUsd(product.priceCents)} / ${s.billingInterval === "year" ? "year" : "month"}`;
}

function renewalLine(s: AccountSummaryResponse): string | null {
  if (s.plan === "free") return null;
  if (s.billingInterval === "year") {
    return s.cancelAtPeriodEnd
      ? `Plan ends ${formatLongDate(s.currentPeriodEnd) ?? "at the end of the paid year"}`
      : `Subscription renews ${formatLongDate(s.currentPeriodEnd) ?? "yearly"}`;
  }
  return s.cancelAtPeriodEnd
    ? `Ends ${formatShortDate(s.currentPeriodEnd) ?? "at period end"}`
    : `Renews ${formatShortDate(s.currentPeriodEnd) ?? "monthly"}`;
}

/**
 * Plan & Credits and sign-in details -- everything in the Account tab/view
 * that isn't the identity row (see [[IdentityRow]]) and isn't Sign out or
 * Delete account, both of which live only in the AccountHub's home view
 * now (see [[DeleteAccountAction]]) rather than duplicated here. Hosted
 * separately by whoever renders this: the full-page Account tab and the
 * AccountHub's "account" view both mount this component and nothing else.
 */
export function AccountPanels({ summary }: { summary: AccountSummaryResponse | null }) {
  const { openBuyCredits } = useBuyCredits();
  const [showPlans, setShowPlans] = useState(false);
  const [interval, setIntervalState] = useState<BillingInterval>("month");

  if (!summary) {
    return <p className="text-body-sm text-[color:var(--text-tertiary)]">Loading…</p>;
  }

  const isPaid = summary.plan !== "free";
  const pastDue =
    summary.subscriptionStatus === "past_due" || summary.subscriptionStatus === "unpaid";
  // Free: extra IS the starter grant (until they also buy a pack, at which
  // point the "/5" denominator stops meaning anything -- just drop it then).
  const starterFraction =
    !isPaid && summary.credits.extra <= STARTER_CREDITS
      ? `${summary.credits.extra} / ${STARTER_CREDITS}`
      : null;
  const refreshDate = formatShortDate(
    summary.billingInterval === "year" ? summary.nextCreditGrantAt : summary.currentPeriodEnd,
  );

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-[color:var(--border-subtle)] p-5 sm:p-6">
          <p className="eyebrow">PLAN &amp; CREDITS</p>

          <div className="mt-3">
            <p className="text-heading-sm">{planTitle(summary)}</p>
            {priceLine(summary) && (
              <p className="mt-0.5 text-body-sm text-[color:var(--text-secondary)]">
                {priceLine(summary)}
              </p>
            )}
            {renewalLine(summary) && (
              <p className="mt-0.5 text-body-sm text-[color:var(--text-secondary)]">
                {renewalLine(summary)}
              </p>
            )}
          </div>

          {pastDue && (
            <p className="mt-3 rounded-md border border-[color:var(--border-default)] px-3 py-2 text-body-sm">
              Payment failed. Update billing to keep your monthly credits.
            </p>
          )}

          <div className="mt-6">
            <p className="text-display-md tabular-nums text-[color:var(--text-primary)]">
              {summary.credits.available}
            </p>
            <p className="text-body-sm text-[color:var(--text-tertiary)]">credits remaining</p>

            {isPaid ? (
              <>
                {/* Included-this-month usage now lives in the AccountHub
                    home view (visible the moment the hub opens), not
                    duplicated here -- see AccountHub.tsx's HomeView. */}
                <div className="mt-5 flex items-center justify-between text-body-sm text-[color:var(--text-secondary)]">
                  <span>Extra credits</span>
                  <span className="tabular-nums text-[color:var(--text-primary)]">
                    {summary.credits.extra}
                  </span>
                </div>
                {refreshDate && (
                  <p className="mt-3 text-body-sm text-[color:var(--text-tertiary)]">
                    Credits refresh {refreshDate}.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="mt-5 flex items-center justify-between text-body-sm text-[color:var(--text-secondary)]">
                  <span>Starter credits</span>
                  <span className="tabular-nums text-[color:var(--text-primary)]">
                    {starterFraction ?? summary.credits.extra}
                  </span>
                </div>
                <p className="mt-3 text-body-sm text-[color:var(--text-tertiary)]">
                  Starter credits do not refresh.
                </p>
              </>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => openBuyCredits("account")}>
                Buy credits
              </Button>
              {summary.hasStripeCustomer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    openBillingPortal().catch(() => toast.error("Could not open billing."))
                  }
                >
                  Manage billing →
                </Button>
              )}
              {summary.plan !== "max" && (
                <Button variant="outline" size="sm" onClick={() => setShowPlans((v) => !v)}>
                  {showPlans
                    ? "Hide plans"
                    : summary.plan === "pro"
                      ? "Upgrade to Max →"
                      : "View plans →"}
                </Button>
              )}
            </div>
            {showPlans && (
              <div className="pt-6">
                <PlanCards
                  interval={interval}
                  onIntervalChange={setIntervalState}
                  currentPlan={summary.plan}
                  hideFree
                  hidePacks
                />
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[color:var(--border-subtle)] p-5 sm:p-6">
          <p className="eyebrow">ACCOUNT ACCESS</p>
          <p className="mt-3 text-body-sm text-[color:var(--text-secondary)]">
            Signed in with {signedInWithLabel(summary.provider)}
          </p>
          {/* Email lives in the AccountHub's home view now, next to Sign
              out, not duplicated here -- see AccountHub.tsx's HomeView. */}
        </section>
      </div>
    </div>
  );
}
