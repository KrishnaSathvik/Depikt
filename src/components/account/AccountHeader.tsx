import { DepiktAvatar } from "@/components/profile/DepiktAvatar";
import { useProfile } from "@/lib/profile/profile-context";
import { PLAN_LABEL } from "@/lib/billing/plans";
import type { AccountSummaryResponse } from "@/routes/api/billing/account";

/**
 * The one identity block for /account: avatar, name, username, plan +
 * credits. Centered stack on mobile, a row with plan/credits pushed right
 * on desktop -- same content either way, so Creations/Profile/Plan &
 * Credits never need to repeat who's signed in or what plan they're on.
 * Replaces the old AccountRail (a permanent left sidebar, weak for exactly
 * three sections) and the identity line that used to open AccountTabs.
 */
export function AccountHeader({ summary }: { summary: AccountSummaryResponse | null }) {
  const { profile } = useProfile();

  const creditsLabel = summary
    ? `${PLAN_LABEL[summary.plan]} · ${summary.credits.available} credit${summary.credits.available === 1 ? "" : "s"}`
    : null;

  return (
    <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        {profile && (
          <DepiktAvatar seed={profile.avatarSeed} style={profile.avatarVariant} size={72} />
        )}
        <div className="min-w-0">
          <p className="text-heading-sm text-[color:var(--text-primary)]">
            {profile?.displayName ?? "Depikt Creator"}
          </p>
          {profile && (
            <p className="text-body-sm text-[color:var(--text-tertiary)]">@{profile.username}</p>
          )}
        </div>
      </div>
      {creditsLabel && (
        <p className="text-body-sm font-medium text-[color:var(--text-secondary)]">
          {creditsLabel}
        </p>
      )}
    </div>
  );
}
