import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BillingAuthDialog } from "@/components/auth/BillingAuthDialog";
import { useAuth } from "@/lib/auth-context";
import { startCheckout } from "@/lib/billing/client";
import { BUY_CREDITS_COPY } from "@/lib/billing/copy";
import { PACK_GATE_HEADLINE } from "@/lib/auth/gate-copy";
import { CREDIT_PACKS, formatUsd, type PackProduct } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

export interface BuyCreditsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
}

/**
 * The one credit-purchase surface. Three packs from the catalog, one
 * selection, one button to Stripe-hosted Checkout. Never shows a price the
 * catalog did not produce.
 */
export function BuyCreditsSheet({ open, onOpenChange, source }: BuyCreditsSheetProps) {
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
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col sm:max-w-[420px]"
          data-source={source}
        >
          <SheetHeader className="text-left">
            <SheetTitle className="text-heading-md">{BUY_CREDITS_COPY.title}</SheetTitle>
            <SheetDescription className="text-body-sm text-[color:var(--text-secondary)]">
              {BUY_CREDITS_COPY.body}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-2" role="radiogroup" aria-label="Credit packs">
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
                    "flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors",
                    active
                      ? "border-[color:var(--text-primary)] bg-[color:var(--bg)]"
                      : "border-[color:var(--border-subtle)] hover:border-[color:var(--border-default)]",
                  )}
                >
                  <span>
                    <span className="block text-body-md font-medium text-[color:var(--text-primary)]">
                      {pack.credits} credits
                    </span>
                    {pack.badge && (
                      <span className="mt-0.5 block text-[12px] text-[color:var(--text-tertiary)]">
                        {pack.badge}
                      </span>
                    )}
                  </span>
                  <span className="text-body-md font-medium tabular-nums text-[color:var(--text-primary)]">
                    {formatUsd(pack.priceCents)}
                  </span>
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
        </SheetContent>
      </Sheet>

      <BillingAuthDialog
        open={authGate}
        onOpenChange={setAuthGate}
        headline={PACK_GATE_HEADLINE}
        productKey={selected}
      />
    </>
  );
}
