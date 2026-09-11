import { useNavigate } from "@tanstack/react-router";
import { ScrollRow } from "@/components/ScrollRow";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/profile/profile-context";
import { AUTH_COPY } from "@/lib/product";
import { cn } from "@/lib/utils";
import { ACCOUNT_TABS, isAccountTabId, type AccountTabId } from "@/lib/profile/account-tabs";

export { ACCOUNT_TABS, isAccountTabId, type AccountTabId };

const linkClassName =
  "shrink-0 snap-start whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium text-[color:var(--text-secondary)] transition-colors";

/**
 * Mobile: name/username above a pill-style tab row, with Sign out set apart
 * to its right -- not another item in the tab scroll. No avatar here: the
 * header directly above already shows it, and Profile's own "Profile
 * picture" section shows it again right below -- a third copy in between
 * was pure repetition, not identity context. Pills (rather than the
 * header's own underline style) keep this row visually distinct from
 * Header's mobile nav immediately above it. Desktop uses AccountRail
 * instead — see account.tsx, which renders this only below `lg`.
 */
export function AccountTabs({
  active,
  onChange,
}: {
  active: AccountTabId;
  onChange: (id: AccountTabId) => void;
}) {
  const { profile } = useProfile();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    void navigate({ to: "/" });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 pb-4">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-[color:var(--text-primary)]">
            {profile?.displayName ?? "Depikt Creator"}
          </p>
          {profile && (
            <p className="truncate text-[12px] text-[color:var(--text-tertiary)]">
              @{profile.username}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="shrink-0 text-[13px] font-medium text-[color:var(--text-tertiary)] transition-colors hover:text-[color:var(--text-primary)]"
        >
          {AUTH_COPY.signOut}
        </button>
      </div>

      <ScrollRow
        as="nav"
        ariaLabel="Account sections"
        activeKey={active}
        innerClassName="gap-1.5 border-b border-[color:var(--border-subtle)] pb-4"
      >
        {ACCOUNT_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-active={t.id === active ? "true" : undefined}
            aria-current={t.id === active ? "page" : undefined}
            onClick={() => onChange(t.id)}
            className={cn(
              linkClassName,
              t.id === active
                ? "bg-[color:var(--text-primary)] text-[color:var(--bg)]"
                : "bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-primary)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </ScrollRow>
    </div>
  );
}
