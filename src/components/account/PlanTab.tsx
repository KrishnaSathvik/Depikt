import { Button } from "@/components/ui/button";
import { useBuyCredits } from "@/components/billing/BuyCreditsProvider";
import { openBillingPortal } from "@/lib/billing/client";
import { formatLongDate, formatShortDate } from "@/lib/billing/credit-state";
import { PLAN_LABEL } from "@/lib/billing/plans";
import { ROUTES } from "@/lib/product";
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

  return (
    <div>
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
            {summary.hasStripeCustomer ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  openBillingPortal().catch(() => toast.error("Could not open billing."))
                }
              >
                Manage billing →
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <a href={ROUTES.pricing}>View plans →</a>
              </Button>
            )}
            {summary.plan === "pro" && (
              <Button variant="ghost" size="sm" asChild>
                <a href={ROUTES.pricing}>Upgrade to Max →</a>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 border-t border-[color:var(--border-subtle)] pt-6">
        <p className="eyebrow">CREDITS</p>
        <div className="mt-3 space-y-3">
          <p className="text-heading-sm tabular-nums">
            {summary.credits.available} credits remaining
          </p>
          <dl className="grid gap-1 text-body-sm text-[color:var(--text-secondary)]">
            {summary.plan !== "free" && (
              <div className="flex justify-between gap-4">
                <dt>Included this month</dt>
                <dd className="tabular-nums text-[color:var(--text-primary)]">
                  {summary.credits.plan} of {summary.credits.allocation}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt>Extra</dt>
              <dd className="tabular-nums text-[color:var(--text-primary)]">
                {summary.credits.extra}
              </dd>
            </div>
            {summary.plan !== "free" && resetDate && (
              <div className="flex justify-between gap-4">
                <dt>Included credits refresh</dt>
                <dd className="text-[color:var(--text-primary)]">{resetDate}</dd>
              </div>
            )}
            {summary.plan === "free" && (
              <p className="text-body-sm text-[color:var(--text-tertiary)]">
                Starter credits do not refresh.
              </p>
            )}
          </dl>
          <div className="pt-1">
            <Button size="sm" onClick={() => openBuyCredits("account")}>
              Buy credits
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
