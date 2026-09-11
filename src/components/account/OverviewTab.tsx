import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DepiktAvatar } from "@/components/profile/DepiktAvatar";
import { useBuyCredits } from "@/components/billing/BuyCreditsProvider";
import { openBillingPortal } from "@/lib/billing/client";
import { formatShortDate } from "@/lib/billing/credit-state";
import { PLAN_LABEL } from "@/lib/billing/plans";
import { getCreations, type CreationItem } from "@/lib/profile/client";
import { useProfile } from "@/lib/profile/profile-context";
import { AUTH_COPY } from "@/lib/product";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import type { AccountSummaryResponse } from "@/routes/api/billing/account";

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  apple: "Apple",
  azure: "Microsoft",
};

export function OverviewTab({
  summary,
  onViewCreations,
}: {
  summary: AccountSummaryResponse | null;
  onViewCreations: () => void;
}) {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { openBuyCredits } = useBuyCredits();
  const [recent, setRecent] = useState<CreationItem[]>([]);

  useEffect(() => {
    getCreations({ limit: 8 })
      .then((page) => setRecent(page.items))
      .catch(() => setRecent([]));
  }, []);

  const resetDate = summary
    ? formatShortDate(
        summary.billingInterval === "year" ? summary.nextCreditGrantAt : summary.currentPeriodEnd,
      )
    : null;
  const providerLabel = summary?.provider ? PROVIDER_LABEL[summary.provider] : null;

  return (
    <div>
      <h1 className="text-heading-md">Account</h1>

      <div className="mt-5 flex items-center gap-3">
        {profile && (
          <DepiktAvatar seed={profile.avatarSeed} style={profile.avatarVariant} size={56} />
        )}
        <div>
          <p className="text-heading-sm">{profile?.displayName ?? "Depikt Creator"}</p>
          {profile && (
            <p className="text-body-sm text-[color:var(--text-tertiary)]">@{profile.username}</p>
          )}
        </div>
      </div>

      <section className="mt-8 border-t border-[color:var(--border-subtle)] pt-6">
        <p className="eyebrow">YOUR PLAN</p>
        {summary ? (
          <div className="mt-3 space-y-2">
            <p className="text-heading-sm">{PLAN_LABEL[summary.plan]}</p>
            <p className="tabular-nums text-body-md">
              {summary.credits.available} credits remaining
            </p>
            {summary.plan !== "free" && (
              <p className="text-body-sm text-[color:var(--text-secondary)]">
                {summary.credits.plan} included · {summary.credits.extra} extra
              </p>
            )}
            {summary.plan !== "free" && resetDate && (
              <p className="text-body-sm text-[color:var(--text-tertiary)]">
                Credits refresh {resetDate}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={() => openBuyCredits("account_overview")}>
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
                  Manage billing
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-body-sm text-[color:var(--text-tertiary)]">Loading…</p>
        )}
      </section>

      <section className="mt-8 border-t border-[color:var(--border-subtle)] pt-6">
        <p className="eyebrow">RECENT CREATIONS</p>
        {recent.length === 0 ? (
          <p className="mt-3 text-body-sm text-[color:var(--text-tertiary)]">
            Nothing here yet — images you generate or edit will show up here.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {recent.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-md border border-[color:var(--border-subtle)]"
                style={{ aspectRatio: `${item.width} / ${item.height}` }}
              >
                {item.url && <img src={item.url} alt="" className="h-full w-full object-cover" />}
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={onViewCreations}
          className="mt-3 text-body-sm font-medium text-[color:var(--text-primary)] underline underline-offset-4"
        >
          View all creations →
        </button>
      </section>

      <section className="mt-8 border-t border-[color:var(--border-subtle)] pt-6">
        <p className="eyebrow">ACCOUNT</p>
        <p className="mt-3 text-body-sm text-[color:var(--text-secondary)]">
          {providerLabel ? `Signed in with ${providerLabel}` : user?.email}
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void signOut()}>
          {AUTH_COPY.signOut}
        </Button>
      </section>
    </div>
  );
}
