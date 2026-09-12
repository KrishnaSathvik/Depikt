import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { IdentityRow } from "@/components/account/IdentityRow";
import { CreditsCard } from "@/components/account/CreditsCard";
import { PlanCards } from "@/components/billing/PlanCards";
import { BuyCreditsBody } from "@/components/billing/BuyCreditsBody";
import type { BillingInterval } from "@/lib/billing/plans";
import { CreationsGrid } from "@/components/account/CreationsGrid";
import { CreationDetailView } from "@/components/account/CreationDetailView";
import { EditProfileForm } from "@/components/account/EditProfileForm";
import { AvatarPickerBody } from "@/components/account/AvatarPickerBody";
import { DeleteAccountAction } from "@/components/account/DeleteAccountAction";
import { useAccountHub, type HubView } from "@/components/account/AccountHubProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/profile/profile-context";
import { getAccountSummary } from "@/lib/billing/client";
import { AUTH_COPY } from "@/lib/product";
import type { AccountSummaryResponse } from "@/routes/api/billing/account";

/** "google" -> "Google", "azure" -> "Microsoft" (Supabase's provider id for
 *  it), missing/"email" -> "Email". Unknown ids fall back to Title Case. */
function signedInWithLabel(raw: string | null | undefined): string {
  if (!raw || raw === "email") return "Email";
  const known: Record<string, string> = {
    google: "Google",
    apple: "Apple",
    azure: "Microsoft",
    microsoft: "Microsoft",
    lovable: "Lovable",
  };
  return known[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
}

const TITLE: Record<HubView, string> = {
  home: "Profile",
  "creation-detail": "Creation",
  "edit-profile": "Edit profile",
  "avatar-picker": "Choose your avatar",
  upgrade: "Plans",
  "buy-credits": "Buy credits",
};

// Desktop dialog width per view. Home now carries the full Creations grid
// (no separate click to see it), so it needs the same room as the detail
// view's image; edit-profile/avatar-picker/buy-credits are compact,
// self-contained forms; upgrade needs room for two plan cards side by side.
const DESKTOP_WIDTH: Record<HubView, string> = {
  home: "max-w-[960px]",
  "creation-detail": "max-w-[560px]",
  "edit-profile": "max-w-[460px]",
  "avatar-picker": "max-w-[440px]",
  upgrade: "max-w-[720px]",
  "buy-credits": "max-w-[640px]",
};

function UpgradeView({ summary }: { summary: AccountSummaryResponse | null }) {
  const [interval, setInterval] = useState<BillingInterval>("month");
  if (!summary) {
    return <p className="text-body-sm text-[color:var(--text-tertiary)]">Loading…</p>;
  }
  return (
    <PlanCards
      interval={interval}
      onIntervalChange={setInterval}
      currentPlan={summary.plan}
      hideFree
      hidePacks
    />
  );
}

/**
 * Profile: identity, Plan & Credits (see [[CreditsCard]]), then the full
 * Creations grid -- no separate click to see your images. There is no
 * separate Account view either -- Plan & Credits sits right here, not
 * behind another click; sign-in method, email, Sign out, and Delete
 * account live at the bottom, in that order.
 */
function HomeView({ summary }: { summary: AccountSummaryResponse | null }) {
  const { user, signOut } = useAuth();
  const hub = useAccountHub();

  // Sign-out itself was already working -- signOut() does clear the
  // session -- but nothing ever closed the hub afterward, so on any page
  // other than /account (which redirects itself once `user` goes null)
  // the dialog/sheet just sat there still showing "Profile" with no data,
  // reading as "sign out didn't do anything."
  async function handleSignOut() {
    await signOut();
    hub.closeHub();
  }

  return (
    <div>
      <IdentityRow
        onAvatarClick={() => hub.pushView("avatar-picker")}
        onEditClick={() => hub.pushView("edit-profile")}
      />

      <div className="mt-4">
        <CreditsCard
          summary={summary}
          onUpgrade={() => hub.pushView("upgrade")}
          onBuyCredits={() => hub.pushView("buy-credits")}
        />
      </div>

      <div className="mt-6 border-t border-[color:var(--border-subtle)] pt-5">
        <p className="text-heading-sm text-[color:var(--text-primary)]">Creations</p>
        <div className="mt-4">
          <CreationsGrid onSelect={hub.openCreationDetail} />
        </div>
      </div>

      <div className="mt-4 flex flex-col border-t border-[color:var(--border-subtle)] pt-2">
        {summary && (
          <div className="px-1 pb-1">
            <p className="text-body-sm text-[color:var(--text-secondary)]">
              Signed in with {signedInWithLabel(summary.provider)}
            </p>
            {summary.email && (
              <p className="text-body-sm text-[color:var(--text-tertiary)]">{summary.email}</p>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="w-full rounded-md px-1 py-2.5 text-left text-[14px] font-medium text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)]"
          disabled={!user}
        >
          {AUTH_COPY.signOut}
        </button>
        <DeleteAccountAction />
      </div>
    </div>
  );
}

/**
 * One canonical modal/sheet for account/profile interaction across the
 * whole app: the header avatar, the full-page /account route's own avatar/
 * pencil/thumbnail taps, all open this same shell at whichever view fits.
 * A single Dialog on desktop, a full-viewport Sheet on mobile;
 * `stack` (from AccountHubProvider) is the current view's back-stack, so
 * a back arrow shows whenever there's somewhere to go back to and X always
 * closes the whole thing, however deep the stack is. Below md the desktop
 * Dialog also goes full-bleed so a late/narrow measurement never leaves a
 * floating card on phones.
 */
export function AccountHub() {
  const { open, stack, selectedCreation, back, closeHub } = useAccountHub();
  const { user } = useAuth();
  const { profile, save } = useProfile();
  const isMobile = useIsMobile();
  const [summary, setSummary] = useState<AccountSummaryResponse | null>(null);
  const view = stack[stack.length - 1];
  const canGoBack = stack.length > 1;

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    getAccountSummary()
      .then((r) => {
        if (!cancelled) setSummary(r);
      })
      .catch(() => {
        /* CreditsCard shows its own loading state; nothing more to do here */
      });
    return () => {
      cancelled = true;
    };
    // Fetched once per hub session (on open) -- the home view's
    // CreditsCard is the only consumer now.
  }, [open, user]);

  let body: React.ReactNode = null;
  switch (view) {
    case "home":
      body = <HomeView summary={summary} />;
      break;
    case "creation-detail":
      body = selectedCreation ? <CreationDetailView creation={selectedCreation} /> : null;
      break;
    case "edit-profile":
      body = <EditProfileForm onDone={back} />;
      break;
    case "upgrade":
      body = <UpgradeView summary={summary} />;
      break;
    case "buy-credits":
      body = <BuyCreditsBody source="profile" />;
      break;
    case "avatar-picker":
      body =
        profile && user ? (
          <AvatarPickerBody
            userId={user.id}
            currentSeed={profile.avatarSeed}
            currentStyle={profile.avatarVariant}
            onSave={async ({ seed, style }) => {
              await save({ avatarSeed: seed, avatarVariant: style });
            }}
            onDone={back}
          />
        ) : null;
      break;
  }

  const unpadded = view === "creation-detail";
  const title = TITLE[view];

  const header = (
    <div className="mb-4 flex items-center gap-2">
      {canGoBack && (
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-subtle)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
      <span className="text-heading-sm text-[color:var(--text-primary)]">{title}</span>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && closeHub()}>
        <SheetContent
          side="bottom"
          className="flex h-[100dvh] max-h-[100dvh] w-full flex-col gap-0 rounded-none border-0 p-0 shadow-none"
        >
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <SheetDescription className="sr-only">Account and creations</SheetDescription>
          <div className="flex shrink-0 items-center gap-2 border-b border-[color:var(--border-subtle)] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-12">
            {canGoBack && (
              <button
                type="button"
                onClick={back}
                aria-label="Back"
                className="flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-subtle)]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <span className="text-heading-sm text-[color:var(--text-primary)]">{title}</span>
          </div>
          <div
            className={
              unpadded
                ? "min-h-0 flex-1 overflow-y-auto"
                : "min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            }
          >
            {body}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeHub()}>
      <DialogContent
        className={`${DESKTOP_WIDTH[view]} max-h-[85vh] overflow-y-auto transition-[max-width] max-md:inset-0 max-md:left-0 max-md:top-0 max-md:flex max-md:h-dvh max-md:max-h-dvh max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:border-0`}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Account and creations</DialogDescription>
        {header}
        <div className={unpadded ? "-mx-6 -mb-6" : undefined}>{body}</div>
      </DialogContent>
    </Dialog>
  );
}
