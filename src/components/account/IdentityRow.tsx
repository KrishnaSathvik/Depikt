import { Pencil } from "lucide-react";
import { DepiktAvatar } from "@/components/profile/DepiktAvatar";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/profile/profile-context";

/**
 * Avatar + name/pencil + username -- the one identity block, shared by the
 * Account tab's full-page fallback and the AccountHub's home view so there
 * is exactly one place this markup exists. Purely presentational: avatar
 * tap and pencil tap call back out to whoever's hosting it (the AccountHub
 * for both call sites now -- see [[account-hub]]) instead of owning any
 * dialog state themselves.
 */
export function IdentityRow({
  onAvatarClick,
  onEditClick,
}: {
  onAvatarClick: () => void;
  onEditClick: () => void;
}) {
  const { user } = useAuth();
  const { profile } = useProfile();

  return (
    <div className="flex items-center gap-4">
      {profile && (
        <button
          type="button"
          onClick={onAvatarClick}
          disabled={!user}
          aria-label="Change avatar"
          className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
        >
          <DepiktAvatar
            seed={profile.avatarSeed}
            style={profile.avatarVariant}
            size={72}
            className="h-16 w-16 ring-4 ring-white shadow-[0_8px_24px_-12px_rgba(17,17,17,0.45)] sm:h-[72px] sm:w-[72px]"
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/0 opacity-0 transition-all group-hover:bg-black/35 group-hover:opacity-100">
            <Pencil className="h-4 w-4 text-white" />
          </span>
        </button>
      )}
      <div className="min-w-0">
        <button
          type="button"
          onClick={onEditClick}
          disabled={!profile}
          className="group inline-flex min-h-9 max-w-full items-center gap-2 text-left"
        >
          <span className="truncate text-[22px] font-semibold tracking-[-0.025em] text-[color:var(--text-primary)]">
            {profile?.displayName ?? "Depikt Creator"}
          </span>
          {profile && (
            <Pencil className="h-3.5 w-3.5 shrink-0 text-[color:var(--text-tertiary)] transition-colors group-hover:text-[color:var(--text-primary)] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100" />
          )}
        </button>
        {profile && (
          <p className="mt-0.5 text-[14px] text-[color:var(--text-tertiary)]">
            @{profile.username}
          </p>
        )}
      </div>
    </div>
  );
}
