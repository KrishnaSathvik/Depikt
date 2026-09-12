import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { openBillingPortal } from "@/lib/billing/client";
import { formatShortDate } from "@/lib/billing/credit-state";
import { PLAN_LABEL, STARTER_CREDITS } from "@/lib/billing/plans";
import type { AccountSummaryResponse } from "@/routes/api/billing/account";

/**
 * The one Plan & Credits surface: a plan name, the credit total, a single
 * progress bar (included-this-month for a paid plan, the starter grant for
 * free), and Buy credits front and centre -- no separate Account page to
 * visit for any of this. Used above the Creations grid on both the
 * AccountHub's home view and the full-page /account fallback, so it's
 * always "outside", never behind another click. `onUpgrade` and
 * `onBuyCredits` both open a view inside the same AccountHub (plans,
 * credit packs) -- never a navigation to /pricing and never a second,
 * separate dialog stacked on top of the profile.
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
        <p className="text-body-sm text-[color:var(--text-tertiary)]">Loading…</p>
      </div>
    );
  }

  const isPaid = summary.plan !== "free";
  const planName = isPaid ? PLAN_LABEL[summary.plan] : "Free";
  const refreshDate = formatShortDate(
    summary.billingInterval === "year" ? summary.nextCreditGrantAt : summary.currentPeriodEnd,
  );

  // Included-this-month for a paid plan; the starter grant for free (until
  // a pack purchase makes the "/5" denominator meaningless -- then there's
  // no bar, just the extra total below).
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{planName}</p>
          <p className="mt-2 text-display-md tabular-nums text-[color:var(--text-primary)]">
            {summary.credits.available}
          </p>
          <p className="text-body-sm text-[color:var(--text-tertiary)]">credits remaining</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            {summary.plan !== "max" && (
              <Button variant="outline" size="sm" onClick={onUpgrade}>
                Upgrade
              </Button>
            )}
            <Button size="sm" onClick={onBuyCredits}>
              Buy credits
            </Button>
          </div>
          {summary.hasStripeCustomer && (
            <button
              type="button"
              onClick={() =>
                openBillingPortal().catch(() => toast.error("Could not open billing."))
              }
              className="text-body-sm text-[color:var(--text-secondary)] underline-offset-4 hover:text-[color:var(--text-primary)] hover:underline"
            >
              Manage billing
            </button>
          )}
        </div>
      </div>

      {bar && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-body-sm text-[color:var(--text-secondary)]">
            <span>{bar.label}</span>
            <span className="tabular-nums text-[color:var(--text-primary)]">
              {bar.numerator} / {bar.denominator}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[color:var(--bg-subtle)]">
            <div
              className="h-full rounded-full bg-[color:var(--text-primary)] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {isPaid && summary.credits.extra > 0 && (
        <p className="mt-3 text-body-sm text-[color:var(--text-secondary)]">
          + {summary.credits.extra} extra credit{summary.credits.extra === 1 ? "" : "s"}
        </p>
      )}
      {refreshDate && (
        <p className="mt-1 text-body-sm text-[color:var(--text-tertiary)]">
          Refreshes {refreshDate}.
        </p>
      )}
    </div>
  );
}
