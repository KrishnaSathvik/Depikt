import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getCreditBalance } from "@/lib/generation/client";
import type { PlanKey } from "@/lib/billing/plans";

export interface AccountSummary {
  credits: number | null;
  hasStripeCustomer: boolean;
  plan: PlanKey | null;
}

const EMPTY: AccountSummary = { credits: null, hasStripeCustomer: false, plan: null };

/**
 * Lightweight signed-in summary for the header menu and pricing page: the
 * authoritative credit total, current plan, and whether billing actions can
 * work. Extended by the billing layer with period details for the Account
 * page (see /api/billing/account).
 */
export function useAccountSummary(user: User | null): AccountSummary {
  const [summary, setSummary] = useState<AccountSummary>(EMPTY);

  useEffect(() => {
    if (!user) {
      setSummary(EMPTY);
      return;
    }
    let cancelled = false;
    getCreditBalance()
      .then((r) => {
        if (cancelled) return;
        setSummary({
          credits: r.availableCredits,
          hasStripeCustomer: Boolean((r as { hasStripeCustomer?: boolean }).hasStripeCustomer),
          plan: ((r as { plan?: string }).plan as PlanKey | undefined) ?? "free",
        });
      })
      .catch(() => {
        if (!cancelled) setSummary(EMPTY);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return summary;
}
