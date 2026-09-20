import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

export function DeleteCreationDialog({
  open,
  deleting,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !deleting && onOpenChange(next)}>
      <DialogContent className="max-w-[420px]">
        <DialogTitle className="text-heading-sm">Delete this image?</DialogTitle>
        <DialogDescription className="text-body-sm text-[color:var(--text-secondary)]">
          This permanently removes it from your creations. This can't be undone.
        </DialogDescription>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={deleting} onClick={() => void onConfirm()}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
