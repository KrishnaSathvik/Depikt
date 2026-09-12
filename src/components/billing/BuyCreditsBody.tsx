import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BillingAuthDialog } from "@/components/auth/BillingAuthDialog";
import { useAuth } from "@/lib/auth-context";
import { startCheckout } from "@/lib/billing/client";
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
    } catch {
      setBusy(false);
      toast.error("Could not start checkout. Please try again.");
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
                "flex flex-col items-start rounded-lg border p-5 text-left transition-colors",
                active
                  ? "border-[color:var(--text-primary)]"
                  : "border-[color:var(--border-subtle)] hover:border-[color:var(--border-default)]",
              )}
            >
              <span className="text-body-sm font-medium text-[color:var(--text-primary)]">
                {pack.credits} credits
              </span>
              <span className="mt-2 text-heading-sm tabular-nums text-[color:var(--text-primary)]">
                {formatUsd(pack.priceCents)}
              </span>
              {pack.badge && (
                <span className="mt-1.5 text-[12px] font-medium text-[color:var(--text-tertiary)]">
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
