import { privateScope } from "@/lib/private-cache";
import { AccountContentTabs } from "@/components/account/AccountContentTabs";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useBuyCredits } from "@/components/billing/BuyCreditsProvider";
import { IdentityRow } from "@/components/account/IdentityRow";
import { CreditsCard } from "@/components/account/CreditsCard";
import { CreationsTab } from "@/components/account/CreationsTab";
import { useAccountHub } from "@/components/account/AccountHubProvider";
import { useAuth } from "@/lib/auth-context";
import { confirmCheckout, getAccountSummary } from "@/lib/billing/client";
import { CATALOG, isProductKey } from "@/lib/billing/plans";
import { trackEvent } from "@/lib/analytics";
import { ROUTES, SEO } from "@/lib/product";
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
      { name: "robots", content: SEO.account.robots },
    ],
  }),
  component: AccountPage,
});

/** Full Account page with direct controls and focused settings dialogs. */
function AccountPage() {
  const { user } = useAuth();
  return (
    <OwnedAccountPage key={user ? `${user.id}:${privateScope(user.id).epoch}` : "anonymous"} />
  );
}
function OwnedAccountPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { buy, checkout, session_id: sessionId } = Route.useSearch();
  const { openBuyCredits } = useBuyCredits();
  const hub = useAccountHub();
  const [summary, setSummary] = useState<AccountSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          void navigate({ to: ROUTES.account, replace: true });
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
      void navigate({ to: ROUTES.account, replace: true });
    }
  }, [user, buy, openBuyCredits, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-10 sm:px-6">
          <h1 className="sr-only">Account</h1>
          {loading ? (
            <p className="text-body-sm text-[color:var(--text-tertiary)]">Loading…</p>
          ) : null}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-12">
        <h1 className="sr-only">Account</h1>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-5">
          {/* Identity header card: a soft brand wash, the avatar + name, and
              the two direct account controls. */}
          <section
            aria-label="Profile"
            className="surface-card relative overflow-hidden p-5 sm:p-7 lg:min-h-full"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(70%_120%_at_10%_0%,rgba(255,138,92,0.16),transparent_70%),radial-gradient(60%_120%_at_90%_0%,rgba(139,92,246,0.12),transparent_70%)]"
            />
            <div className="relative">
              <p className="badge-eyebrow">Your studio</p>
              <div className="mt-5">
                <IdentityRow
                  onAvatarClick={() => hub.pushView("avatar-picker")}
                  onEditClick={() => hub.pushView("edit-profile")}
                />
              </div>
              <div id="account-controls" tabIndex={-1} className="mt-6 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 sm:h-10"
                  onClick={() => hub.pushView("edit-profile")}
                >
                  <Settings2 aria-hidden />
                  Profile settings
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 sm:h-10"
                  onClick={() => {
                    void signOut()
                      .then(() => navigate({ to: "/" }))
                      .catch(() => toast.error("Could not sign out. Please try again."));
                  }}
                >
                  <LogOut aria-hidden />
                  Sign out
                </Button>
              </div>
            </div>
          </section>
          <CreditsCard
            summary={summary}
            onUpgrade={() => hub.pushView("upgrade")}
            onBuyCredits={() => hub.pushView("buy-credits")}
          />
        </div>
        <div className="mt-12 sm:mt-14">
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-700"
            >
              {error}
            </p>
          )}
          <AccountContentTabs>
            <CreationsTab />
          </AccountContentTabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
