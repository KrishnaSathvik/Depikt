import { useState } from "react";
import { Pencil } from "lucide-react";
import { DepiktAvatar } from "@/components/profile/DepiktAvatar";
import { AvatarPickerDialog } from "@/components/account/AvatarPickerDialog";
import { EditProfileDialog } from "@/components/account/EditProfileDialog";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/profile/profile-context";
import { PLAN_LABEL } from "@/lib/billing/plans";
import type { AccountSummaryResponse } from "@/routes/api/billing/account";

/**
 * The one identity block for /account, above both Creations and Account --
 * there is no separate Profile page. Avatar, name, username, plan +
 * credits, all in one place. Editing happens here directly: tap the avatar
 * to open the DiceBear picker, tap the pencil next to the name to edit
 * display name/username -- never a duplicate "Profile picture" or name
 * form buried in a tab's content.
 *
 * One horizontal row on every breakpoint (no centered mobile stack -- that
 * wasted half a screen for no reason). The plan/credits summary sits to
 * the right of the name on desktop where there's room, and drops under the
 * username on narrow screens rather than fighting for a third column.
 */
export function AccountHeader({ summary }: { summary: AccountSummaryResponse | null }) {
  const { user } = useAuth();
  const { profile, save } = useProfile();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const creditsLabel = summary
    ? `${PLAN_LABEL[summary.plan]} · ${summary.credits.available} credit${summary.credits.available === 1 ? "" : "s"}`
    : null;

  return (
    <div className="flex items-center gap-3.5 sm:gap-4">
      {profile && (
        <button
          type="button"
          onClick={() => setAvatarOpen(true)}
          disabled={!user}
          aria-label="Change avatar"
          className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
        >
          <DepiktAvatar
            seed={profile.avatarSeed}
            style={profile.avatarVariant}
            size={64}
            className="h-16 w-16 sm:h-14 sm:w-14"
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/0 opacity-0 transition-all group-hover:bg-black/35 group-hover:opacity-100">
            <Pencil className="h-4 w-4 text-white" />
          </span>
        </button>
      )}
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            disabled={!profile}
            className="group inline-flex items-center gap-1.5"
          >
            <span className="text-heading-sm text-[color:var(--text-primary)]">
              {profile?.displayName ?? "Depikt Creator"}
            </span>
            {profile && (
              <Pencil className="h-3.5 w-3.5 text-[color:var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100" />
            )}
          </button>
          {profile && (
            <p className="text-body-sm text-[color:var(--text-tertiary)]">@{profile.username}</p>
          )}
          {creditsLabel && (
            <p className="mt-0.5 text-body-sm font-medium text-[color:var(--text-secondary)] sm:hidden">
              {creditsLabel}
            </p>
          )}
        </div>
        {creditsLabel && (
          <p className="hidden shrink-0 text-body-sm font-medium text-[color:var(--text-secondary)] sm:block">
            {creditsLabel}
          </p>
        )}
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
      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
