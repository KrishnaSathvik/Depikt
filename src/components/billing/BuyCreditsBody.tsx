import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BillingAuthDialog } from "@/components/auth/BillingAuthDialog";
import { useAuth } from "@/lib/auth-context";
import { startCheckout, checkoutErrorMessage } from "@/lib/billing/client";
import { BUY_CREDITS_COPY } from "@/lib/billing/copy";
import { PACK_GATE_HEADLINE } from "@/lib/auth/gate-copy";
import { CREDIT_PACKS, formatUsd, type PackProduct } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

/**
 * The credit-pack picker + Stripe Checkout button -- no Dialog/Sheet of
 * its own. Used by BuyCreditsSheet (the global surface openable from the
 * pricing page, header, and out-of-credits panel) and directly as the
 * AccountHub's own "buy-credits" view, so both surfaces stay pixel-for-
 * pixel identical without duplicating the pack list or checkout logic.
 * Cards, not a radio-row list -- same rounded-border, bold-price treatment
 * as PlanCards' Upgrade cards, so Buy credits and Upgrade read as one
 * consistent system inside the profile.
 */
export function BuyCreditsBody({ source }: { source?: string }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<PackProduct["key"]>("pack_25");
  const [busy, setBusy] = useState(false);
  const [authGate, setAuthGate] = useState(false);

  async function continueToCheckout() {
    if (!user) {
      // Keep the pack: the auth gate remembers it and resumes Checkout once
      // signed in, no need to re-pick after auth.
      setAuthGate(true);
      return;
    }
    setBusy(true);
    try {
      await startCheckout(selected);
    } catch (err) {
      setBusy(false);
      toast.error(checkoutErrorMessage(err));
    }
  }

  return (
    <div data-source={source}>
      <div className="grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label="Credit packs">
        {CREDIT_PACKS.map((pack) => {
          const active = pack.key === selected;
          return (
            <button
              key={pack.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(pack.key)}
              data-analytics-id={`buy-credits-${pack.key}`}
              className={cn(
                "surface-card flex min-h-[112px] flex-col items-start p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2",
                active
                  ? "border-[color:var(--text-primary)] shadow-[0_0_0_1px_var(--text-primary),0_18px_40px_-24px_rgba(17,17,17,0.35)]"
                  : "surface-card-interactive",
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-[15px] font-medium text-[color:var(--text-primary)]">
                  {pack.credits} credits
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    active
                      ? "border-[color:var(--text-primary)] bg-[color:var(--text-primary)]"
                      : "border-[color:var(--border-strong)]",
                  )}
                >
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
              </span>
              <span className="mt-3 text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-[color:var(--text-primary)]">
                {formatUsd(pack.priceCents)}
              </span>
              {pack.badge && (
                <span className="mt-3 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] px-2.5 py-0.5 text-[12px] font-medium text-[color:var(--text-secondary)]">
                  {pack.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-3">
        <Button
          className="w-full"
          size="lg"
          variant="brand"
          disabled={busy}
          onClick={() => void continueToCheckout()}
        >
          {busy ? "Redirecting…" : `${BUY_CREDITS_COPY.continue} →`}
        </Button>
        <p className="text-center text-[12px] leading-relaxed text-[color:var(--text-tertiary)]">
          {BUY_CREDITS_COPY.footer}
          <br />
          {BUY_CREDITS_COPY.rule}
        </p>
      </div>

      <BillingAuthDialog
        open={authGate}
        onOpenChange={setAuthGate}
        headline={PACK_GATE_HEADLINE}
        productKey={selected}
      />
    </div>
  );
}
