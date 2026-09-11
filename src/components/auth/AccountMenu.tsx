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
 * menu -- fast navigation, not a second account architecture. The identity
 * block and "Creations"/"Account" both go to /account (Account is the
 * default tab there too, so clicking identity itself needs no ?tab=); no
 * separate "Profile" item, since there's no separate Profile page anymore.
 */
export function AccountMenu({ user }: { user: User }) {
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
          // Neutral loading placeholder only -- never guess an identity
          // (an email initial, a default DiceBear seed) while the real
          // profile is still in flight. Showing a wrong identity, even
          // briefly, reads as the saved avatar having changed.
          <span
            aria-hidden="true"
            className="block h-7 w-7 shrink-0 rounded-full bg-[color:var(--bg-subtle)]"
          />
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
        <DropdownMenuItem
          onSelect={() => void navigate({ to: ROUTES.account, search: { tab: "account" } })}
        >
          Account
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => openBuyCredits("account_menu")}>
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
