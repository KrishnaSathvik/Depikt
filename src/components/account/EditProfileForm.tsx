import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
 * Display name + username form -- the AccountHub's "edit-profile" view
 * body. No Dialog/Sheet of its own; the hub shell supplies the chrome.
 * Saving updates the shared profile state (useProfile), so every surface
 * reading it (header trigger, the Account tab's identity row) reflects the
 * change immediately, then calls `onDone` to pop back to the hub's home.
 */
export function EditProfileForm({ onDone }: { onDone: () => void }) {
  const { profile, save } = useProfile();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [usernameState, setUsernameState] = useState<UsernameState>({ kind: "unchanged" });
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      onDone();
    } catch {
      toast.error("Could not save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
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
}
