import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getCreditBalance } from "@/lib/generation/client";

export interface AccountSummary {
  credits: number | null;
  hasStripeCustomer: boolean;
}

/**
 * Lightweight signed-in summary for the header menu: the authoritative
 * credit total and whether billing actions can work. Extended by the
 * billing layer with plan/period details for the Account page.
 */
export function useAccountSummary(user: User | null): AccountSummary {
  const [summary, setSummary] = useState<AccountSummary>({
    credits: null,
    hasStripeCustomer: false,
  });

  useEffect(() => {
    if (!user) {
      setSummary({ credits: null, hasStripeCustomer: false });
      return;
    }
    let cancelled = false;
    getCreditBalance()
      .then((r) => {
        if (cancelled) return;
        setSummary({
          credits: r.availableCredits,
          hasStripeCustomer: Boolean((r as { hasStripeCustomer?: boolean }).hasStripeCustomer),
        });
      })
      .catch(() => {
        if (!cancelled) setSummary({ credits: null, hasStripeCustomer: false });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return summary;
}
