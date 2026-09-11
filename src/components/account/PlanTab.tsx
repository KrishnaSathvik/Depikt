import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useBuyCredits } from "@/components/billing/BuyCreditsProvider";
import { PlanCards } from "@/components/billing/PlanCards";
import { openBillingPortal } from "@/lib/billing/client";
import { formatLongDate, formatShortDate } from "@/lib/billing/credit-state";
import { PLAN_LABEL, type BillingInterval } from "@/lib/billing/plans";
import { toast } from "sonner";
import type { AccountSummaryResponse } from "@/routes/api/billing/account";

function planLine(s: AccountSummaryResponse): { main: string; sub: string | null } {
  if (s.plan === "free") return { main: PLAN_LABEL.free, sub: null };
  const name = PLAN_LABEL[s.plan];
  const periodEnd = formatShortDate(s.currentPeriodEnd);
  const periodEndLong = formatLongDate(s.currentPeriodEnd);
  if (s.billingInterval === "year") {
    const refresh = formatShortDate(s.nextCreditGrantAt);
    return {
      main: `${name} · Annual`,
      sub: s.cancelAtPeriodEnd
        ? `Plan ends ${periodEndLong ?? "at the end of the paid year"}${refresh ? ` · Credits refresh ${refresh}` : ""}`
        : `${refresh ? `Credits refresh ${refresh} · ` : ""}Subscription renews ${periodEndLong ?? "yearly"}`,
    };
  }
  return {
    main: s.cancelAtPeriodEnd
      ? `${name} · Ends ${periodEnd ?? "at period end"}`
      : `${name} · Renews ${periodEnd ?? "monthly"}`,
    sub: null,
  };
}

export function PlanTab({ summary }: { summary: AccountSummaryResponse | null }) {
  const { openBuyCredits } = useBuyCredits();
  const [showPlans, setShowPlans] = useState(false);
  const [interval, setIntervalState] = useState<BillingInterval>("month");

  if (!summary) {
    return (
      <div>
        <h1 className="text-heading-md">Plan &amp; Credits</h1>
        <p className="mt-4 text-body-sm text-[color:var(--text-tertiary)]">Loading…</p>
      </div>
    );
  }

  const plan = planLine(summary);
  const resetDate = formatShortDate(
    summary.billingInterval === "year" ? summary.nextCreditGrantAt : summary.currentPeriodEnd,
  );
  const pastDue =
    summary.subscriptionStatus === "past_due" || summary.subscriptionStatus === "unpaid";
  const isPaid = summary.plan !== "free";
  const includedPct =
    isPaid && summary.credits.allocation > 0
      ? Math.min(100, Math.round((summary.credits.plan / summary.credits.allocation) * 100))
      : 0;

  return (
    <div className="max-w-[680px]">
      <h1 className="text-heading-md">Plan &amp; Credits</h1>

      <section className="mt-6 border-t border-[color:var(--border-subtle)] pt-6">
        <p className="eyebrow">PLAN</p>
        <div className="mt-3 space-y-3">
          <p className="text-heading-sm">{plan.main}</p>
          {plan.sub && (
            <p className="text-body-sm text-[color:var(--text-secondary)]">{plan.sub}</p>
          )}
          {pastDue && (
            <p className="rounded-md border border-[color:var(--border-default)] px-3 py-2 text-body-sm">
              Payment failed. Update billing to keep your monthly credits.
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
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
            <div className="pt-4">
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

      <section className="mt-8 border-t border-[color:var(--border-subtle)] pt-6">
        <p className="eyebrow">CREDITS</p>
        <div className="mt-3">
          <p className="text-display-md tabular-nums text-[color:var(--text-primary)]">
            {summary.credits.available}
          </p>
          <p className="text-body-sm text-[color:var(--text-tertiary)]">credits remaining</p>

          {isPaid && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-body-sm text-[color:var(--text-secondary)]">
                <span>Included</span>
                <span className="tabular-nums text-[color:var(--text-primary)]">
                  {summary.credits.plan} / {summary.credits.allocation}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--bg-subtle)]">
                <div
                  className="h-full rounded-full bg-[color:var(--text-primary)]"
                  style={{ width: `${includedPct}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-body-sm text-[color:var(--text-secondary)]">
            <span>Extra</span>
            <span className="tabular-nums text-[color:var(--text-primary)]">
              {summary.credits.extra}
            </span>
          </div>

          <p className="mt-3 text-body-sm text-[color:var(--text-tertiary)]">
            {isPaid && resetDate
              ? `Included credits refresh ${resetDate}.`
              : "Starter credits do not refresh."}
          </p>

          <div className="mt-4">
            <Button size="sm" onClick={() => openBuyCredits("account")}>
              Buy credits
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
