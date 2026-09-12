import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { openBillingPortal } from "@/lib/billing/client";
import { formatLongDate, formatShortDate } from "@/lib/billing/credit-state";
import {
  PLAN_LABEL,
  STARTER_CREDITS,
  formatUsd,
  planProduct,
  type PaidPlanKey,
} from "@/lib/billing/plans";
import type { AccountSummaryResponse } from "@/routes/api/billing/account";

/**
 * The one Plan & Credits surface. Small allowance bar (starter for free,
 * included-this-month for paid — never plan+extra combined), extras as a
 * separate number underneath, and annual credit-refresh / subscription-
 * renewal dates kept distinct. Used above Creations on AccountHub home and
 * the /account fallback. `onUpgrade` / `onBuyCredits` open hub views — never
 * /pricing and never a second stacked dialog.
 */
export function CreditsCard({
  summary,
  onUpgrade,
  onBuyCredits,
}: {
  summary: AccountSummaryResponse | null;
  onUpgrade: () => void;
  onBuyCredits: () => void;
}) {
  if (!summary) {
    return (
      <div className="rounded-xl border border-[color:var(--border-subtle)] p-5 sm:p-6">
        <p className="eyebrow">Plan & credits</p>
        <p className="mt-4 text-body-sm text-[color:var(--text-tertiary)]">Loading…</p>
      </div>
    );
  }

  const isPaid = summary.plan !== "free";
  const isAnnual = summary.billingInterval === "year";
  const planName = isPaid
    ? isAnnual
      ? `${PLAN_LABEL[summary.plan]} · Annual`
      : PLAN_LABEL[summary.plan]
    : "Free";

  const priceLine =
    isPaid && summary.billingInterval
      ? (() => {
          const product = planProduct(summary.plan as PaidPlanKey, summary.billingInterval);
          return isAnnual
            ? `${formatUsd(product.priceCents)} / year`
            : `${formatUsd(product.priceCents)} / month`;
        })()
      : null;

  // Monthly: one period end covers both refresh and renew. Annual: credits
  // refresh monthly (nextCreditGrantAt) while the subscription renews yearly
  // (currentPeriodEnd) — never merge those into one line.
  const refreshDate = formatShortDate(
    isAnnual ? summary.nextCreditGrantAt : summary.currentPeriodEnd,
  );
  const renewalDate = isAnnual
    ? formatLongDate(summary.currentPeriodEnd)
    : formatShortDate(summary.currentPeriodEnd);

  const paymentNeedsAttention =
    isPaid &&
    (summary.subscriptionStatus === "past_due" || summary.subscriptionStatus === "unpaid");

  // Included-this-month for a paid plan; the starter grant for free (until
  // a pack purchase makes the "/5" denominator meaningless -- then there's
  // no bar, just the balance). Packs never enter the bar.
  const bar = isPaid
    ? summary.credits.allocation > 0
      ? {
          label: "Included this month",
          numerator: summary.credits.plan,
          denominator: summary.credits.allocation,
        }
      : null
    : summary.credits.extra <= STARTER_CREDITS
      ? { label: "Starter credits", numerator: summary.credits.extra, denominator: STARTER_CREDITS }
      : null;
  const pct = bar ? Math.min(100, Math.round((bar.numerator / bar.denominator) * 100)) : 0;

  return (
    <div className="rounded-xl border border-[color:var(--border-subtle)] p-5 sm:p-6">
      <p className="eyebrow">Plan & credits</p>

      <div className="mt-4">
        <p className="text-heading-sm text-[color:var(--text-primary)]">{planName}</p>
        {priceLine && (
          <p className="mt-0.5 text-body-sm text-[color:var(--text-secondary)]">{priceLine}</p>
        )}
        {/* Monthly paid: renew date lives under the plan name. Annual keeps
            renew on its own labeled row below so it never looks like the
            credit refresh date. */}
        {isPaid && !isAnnual && renewalDate && (
          <p className="mt-0.5 text-body-sm text-[color:var(--text-tertiary)]">
            {summary.cancelAtPeriodEnd ? `Ends ${renewalDate}` : `Renews ${renewalDate}`}
          </p>
        )}
      </div>

      <p className="mt-5 text-display-md tabular-nums text-[color:var(--text-primary)]">
        {summary.credits.available}
      </p>
      <p className="text-body-sm text-[color:var(--text-tertiary)]">credits remaining</p>

      {bar && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-body-sm text-[color:var(--text-secondary)]">
            <span>{bar.label}</span>
            <span className="tabular-nums text-[color:var(--text-primary)]">
              {bar.numerator} / {bar.denominator}
            </span>
          </div>
          {/* Track uses border tone, not --bg-subtle: on a white card #F7F7F7
              is nearly invisible, so the bar looked missing. */}
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-sm bg-[color:var(--border-subtle)]"
            role="progressbar"
            aria-valuenow={bar.numerator}
            aria-valuemin={0}
            aria-valuemax={bar.denominator}
            aria-label={bar.label}
          >
            <div
              className="h-full bg-[color:var(--text-primary)] transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {isPaid && summary.credits.extra > 0 && (
        <div className="mt-4 flex items-baseline justify-between text-body-sm">
          <span className="text-[color:var(--text-secondary)]">Extra credits</span>
          <span className="tabular-nums text-[color:var(--text-primary)]">
            {summary.credits.extra}
          </span>
        </div>
      )}

      {!isPaid && (
        <p className="mt-3 text-body-sm text-[color:var(--text-tertiary)]">
          Starter credits do not refresh.
        </p>
      )}

      {isPaid && !isAnnual && refreshDate && (
        <p className="mt-3 text-body-sm text-[color:var(--text-tertiary)]">
          Included credits refresh {refreshDate}.
        </p>
      )}

      {isPaid && isAnnual && (
        <div className="mt-4 space-y-2 text-body-sm">
          {refreshDate && (
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[color:var(--text-secondary)]">Credits refresh</span>
              <span className="tabular-nums text-[color:var(--text-primary)]">{refreshDate}</span>
            </div>
          )}
          {renewalDate && (
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[color:var(--text-secondary)]">
                {summary.cancelAtPeriodEnd ? "Subscription ends" : "Subscription renews"}
              </span>
              <span className="tabular-nums text-[color:var(--text-primary)]">{renewalDate}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {!isPaid && (
          <Button variant="outline" size="sm" onClick={onUpgrade}>
            View plans
          </Button>
        )}
        {isPaid && summary.plan !== "max" && (
          <Button variant="outline" size="sm" onClick={onUpgrade}>
            Upgrade
          </Button>
        )}
        <Button size="sm" onClick={onBuyCredits}>
          Buy credits
        </Button>
        {isPaid && summary.hasStripeCustomer && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => openBillingPortal().catch(() => toast.error("Could not open billing."))}
          >
            Manage billing
          </Button>
        )}
      </div>

      {paymentNeedsAttention && (
        <div className="mt-4 rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-subtle)] p-3">
          <p className="text-body-sm font-medium text-[color:var(--text-primary)]">
            Payment needs attention.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => openBillingPortal().catch(() => toast.error("Could not open billing."))}
          >
            Update billing
          </Button>
        </div>
      )}
    </div>
  );
}
