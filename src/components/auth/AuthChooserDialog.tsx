import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { ReactNode } from "react";

/**
 * Shared shell for Generate/billing sign-in choosers. Same centered dialog on
 * mobile and desktop — never a bottom sheet — so the gate feels like one
 * product surface at every width.
 */
export function AuthChooserDialog({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(85dvh,720px)] w-[calc(100%-2rem)] max-w-[440px] gap-0 overflow-y-auto rounded-lg p-6 sm:w-full sm:p-8">
        <DialogTitle className="pr-8 text-heading-sm">{title}</DialogTitle>
        <DialogDescription className="sr-only">{title}</DialogDescription>
        <div className="mt-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
