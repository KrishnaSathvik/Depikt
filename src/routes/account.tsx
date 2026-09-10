import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBuyCredits } from "@/components/billing/BuyCreditsProvider";
import { useAuth } from "@/lib/auth-context";
import {
  clearLocalUserData,
  confirmCheckout,
  deleteAccount,
  getAccountSummary,
  openBillingPortal,
} from "@/lib/billing/client";
import { formatLongDate, formatShortDate } from "@/lib/billing/credit-state";
import { CATALOG, PLAN_LABEL, isProductKey } from "@/lib/billing/plans";
import { trackEvent } from "@/lib/analytics";
import { AUTH_COPY, ROUTES, SEO } from "@/lib/product";
import type { AccountSummaryResponse } from "@/routes/api/billing/account";

export interface AccountSearch {
  buy?: string;
  checkout?: string;
  session_id?: string;
}

export const Route = createFileRoute("/account")({
  validateSearch: (search: Record<string, unknown>): AccountSearch => ({
    ...(typeof search.buy === "string" ? { buy: search.buy } : {}),
    ...(typeof search.checkout === "string" ? { checkout: search.checkout } : {}),
    ...(typeof search.session_id === "string" ? { session_id: search.session_id } : {}),
  }),
  head: () => ({
    meta: [
      { title: SEO.account.title },
      { name: "description", content: SEO.account.description },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccountPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[color:var(--border-subtle)] py-8 first:border-t-0 first:pt-0">
      <p className="eyebrow">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

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

function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { buy, checkout, session_id: sessionId } = Route.useSearch();
  const { openBuyCredits } = useBuyCredits();
  const [summary, setSummary] = useState<AccountSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: ROUTES.signIn, search: { next: ROUTES.account }, replace: true });
    }
  }, [loading, user, navigate]);

  const load = useCallback(async () => {
    try {
      setSummary(await getAccountSummary());
      setError(null);
    } catch {
      setError("Could not load your account right now.");
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  // Landing-page fulfillment after Checkout (the webhook stays authoritative).
  useEffect(() => {
    if (!user || checkout !== "success" || !sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await confirmCheckout(sessionId);
        if (cancelled) return;
        const key = isProductKey(r.productKey) ? r.productKey : null;
        const value = key ? CATALOG[key].priceCents / 100 : undefined;
        if (r.result.kind === "pack" && r.result.fulfilled) {
          trackEvent("credit_purchase_completed", {
            product_key: key,
            transaction_id: sessionId,
            value,
            currency: "USD",
          });
          toast.success("Credits added to your account.");
        } else if (r.result.kind === "subscription") {
          trackEvent("checkout_completed", {
            product_key: key,
            transaction_id: sessionId,
            value,
            currency: "USD",
          });
          toast.success("Your plan is active.");
        } else if (r.paymentStatus !== "paid") {
          toast.message("Payment is still processing. Your credits will appear once it completes.");
        }
      } catch {
        toast.message("We're confirming your payment. This can take a moment.");
      } finally {
        if (!cancelled) {
          void load();
          void navigate({ to: ROUTES.account, search: {}, replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, checkout, sessionId, load, navigate]);

  useEffect(() => {
    if (user && buy === "1") {
      openBuyCredits("account_param");
      void navigate({ to: ROUTES.account, search: {}, replace: true });
    }
  }, [user, buy, openBuyCredits, navigate]);

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

  const plan = summary ? planLine(summary) : null;
  const resetDate = summary
    ? formatShortDate(
        summary.billingInterval === "year" ? summary.nextCreditGrantAt : summary.currentPeriodEnd,
      )
    : null;
  const pastDue =
    summary?.subscriptionStatus === "past_due" || summary?.subscriptionStatus === "unpaid";

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 py-12 sm:px-6 sm:py-16">
        {user && (
          <>
            <Section title="ACCOUNT">
              <p className="text-body-md text-[color:var(--text-secondary)]">
                Signed in as <span className="text-[color:var(--text-primary)]">{user.email}</span>
              </p>
            </Section>

            {error && <p className="text-body-sm text-red-600">{error}</p>}

            <Section title="PLAN">
              {summary ? (
                <div className="space-y-3">
                  <p className="text-heading-sm">{plan?.main}</p>
                  {plan?.sub && (
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
                  </div>
                </div>
              ) : (
                <p className="text-body-sm text-[color:var(--text-tertiary)]">Loading…</p>
              )}
            </Section>

            <Section title="CREDITS">
              {summary ? (
                <div className="space-y-3">
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
                        <dt>Plan credits reset</dt>
                        <dd className="text-[color:var(--text-primary)]">{resetDate}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="pt-1">
                    <Button size="sm" onClick={() => openBuyCredits("account")}>
                      Buy credits
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-body-sm text-[color:var(--text-tertiary)]">Loading…</p>
              )}
            </Section>

            <Section title="USAGE">
              {summary && summary.usage.length > 0 ? (
                <ul className="divide-y divide-[color:var(--border-subtle)]">
                  {summary.usage.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center justify-between gap-4 py-2 text-body-sm"
                    >
                      <span className="text-[color:var(--text-secondary)]">
                        {formatLongDate(u.createdAt)}
                      </span>
                      <span className="text-[color:var(--text-primary)]">
                        {u.operation === "edit" ? "Edit" : "Generate"}
                      </span>
                      <span className="text-[color:var(--text-secondary)]">
                        {u.creditCost} credit
                      </span>
                      <span className="text-[color:var(--text-tertiary)]">{u.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-sm text-[color:var(--text-tertiary)]">
                  No image operations yet.
                </p>
              )}
            </Section>

            <Section title="ACCOUNT">
              <Button variant="outline" size="sm" onClick={() => void signOut()}>
                {AUTH_COPY.signOut}
              </Button>
            </Section>

            <Section title="DANGER">
              <p className="text-body-sm text-[color:var(--text-secondary)]">
                Deleting your account removes your generations, references, credits, and any active
                subscription. This cannot be undone.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => setConfirmOpen(true)}
              >
                Delete account
              </Button>
            </Section>
          </>
        )}
      </main>
      <Footer />

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
