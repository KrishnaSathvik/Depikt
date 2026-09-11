import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { readPendingCheckout, clearPendingCheckout } from "./pending-intent";
import { startCheckout } from "./client";

/**
 * Mounted once at the app root (BuyCreditsProvider). Fires whenever `user`
 * is signed in and a plan/pack was picked before the OAuth detour —
 * both the full-page-redirect return (fires on first mount, already
 * signed in) and the in-app popup/iframe return (fires when `user` flips
 * from null to a session) are covered by the same effect.
 */
export function useResumeCheckoutOnAuth(user: User | null): void {
  useEffect(() => {
    if (!user) return;
    const pending = readPendingCheckout();
    if (!pending) return;
    clearPendingCheckout();
    void startCheckout(pending);
  }, [user]);
}
