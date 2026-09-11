import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useBuyCredits } from "@/components/billing/BuyCreditsProvider";
import { AccountTabs } from "@/components/account/AccountTabs";
import { AccountRail } from "@/components/account/AccountRail";
import { CreationsTab } from "@/components/account/CreationsTab";
import { ProfileTab } from "@/components/account/ProfileTab";
import { PlanTab } from "@/components/account/PlanTab";
import { useAuth } from "@/lib/auth-context";
import { confirmCheckout, getAccountSummary } from "@/lib/billing/client";
import { CATALOG, isProductKey } from "@/lib/billing/plans";
import { trackEvent } from "@/lib/analytics";
import { ROUTES, SEO } from "@/lib/product";
import { DEFAULT_ACCOUNT_TAB, isAccountTabId, type AccountTabId } from "@/lib/profile/account-tabs";
import type { AccountSummaryResponse } from "@/routes/api/billing/account";

export interface AccountSearch {
  buy?: string;
  checkout?: string;
  session_id?: string;
  tab?: AccountTabId;
}

export const Route = createFileRoute("/account")({
  validateSearch: (search: Record<string, unknown>): AccountSearch => ({
    ...(typeof search.buy === "string" ? { buy: search.buy } : {}),
    ...(typeof search.checkout === "string" ? { checkout: search.checkout } : {}),
    ...(typeof search.session_id === "string" ? { session_id: search.session_id } : {}),
    ...(isAccountTabId(search.tab) ? { tab: search.tab } : {}),
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

function AccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { buy, checkout, session_id: sessionId, tab } = Route.useSearch();
  const { openBuyCredits } = useBuyCredits();
  const [summary, setSummary] = useState<AccountSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // No tab in the URL (e.g. the header avatar's identity click) -> Profile;
  // an explicit ?tab= (e.g. "My creations" in the account menu) wins.
  const activeTab: AccountTabId = tab ?? DEFAULT_ACCOUNT_TAB;
  function setActiveTab(next: AccountTabId) {
    trackEvent("account_tab_changed", {});
    void navigate({ to: ROUTES.account, search: { tab: next }, replace: true });
  }

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
          void navigate({ to: ROUTES.account, search: { tab: "plan" }, replace: true });
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
      void navigate({ to: ROUTES.account, search: { tab: activeTab }, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, buy, openBuyCredits, navigate]);

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
        <Header />
        <main className="flex-1" />
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="lg:hidden">
          <AccountTabs active={activeTab} onChange={setActiveTab} />
        </div>
        <div className="lg:flex lg:items-start lg:gap-10">
          <AccountRail active={activeTab} onChange={setActiveTab} />
          <div className="mt-8 min-w-0 flex-1 lg:mt-0">
            {error && <p className="mb-4 text-body-sm text-red-600">{error}</p>}
            {activeTab === "creations" && <CreationsTab />}
            {activeTab === "profile" && <ProfileTab />}
            {activeTab === "plan" && <PlanTab summary={summary} />}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
