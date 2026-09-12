import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { useAccountHub } from "@/components/account/AccountHubProvider";
import { clearLocalUserData, deleteAccount } from "@/lib/billing/client";
import { trackEvent } from "@/lib/analytics";

/**
 * The one place account deletion lives: a red row (styled to match the
 * AccountHub home view's other bottom-row actions) that opens a typed-
 * confirmation dialog directly, right on the profile -- there is no
 * separate Account view/tab to detour through.
 */
export function DeleteAccountAction() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const hub = useAccountHub();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      await deleteAccount();
      trackEvent("account_deleted", {});
      await clearLocalUserData();
      await signOut();
      toast.success("Your account has been deleted.");
      // Close the hub itself -- navigating away doesn't unmount it (it's
      // a global provider), so without this it would sit there open,
      // still trying to show a now-signed-out profile.
      hub.closeHub();
      void navigate({ to: "/", replace: true });
    } catch {
      setDeleting(false);
      toast.error("Could not delete your account. Please try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="w-full rounded-md px-1 py-2 text-left text-[14px] font-medium text-red-700 hover:bg-red-50"
      >
        Delete account
      </button>

      <Dialog open={confirmOpen} onOpenChange={(o) => !deleting && setConfirmOpen(o)}>
        <DialogContent className="max-w-[420px]">
          <DialogTitle className="text-heading-sm">Delete your account?</DialogTitle>
          <DialogDescription className="text-body-sm text-[color:var(--text-secondary)]">
            This permanently removes your Depikt generations and account data. Any active
            subscription is cancelled immediately. Type DELETE to continue.
          </DialogDescription>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            aria-label="Type DELETE to confirm"
            autoComplete="off"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== "DELETE" || deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Deleting…" : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
