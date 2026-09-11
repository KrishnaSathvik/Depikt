import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { useIsMobile } from "@/hooks/use-mobile";
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
 */
export function BillingAuthDialog({
  open,
  onOpenChange,
  headline,
  productKey,
}: BillingAuthDialogProps) {
  const isMobile = useIsMobile();

  function onStart() {
    if (productKey) savePendingCheckout(productKey);
  }

  const body = (
    <>
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
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-2xl">
          <SheetTitle className="text-heading-sm">{headline}</SheetTitle>
          <SheetDescription className="sr-only">{headline}</SheetDescription>
          <div className="mt-4">{body}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] p-8">
        <DialogTitle className="text-heading-sm">{headline}</DialogTitle>
        <DialogDescription className="sr-only">{headline}</DialogDescription>
        {body}
      </DialogContent>
    </Dialog>
  );
}
