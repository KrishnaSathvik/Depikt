import type { User } from "@supabase/supabase-js";
import { useRouterState } from "@tanstack/react-router";
import { DepiktAvatar } from "@/components/profile/DepiktAvatar";
import { useAccountHub } from "@/components/account/AccountHubProvider";
import { useProfile } from "@/lib/profile/profile-context";
import { ROUTES } from "@/lib/product";

/**
 * Signed-in header control: the account's Depikt avatar (never the OAuth
 * provider photo — see CLAUDE.md's header-avatar rule). Off /account it
 * opens AccountHub at home. On /account the page already is that surface,
 * so the avatar does not stack a redundant hub overlay.
 */
export function AccountMenu({ user }: { user: User }) {
  const { profile } = useProfile();
  const hub = useAccountHub();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const displayName = profile?.displayName ?? "Depikt Creator";
  const onAccountPage = pathname === ROUTES.account;

  return (
    <button
      type="button"
      aria-label="Account menu"
      aria-current={onAccountPage ? "page" : undefined}
      onClick={() => {
        if (onAccountPage) {
          const controls = document.getElementById("account-controls");
          controls?.scrollIntoView({ block: "center" });
          controls?.focus();
          return;
        }
        hub.openHub("home");
      }}
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
