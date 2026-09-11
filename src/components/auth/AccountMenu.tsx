import type { User } from "@supabase/supabase-js";
import { DepiktAvatar } from "@/components/profile/DepiktAvatar";
import { useAccountHub } from "@/components/account/AccountHubProvider";
import { useProfile } from "@/lib/profile/profile-context";

/**
 * Signed-in header control: the account's Depikt avatar (never the OAuth
 * provider photo — see CLAUDE.md's header-avatar rule) opening the one
 * AccountHub, at its home view. There is no dropdown and no bottom sheet
 * of its own here anymore -- every account/profile/creation interaction
 * (header avatar, the full-page /account route's own avatar/pencil/
 * thumbnail taps) opens that same shell now, so there's exactly one
 * interaction system instead of a dropdown + a page + several dialogs.
 * See AccountHub.tsx.
 */
export function AccountMenu({ user }: { user: User }) {
  const { profile } = useProfile();
  const hub = useAccountHub();
  const displayName = profile?.displayName ?? "Depikt Creator";

  return (
    <button
      type="button"
      aria-label="Account menu"
      onClick={() => hub.openHub("home")}
      disabled={!user}
      className="flex h-7 w-7 items-center justify-center rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
    >
      {profile ? (
        <DepiktAvatar
          seed={profile.avatarSeed}
          style={profile.avatarVariant}
          size={28}
          label={displayName}
        />
      ) : (
        // Neutral loading placeholder only -- never guess an identity (an
        // email initial, a default DiceBear seed) while the real profile is
        // still in flight. Showing a wrong identity, even briefly, reads as
        // the saved avatar having changed.
        <span
          aria-hidden="true"
          className="block h-7 w-7 shrink-0 rounded-full bg-[color:var(--bg-subtle)]"
        />
      )}
    </button>
  );
}
