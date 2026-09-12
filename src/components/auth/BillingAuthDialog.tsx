import { AuthChooserDialog } from "@/components/auth/AuthChooserDialog";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { savePendingCheckout } from "@/lib/billing/pending-intent";
import type { ProductKey } from "@/lib/billing/plans";
import { AUTH_COPY } from "@/lib/product";

export interface BillingAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headline: string;
  /** The plan or pack the user picked; saved before OAuth and resumed by useResumeCheckoutOnAuth. */
  productKey: ProductKey | null;
}

/**
 * Same auth-gate system as AuthGateDialog, for "Get Pro/Max" and "Buy
 * credits" while signed out. The chosen plan/pack is remembered
 * (savePendingCheckout) before OAuth starts; useResumeCheckoutOnAuth sends
 * the user straight to Stripe Checkout once they're signed in, so picking a
 * plan is never lost to an auth detour.
 *
 * Centered dialog on every viewport (matches AuthGateDialog).
 */
export function BillingAuthDialog({
  open,
  onOpenChange,
  headline,
  productKey,
}: BillingAuthDialogProps) {
  function onStart() {
    if (productKey) savePendingCheckout(productKey);
  }

  return (
    <AuthChooserDialog open={open} onOpenChange={onOpenChange} title={headline}>
      <p className="text-body-sm text-[color:var(--text-secondary)]">
        Create a free account or sign in to continue.
      </p>
      <AuthSurface
        mode="sign-up"
        compact
        busyLabel={AUTH_COPY.signingIn}
        className="mt-5 max-w-none"
        redirectTo={typeof window !== "undefined" ? window.location.href : undefined}
        onStart={onStart}
      />
    </AuthChooserDialog>
  );
}
