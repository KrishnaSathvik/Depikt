import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlanCards } from "@/components/billing/PlanCards";
import { useBuyCredits } from "@/components/billing/BuyCreditsProvider";
import { useAuth } from "@/lib/auth-context";
import { openBillingPortal, clearLocalUserData, deleteAccount } from "@/lib/billing/client";
import { formatLongDate, formatShortDate } from "@/lib/billing/credit-state";
import {
  PLAN_LABEL,
  STARTER_CREDITS,
  formatUsd,
  planProduct,
  type BillingInterval,
  type PaidPlanKey,
} from "@/lib/billing/plans";
import { trackEvent } from "@/lib/analytics";
import { AUTH_COPY } from "@/lib/product";
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
 * Everything that isn't a creation or an identity edit: Plan & Credits,
 * sign-in details, and account deletion. No separate Plan & Credits tab or
 * Profile tab -- AccountHeader above already owns identity/avatar/name.
 */
export function AccountTab({ summary }: { summary: AccountSummaryResponse | null }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { openBuyCredits } = useBuyCredits();
  const [showPlans, setShowPlans] = useState(false);
  const [interval, setIntervalState] = useState<BillingInterval>("month");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleSignOut() {
    await signOut();
    void navigate({ to: "/" });
  }

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      await deleteAccount();
      trackEvent("account_deleted", {});
      await clearLocalUserData();
      await signOut();
      toast.success("Your account has been deleted.");
      void navigate({ to: "/", replace: true });
    } catch {
      setDeleting(false);
      toast.error("Could not delete your account. Please try again.");
    }
  }

  if (!summary) {
    return (
      <div>
        <h1 className="text-heading-md">Account</h1>
        <p className="mt-4 text-body-sm text-[color:var(--text-tertiary)]">Loading…</p>
      </div>
    );
  }

  const isPaid = summary.plan !== "free";
  const pastDue =
    summary.subscriptionStatus === "past_due" || summary.subscriptionStatus === "unpaid";
  const includedPct =
    isPaid && summary.credits.allocation > 0
      ? Math.min(100, Math.round((summary.credits.plan / summary.credits.allocation) * 100))
      : 0;
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
    <div className="max-w-[680px]">
      <h1 className="text-heading-md">Account</h1>

      <section className="mt-6 border-t border-[color:var(--border-subtle)] pt-6">
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
              <div className="mt-5">
                <div className="flex items-center justify-between text-body-sm text-[color:var(--text-secondary)]">
                  <span>Included this month</span>
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
              <div className="mt-4 flex items-center justify-between text-body-sm text-[color:var(--text-secondary)]">
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

      <section className="mt-8 flex items-center justify-between gap-4 border-t border-[color:var(--border-subtle)] pt-6">
        <div>
          <p className="eyebrow">SIGN IN</p>
          <p className="mt-1.5 text-body-sm text-[color:var(--text-secondary)]">
            {signedInWithLabel(summary.provider)}
          </p>
          {summary.email && (
            <p className="text-body-sm text-[color:var(--text-tertiary)]">{summary.email}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => void handleSignOut()}>
          {AUTH_COPY.signOut}
        </Button>
      </section>

      <section className="mt-8 border-t border-[color:var(--border-subtle)] pt-6">
        <div className="rounded-lg border border-red-200 bg-red-50/40 p-4">
          <p className="eyebrow text-red-700">Delete account</p>
          <p className="mt-2 text-body-sm text-[color:var(--text-secondary)]">
            Permanently delete your account, creations, references, and credits. This cannot be
            undone.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
            onClick={() => setConfirmOpen(true)}
          >
            Delete account
          </Button>
        </div>
      </section>

      <Dialog open={confirmOpen} onOpenChange={(o) => !deleting && setConfirmOpen(o)}>
        <DialogContent className="max-w-[420px]">
          <DialogTitle className="text-heading-sm">Delete your account?</DialogTitle>
          <DialogDescription className="text-body-sm text-[color:var(--text-secondary)]">
            This permanently removes your Depikt generations and account data. Any active
            subscription is cancelled immediately. Type DELETE to continue.
          </DialogDescription>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            aria-label="Type DELETE to confirm"
            autoComplete="off"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== "DELETE" || deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Deleting…" : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
