import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBuyCredits } from "@/components/billing/BuyCreditsProvider";
import { getAccountSummary, openBillingPortal } from "@/lib/billing/client";
import {
  OUT_OF_CREDITS_ACTION_LABEL,
  outOfCreditsCopy,
  type OutOfCreditsAction,
  type OutOfCreditsInput,
} from "@/lib/billing/credit-state";
import { ROUTES } from "@/lib/product";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Inline out-of-credits state (never a modal). Copy depends on plan and
 * billing state, fetched when the panel appears. Actions: Buy credits (sheet),
 * Upgrade (pricing), Update billing (Stripe portal).
 */
export function OutOfCreditsPanel({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { openBuyCredits } = useBuyCredits();
  const [input, setInput] = useState<OutOfCreditsInput>({
    plan: "free",
    subscriptionStatus: null,
    nextResetAt: null,
  });

  useEffect(() => {
    let cancelled = false;
    getAccountSummary()
      .then((s) => {
        if (cancelled) return;
        setInput({
          plan: s.plan,
          subscriptionStatus: s.subscriptionStatus,
          nextResetAt: s.billingInterval === "year" ? s.nextCreditGrantAt : s.currentPeriodEnd,
        });
      })
      .catch(() => {});
    trackEvent("upgrade_prompt_viewed", { context: "out_of_credits" });
    return () => {
      cancelled = true;
    };
  }, []);

  const copy = outOfCreditsCopy(input);

  function run(action: OutOfCreditsAction) {
    switch (action) {
      case "buy":
        openBuyCredits("out_of_credits");
        return;
      case "upgrade_pro":
      case "upgrade_max":
      case "view_plans":
        void navigate({ to: ROUTES.pricing });
        return;
      case "update_billing":
        openBillingPortal().catch(() => toast.error("Could not open billing."));
        return;
    }
  }

  return (
    <div
      role="status"
      className={cn(
        "surface-card relative overflow-hidden p-5 sm:p-6 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[image:var(--brand-gradient)]",
        className,
      )}
    >
      <p className="text-[17px] font-semibold tracking-[-0.015em] text-[color:var(--text-primary)]">
        {copy.title}
      </p>
      <p className="mt-1 text-body-sm text-[color:var(--text-secondary)]">{copy.body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          className="h-11 sm:h-10"
          onClick={() => run(copy.primary)}
          data-analytics-id="out-of-credits-primary"
        >
          {OUT_OF_CREDITS_ACTION_LABEL[copy.primary]}
        </Button>
        {copy.secondary && (
          <Button
            variant="outline"
            className="h-11 sm:h-10"
            onClick={() => run(copy.secondary as OutOfCreditsAction)}
            data-analytics-id="out-of-credits-secondary"
          >
            {OUT_OF_CREDITS_ACTION_LABEL[copy.secondary]}
          </Button>
        )}
      </div>
    </div>
  );
}
