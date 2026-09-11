import { Link } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { DepiktAvatar } from "@/components/profile/DepiktAvatar";
import { useProfile } from "@/lib/profile/profile-context";
import { ROUTES } from "@/lib/product";

/**
 * Signed-in header control: the account's Depikt avatar (never the OAuth
 * provider photo — see CLAUDE.md's header-avatar rule), linking straight
 * to /account, which resolves to Profile (its default tab).
 *
 * This used to open a dropdown listing Creations/Favorites/History/Plan &
 * Credits/Buy credits/Sign out — every one of those already exists as its
 * own destination (the account rail, or the Library/Prompt pages for
 * Favorites/History), so the dropdown was a second menu duplicating
 * navigation the visitor would see again one click later. Clicking the
 * avatar now goes straight to the real page.
 */
export function AccountMenu({ user }: { user: User }) {
  const { profile } = useProfile();
  const displayName = profile?.displayName ?? "Depikt Creator";

  return (
    <Link
      to={ROUTES.account}
      aria-label="Account"
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
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg)] text-[12px] font-semibold text-[color:var(--text-primary)]">
          {(user.email ?? "?").charAt(0).toUpperCase()}
        </span>
      )}
    </Link>
  );
}
