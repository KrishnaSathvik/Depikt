import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { DepiktAvatar } from "@/components/profile/DepiktAvatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/profile/profile-context";
import { useAccountSummary } from "@/lib/billing/use-account-summary";
import { useBuyCredits } from "@/components/billing/BuyCreditsProvider";
import { PLAN_LABEL } from "@/lib/billing/plans";
import { AUTH_COPY, ROUTES } from "@/lib/product";

const TRIGGER_CLASS =
  "flex h-7 w-7 items-center justify-center rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2";

/** One row in the mobile sheet's nav list: label left, chevron right, big tap target. */
function SheetRow({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md px-1 py-3 text-left text-[14px] font-medium text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)]"
    >
      {children}
      <ChevronRight className="h-4 w-4 text-[color:var(--text-tertiary)]" aria-hidden="true" />
    </button>
  );
}

/**
 * Signed-in header control: the account's Depikt avatar (never the OAuth
 * provider photo — see CLAUDE.md's header-avatar rule) opening a compact
 * menu -- fast navigation, not a second account architecture. The identity
 * block and "Creations"/"Account" both go to /account (Account is the
 * default tab there too, so clicking identity itself needs no ?tab=); no
 * separate "Profile" item, since there's no separate Profile page anymore.
 *
 * Desktop keeps the Radix dropdown; mobile swaps it for a short bottom
 * sheet (same useIsMobile + Dialog/Sheet split as EditProfileDialog) --
 * a floating menu that size on a phone reads as a second page, not a
 * menu. The trigger (the avatar button) looks identical either way; only
 * what opens on tap changes.
 */
export function AccountMenu({ user }: { user: User }) {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const summary = useAccountSummary(user);
  const { openBuyCredits } = useBuyCredits();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  async function openPortal() {
    const { openBillingPortal } = await import("@/lib/billing/client");
    await openBillingPortal();
  }

  const displayName = profile?.displayName ?? "Depikt Creator";
  const planLabel = summary.plan ? PLAN_LABEL[summary.plan] : null;
  const creditsLabel =
    summary.credits === null
      ? "—"
      : `${planLabel && summary.plan !== "free" ? `${planLabel} · ` : ""}${summary.credits} credit${summary.credits === 1 ? "" : "s"}`;

  const avatarNode = profile ? (
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
  );

  const identity = (
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
        <p className="mt-0.5 text-[12px] text-[color:var(--text-secondary)]">{creditsLabel}</p>
      </div>
    </div>
  );

  if (isMobile) {
    function go(tab?: "creations" | "account") {
      setSheetOpen(false);
      void navigate(tab ? { to: ROUTES.account, search: { tab } } : { to: ROUTES.account });
    }

    return (
      <>
        <button
          type="button"
          aria-label="Account menu"
          onClick={() => setSheetOpen(true)}
          className={TRIGGER_CLASS}
        >
          {avatarNode}
        </button>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetTitle className="sr-only">Account menu</SheetTitle>
            <SheetDescription className="sr-only">
              Account navigation and quick actions
            </SheetDescription>
            <div className="px-1 pt-1">{identity}</div>
            <div className="mt-3 border-t border-[color:var(--border-subtle)] pt-1">
              <SheetRow onClick={() => go("creations")}>Creations</SheetRow>
              <SheetRow onClick={() => go("account")}>Account</SheetRow>
              <SheetRow
                onClick={() => {
                  setSheetOpen(false);
                  openBuyCredits("account_menu");
                }}
              >
                Buy credits
              </SheetRow>
              {summary.hasStripeCustomer && (
                <SheetRow
                  onClick={() => {
                    setSheetOpen(false);
                    void openPortal();
                  }}
                >
                  Manage billing
                </SheetRow>
              )}
            </div>
            <div className="mt-2 border-t border-[color:var(--border-subtle)] pt-2">
              <button
                type="button"
                onClick={() => {
                  setSheetOpen(false);
                  void signOut();
                }}
                className="w-full rounded-md px-1 py-2.5 text-left text-[14px] font-medium text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)]"
              >
                {AUTH_COPY.signOut}
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Account menu" className={TRIGGER_CLASS}>
        {avatarNode}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem
          onSelect={() => void navigate({ to: ROUTES.account })}
          className="items-start py-2"
        >
          {identity}
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
