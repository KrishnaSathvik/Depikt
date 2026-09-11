import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfile } from "@/lib/profile/profile-context";
import { checkUsernameAvailability } from "@/lib/profile/client";
import { normalizeUsername, validateUsername } from "@/lib/profile/username";
import { trackEvent } from "@/lib/analytics";

type UsernameState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "unavailable"; message: string }
  | { kind: "unchanged" };

/**
 * Display name + username, opened from the pencil next to the name in
 * AccountHeader -- there is no standalone Profile screen to navigate to.
 * A centered dialog on desktop, a bottom sheet on mobile (same responsive
 * pattern as BillingAuthDialog). Saving updates the shared profile state
 * (useProfile), so AccountHeader and the header avatar menu both reflect
 * the change immediately without a page reload.
 */
export function EditProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile, save } = useProfile();
  const isMobile = useIsMobile();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameState, setUsernameState] = useState<UsernameState>({ kind: "idle" });
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset to the current profile every time the dialog opens, not just on mount.
  useEffect(() => {
    if (!open || !profile) return;
    setDisplayName(profile.displayName ?? "");
    setUsername(profile.username);
    setUsernameState({ kind: "unchanged" });
  }, [open, profile]);

  useEffect(() => {
    if (!open || !profile) return;
    const normalized = normalizeUsername(username);
    if (normalized === profile.username) {
      setUsernameState({ kind: "unchanged" });
      return;
    }
    const validation = validateUsername(username);
    if (!validation.ok) {
      setUsernameState({ kind: "unavailable", message: validation.error });
      return;
    }
    setUsernameState({ kind: "checking" });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      checkUsernameAvailability(normalized)
        .then((r) =>
          setUsernameState(
            r.available
              ? { kind: "available" }
              : { kind: "unavailable", message: "That username is already taken." },
          ),
        )
        .catch(() => setUsernameState({ kind: "idle" }));
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, username, profile]);

  const canSave =
    Boolean(profile) &&
    displayName.trim().length > 0 &&
    (usernameState.kind === "available" || usernameState.kind === "unchanged");

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await save({
        displayName: displayName.trim(),
        username:
          normalizeUsername(username) !== profile?.username
            ? normalizeUsername(username)
            : undefined,
      });
      trackEvent("profile_updated", {});
      toast.success("Profile updated.");
      onOpenChange(false);
    } catch {
      toast.error("Could not save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const body = (
    <div className="mt-5 space-y-5">
      <div>
        <label htmlFor="display-name" className="eyebrow">
          Display name
        </label>
        <Input
          id="display-name"
          className="mt-2"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={60}
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="username" className="eyebrow">
          Username
        </label>
        <div className="mt-2 flex items-center gap-1 rounded-md border border-[color:var(--border-default)] pl-3 focus-within:ring-2 focus-within:ring-[color:var(--accent)]">
          <span className="text-[14px] text-[color:var(--text-tertiary)]">@</span>
          <Input
            id="username"
            className="border-0 shadow-none focus-visible:ring-0"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            maxLength={24}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <p className="mt-1.5 text-body-sm">
          {usernameState.kind === "checking" && (
            <span className="text-[color:var(--text-tertiary)]">Checking…</span>
          )}
          {usernameState.kind === "available" && (
            <span className="text-green-700">✓ Available</span>
          )}
          {usernameState.kind === "unavailable" && (
            <span className="text-red-600">{usernameState.message}</span>
          )}
        </p>
      </div>

      <div className="flex justify-end pt-1">
        <Button size="sm" onClick={() => void handleSave()} disabled={!canSave || saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetTitle className="text-heading-sm">Edit profile</SheetTitle>
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogTitle className="text-heading-sm">Edit profile</DialogTitle>
        {body}
      </DialogContent>
    </Dialog>
  );
}
