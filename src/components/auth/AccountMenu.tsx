import { useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DepiktAvatar } from "@/components/profile/DepiktAvatar";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/profile/profile-context";
import { useAccountSummary } from "@/lib/billing/use-account-summary";
import { useBuyCredits } from "@/components/billing/BuyCreditsProvider";
import { PLAN_LABEL } from "@/lib/billing/plans";
import { AUTH_COPY, ROUTES } from "@/lib/product";

/**
 * Signed-in header control: the account's Depikt avatar (never the OAuth
 * provider photo — see CLAUDE.md's header-avatar rule) opening a compact
 * menu. The identity block itself is the first item — clicking it opens
 * /account on Profile (its default tab); there's no separate "Account"
 * item duplicating that.
 */
export function AccountMenu({ user, onBuyCredits }: { user: User; onBuyCredits?: () => void }) {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const summary = useAccountSummary(user);
  const { openBuyCredits } = useBuyCredits();

  async function openPortal() {
    const { openBillingPortal } = await import("@/lib/billing/client");
    await openBillingPortal();
  }

  const displayName = profile?.displayName ?? "Depikt Creator";
  const planLabel = summary.plan ? PLAN_LABEL[summary.plan] : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem
          onSelect={() => void navigate({ to: ROUTES.account })}
          className="items-start py-2"
        >
          <div className="flex w-full items-center gap-2.5">
            {profile && (
              <DepiktAvatar
                seed={profile.avatarSeed}
                style={profile.avatarVariant}
                size={32}
                label={displayName}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[color:var(--text-primary)]">
                {displayName}
              </p>
              {profile && (
                <p className="truncate text-[12px] text-[color:var(--text-tertiary)]">
                  @{profile.username}
                </p>
              )}
              <p className="mt-0.5 text-[12px] text-[color:var(--text-secondary)]">
                {summary.credits === null ? "—" : `${summary.credits} credits`}
                {planLabel && summary.plan !== "free" ? ` · ${planLabel}` : ""}
              </p>
            </div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => void navigate({ to: ROUTES.account, search: { tab: "creations" } })}
        >
          Creations
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate({ to: ROUTES.favorites })}>
          Favorites
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate({ to: ROUTES.history })}>
          History
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => void navigate({ to: ROUTES.account, search: { tab: "plan" } })}
        >
          Plan &amp; Credits
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            if (onBuyCredits) onBuyCredits();
            else openBuyCredits("account_menu");
          }}
        >
          Buy credits
        </DropdownMenuItem>
        {summary.hasStripeCustomer && (
          <DropdownMenuItem onSelect={() => void openPortal()}>Manage billing</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>{AUTH_COPY.signOut}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
