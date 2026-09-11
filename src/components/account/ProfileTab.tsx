import { useEffect, useRef, useState } from "react";
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
import { DepiktAvatar } from "@/components/profile/DepiktAvatar";
import { AvatarPickerDialog } from "@/components/account/AvatarPickerDialog";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/profile/profile-context";
import { checkUsernameAvailability } from "@/lib/profile/client";
import { normalizeUsername, validateUsername } from "@/lib/profile/username";
import { clearLocalUserData, deleteAccount } from "@/lib/billing/client";
import { trackEvent } from "@/lib/analytics";
import { AUTH_COPY } from "@/lib/product";
import { useNavigate } from "@tanstack/react-router";
import type { AccountSummaryResponse } from "@/routes/api/billing/account";

type UsernameState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "unavailable"; message: string }
  | { kind: "unchanged" };

/** "google" -> "Google", "azure" -> "Microsoft" (Supabase's provider id for
 *  it), missing/"email" -> "Email". Unknown ids fall back to Title Case. */
function signedInWithLabel(raw: string | null): string {
  if (!raw || raw === "email") return "Email";
  const known: Record<string, string> = {
    google: "Google",
    apple: "Apple",
    azure: "Microsoft",
    microsoft: "Microsoft",
    lovable: "Lovable",
  };
  return known[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function ProfileTab({ summary }: { summary: AccountSummaryResponse | null }) {
  const { user, signOut } = useAuth();
  const { profile, save } = useProfile();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameState, setUsernameState] = useState<UsernameState>({ kind: "idle" });
  const [saving, setSaving] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? "");
    setUsername(profile.username);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
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
  }, [username, profile]);

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
    } catch {
      toast.error("Could not save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      await deleteAccount();
      trackEvent("account_deleted", {});
      await clearLocalUserData();
      await signOut();
      toast.success("Your account has been deleted.");
      void navigate({ to: "/", replace: true });
    } catch {
      setDeleting(false);
      toast.error("Could not delete your account. Please try again.");
    }
  }

  async function handleSignOut() {
    await signOut();
    void navigate({ to: "/" });
  }

  return (
    <div className="max-w-[680px]">
      <h1 className="text-heading-md">Profile</h1>

      <div className="mt-6 space-y-8">
        <div>
          <p className="eyebrow">Profile picture</p>
          <div className="mt-3 flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            {profile && (
              <DepiktAvatar seed={profile.avatarSeed} style={profile.avatarVariant} size={96} />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAvatarOpen(true)}
              disabled={!profile}
            >
              Change avatar
            </Button>
          </div>
        </div>

        <div>
          <label htmlFor="display-name" className="eyebrow">
            Display name
          </label>
          <Input
            id="display-name"
            className="mt-2 max-w-md"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
          />
        </div>

        <div>
          <label htmlFor="username" className="eyebrow">
            Username
          </label>
          <div className="mt-2 flex max-w-md items-center gap-1 rounded-md border border-[color:var(--border-default)] pl-3 focus-within:ring-2 focus-within:ring-[color:var(--accent)]">
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

        <div>
          <Button size="sm" onClick={() => void handleSave()} disabled={!canSave || saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[color:var(--border-subtle)] pt-6">
          <div>
            <p className="eyebrow">Account</p>
            <p className="mt-1.5 text-body-sm text-[color:var(--text-secondary)]">
              Signed in with {signedInWithLabel(summary?.provider ?? null)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void handleSignOut()}>
            {AUTH_COPY.signOut}
          </Button>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50/40 p-4">
          <p className="eyebrow text-red-700">Danger zone</p>
          <p className="mt-2 text-body-sm text-[color:var(--text-secondary)]">
            Deleting your account removes your generations, references, credits, and any active
            subscription. This cannot be undone.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
            onClick={() => setConfirmOpen(true)}
          >
            Delete account
          </Button>
        </div>
      </div>

      {profile && user && (
        <AvatarPickerDialog
          open={avatarOpen}
          onOpenChange={setAvatarOpen}
          userId={user.id}
          currentSeed={profile.avatarSeed}
          currentStyle={profile.avatarVariant}
          onSave={async ({ seed, style }) => {
            await save({ avatarSeed: seed, avatarVariant: style });
          }}
        />
      )}

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
    </div>
  );
}
