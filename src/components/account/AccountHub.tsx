import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { IdentityRow } from "@/components/account/IdentityRow";
import { CreationsGrid } from "@/components/account/CreationsGrid";
import { CreationDetailView } from "@/components/account/CreationDetailView";
import { AccountPanels } from "@/components/account/AccountPanels";
import { EditProfileForm } from "@/components/account/EditProfileForm";
import { AvatarPickerBody } from "@/components/account/AvatarPickerBody";
import { DeleteAccountAction } from "@/components/account/DeleteAccountAction";
import { useAccountHub, type HubView } from "@/components/account/AccountHubProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/profile/profile-context";
import { useAccountSummary } from "@/lib/billing/use-account-summary";
import { useBuyCredits } from "@/components/billing/BuyCreditsProvider";
import { getAccountSummary } from "@/lib/billing/client";
import { PLAN_LABEL } from "@/lib/billing/plans";
import { AUTH_COPY, ROUTES } from "@/lib/product";
import type { AccountSummaryResponse } from "@/routes/api/billing/account";

const TITLE: Record<HubView, string> = {
  home: "Profile",
  creations: "Creations",
  "creation-detail": "Creation",
  account: "Account",
  "edit-profile": "Edit profile",
  "avatar-picker": "Choose your avatar",
};

// Desktop dialog width per view -- home/edit-profile/avatar-picker stay
// compact, Account gets room for its two cards, Creations/its detail view
// get the most (an image-first grid needs it).
const DESKTOP_WIDTH: Record<HubView, string> = {
  home: "max-w-[460px]",
  creations: "max-w-[920px]",
  "creation-detail": "max-w-[560px]",
  account: "max-w-[700px]",
  "edit-profile": "max-w-[460px]",
  "avatar-picker": "max-w-[440px]",
};

function HubRow({
  onClick,
  href,
  children,
  external,
}: {
  onClick?: () => void;
  href?: (typeof ROUTES)[keyof typeof ROUTES];
  children: React.ReactNode;
  external?: boolean;
}) {
  const className =
    "flex w-full items-center justify-between rounded-md px-1 py-3 text-left text-[14px] font-medium text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)]";
  const icon = external ? (
    <ArrowUpRight className="h-4 w-4 text-[color:var(--text-tertiary)]" aria-hidden="true" />
  ) : (
    <ChevronRight className="h-4 w-4 text-[color:var(--text-tertiary)]" aria-hidden="true" />
  );
  if (href) {
    return (
      <Link to={href} className={className} onClick={onClick}>
        {children}
        {icon}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
      {icon}
    </button>
  );
}

function HomeView() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const summary = useAccountSummary(user);
  const { openBuyCredits } = useBuyCredits();
  const hub = useAccountHub();

  const planLabel = summary.plan ? PLAN_LABEL[summary.plan] : null;
  const creditsLabel =
    summary.credits === null
      ? "—"
      : `${planLabel && summary.plan !== "free" ? `${planLabel} · ` : ""}${summary.credits} credit${summary.credits === 1 ? "" : "s"}`;

  return (
    <div>
      <IdentityRow
        onAvatarClick={() => hub.pushView("avatar-picker")}
        onEditClick={() => hub.pushView("edit-profile")}
      />
      <p className="mt-1 text-body-sm text-[color:var(--text-secondary)]">{creditsLabel}</p>

      <div className="mt-4 border-t border-[color:var(--border-subtle)] pt-1">
        <HubRow onClick={() => hub.pushView("creations")}>Creations</HubRow>
        <HubRow onClick={() => hub.pushView("account")}>Account</HubRow>
        <HubRow onClick={() => openBuyCredits("account_hub")}>Buy credits</HubRow>
      </div>

      <div className="mt-2 border-t border-[color:var(--border-subtle)] pt-1">
        <HubRow href={ROUTES.help} onClick={hub.closeHub} external>
          Help
        </HubRow>
        <HubRow href={ROUTES.privacy} onClick={hub.closeHub} external>
          Privacy
        </HubRow>
        <HubRow href={ROUTES.terms} onClick={hub.closeHub} external>
          Terms
        </HubRow>
      </div>

      <div className="mt-2 flex flex-col border-t border-[color:var(--border-subtle)] pt-2">
        <button
          type="button"
          onClick={() => void signOut()}
          className="w-full rounded-md px-1 py-2.5 text-left text-[14px] font-medium text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)]"
          disabled={!profile}
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
 * A single Dialog on desktop, a near-full-height bottom Sheet on mobile;
 * `stack` (from AccountHubProvider) is the current view's back-stack, so
 * a back arrow shows whenever there's somewhere to go back to and X always
 * closes the whole thing, however deep the stack is.
 */
export function AccountHub() {
  const { open, stack, selectedCreation, back, closeHub, openCreationDetail } = useAccountHub();
  const { user } = useAuth();
  const { profile, save } = useProfile();
  const isMobile = useIsMobile();
  const [summary, setSummary] = useState<AccountSummaryResponse | null>(null);
  const view = stack[stack.length - 1];
  const canGoBack = stack.length > 1;

  useEffect(() => {
    if (!open || !user || view !== "account") return;
    let cancelled = false;
    getAccountSummary()
      .then((r) => {
        if (!cancelled) setSummary(r);
      })
      .catch(() => {
        /* AccountPanels shows its own loading state; nothing more to do here */
      });
    return () => {
      cancelled = true;
    };
  }, [open, user, view]);

  let body: React.ReactNode = null;
  switch (view) {
    case "home":
      body = <HomeView />;
      break;
    case "creations":
      body = <CreationsGrid onSelect={openCreationDetail} />;
      break;
    case "creation-detail":
      body = selectedCreation ? <CreationDetailView creation={selectedCreation} /> : null;
      break;
    case "account":
      body = <AccountPanels summary={summary} />;
      break;
    case "edit-profile":
      body = <EditProfileForm onDone={back} />;
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
          className="flex h-[92vh] flex-col rounded-t-2xl overflow-y-auto"
        >
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <SheetDescription className="sr-only">Account and creations</SheetDescription>
          {header}
          <div className={unpadded ? "-mx-6 -mb-6 flex-1" : "flex-1"}>{body}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeHub()}>
      <DialogContent
        className={`${DESKTOP_WIDTH[view]} max-h-[85vh] overflow-y-auto transition-[max-width]`}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Account and creations</DialogDescription>
        {header}
        <div className={unpadded ? "-mx-6 -mb-6" : undefined}>{body}</div>
      </DialogContent>
    </Dialog>
  );
}
