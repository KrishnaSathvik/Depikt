import { IdentityRow } from "@/components/account/IdentityRow";
import { AccountPanels } from "@/components/account/AccountPanels";
import { useAccountHub } from "@/components/account/AccountHubProvider";
import type { AccountSummaryResponse } from "@/routes/api/billing/account";

/**
 * The full-page /account fallback for the "account" tab: identity row +
 * AccountPanels. Avatar/pencil taps open the same AccountHub used
 * everywhere else (header avatar, home view) rather than a page-local
 * dialog -- see [[account-hub]] for why there's only ever one of these.
 */
export function AccountTab({ summary }: { summary: AccountSummaryResponse | null }) {
  const hub = useAccountHub();

  return (
    <div>
      <h1 className="text-heading-md">Account</h1>
      <div className="mt-5">
        <IdentityRow
          onAvatarClick={() => hub.pushView("avatar-picker")}
          onEditClick={() => hub.pushView("edit-profile")}
        />
      </div>
      <div className="mt-6">
        <AccountPanels summary={summary} />
      </div>
    </div>
  );
}
