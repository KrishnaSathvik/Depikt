import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/profile/profile-context";
import { getAccountSummary } from "@/lib/billing/client";
import { AUTH_COPY } from "@/lib/product";
import { cn } from "@/lib/utils";
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

/** Dialog width per view — same shell on mobile and desktop. */
const DIALOG_WIDTH: Record<HubView, string> = {
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
 * One canonical profile modal across the app. Centered dialog on every
 * viewport (same visual language as AuthChooserDialog / BuyCreditsSheet) —
 * never a mobile-only bottom sheet. `stack` is the back-stack: back arrow
 * when there's somewhere to go, X always closes the hub.
 */
export function AccountHub() {
  const { open, stack, selectedCreation, back, closeHub } = useAccountHub();
  const { user } = useAuth();
  const { profile, save } = useProfile();
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeHub()}>
      <DialogContent
        className={cn(
          DIALOG_WIDTH[view],
          "max-h-[min(90dvh,900px)] w-[calc(100%-2rem)] gap-0 overflow-y-auto rounded-lg p-5 transition-[max-width] sm:w-full sm:p-8",
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Account and creations</DialogDescription>
        <div className="mb-4 flex items-center gap-2 pr-8">
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
        <div className={unpadded ? "-mx-5 -mb-5 sm:-mx-8 sm:-mb-8" : undefined}>{body}</div>
      </DialogContent>
    </Dialog>
  );
}
