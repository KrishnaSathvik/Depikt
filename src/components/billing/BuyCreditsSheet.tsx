import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { BuyCreditsBody } from "@/components/billing/BuyCreditsBody";
import { useIsMobile } from "@/hooks/use-mobile";
import { BUY_CREDITS_COPY } from "@/lib/billing/copy";

export interface BuyCreditsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
}

/**
 * The global credit-purchase surface -- openable from the pricing page,
 * header, and the out-of-credits panel (not from the profile: the
 * AccountHub's own "buy-credits" view renders the same BuyCreditsBody
 * directly in the hub's shell, so Buy credits there matches Upgrade's
 * in-profile treatment rather than opening a second, separate dialog). A
 * centered dialog on desktop, a bottom sheet on mobile -- same responsive
 * split as every other Depikt modal.
 */
export function BuyCreditsSheet({ open, onOpenChange, source }: BuyCreditsSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetTitle className="text-heading-md">{BUY_CREDITS_COPY.title}</SheetTitle>
          <SheetDescription className="text-body-sm text-[color:var(--text-secondary)]">
            {BUY_CREDITS_COPY.body}
          </SheetDescription>
          <div className="mt-6">
            <BuyCreditsBody source={source} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px]">
        <DialogTitle className="text-heading-md">{BUY_CREDITS_COPY.title}</DialogTitle>
        <DialogDescription className="text-body-sm text-[color:var(--text-secondary)]">
          {BUY_CREDITS_COPY.body}
        </DialogDescription>
        <div className="mt-6">
          <BuyCreditsBody source={source} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
