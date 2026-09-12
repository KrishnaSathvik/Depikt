import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { BuyCreditsBody } from "@/components/billing/BuyCreditsBody";
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
 * directly in the hub's shell). Centered dialog on every viewport — same
 * shell language as AuthChooserDialog / AccountHub.
 */
export function BuyCreditsSheet({ open, onOpenChange, source }: BuyCreditsSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(85dvh,720px)] w-[calc(100%-2rem)] max-w-[640px] gap-0 overflow-y-auto rounded-lg p-6 sm:w-full sm:p-8">
        <DialogTitle className="pr-8 text-heading-md">{BUY_CREDITS_COPY.title}</DialogTitle>
        <DialogDescription className="mt-1 text-body-sm text-[color:var(--text-secondary)]">
          {BUY_CREDITS_COPY.body}
        </DialogDescription>
        <div className="mt-6">
          <BuyCreditsBody source={source} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
