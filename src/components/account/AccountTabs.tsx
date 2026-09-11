import { useNavigate } from "@tanstack/react-router";
import { ScrollRow } from "@/components/ScrollRow";
import { useAuth } from "@/lib/auth-context";
import { AUTH_COPY } from "@/lib/product";
import { cn } from "@/lib/utils";
import { ACCOUNT_TABS, isAccountTabId, type AccountTabId } from "@/lib/profile/account-tabs";

export { ACCOUNT_TABS, isAccountTabId, type AccountTabId };

const linkClassName =
  "shrink-0 snap-start whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-[13px] font-medium text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]";

/**
 * Mobile: a compact horizontal tab row (ScrollRow, same pattern as the
 * header's mobile nav). Desktop uses AccountRail instead — see account.tsx,
 * which renders this only below `lg`. Sign out trails the three tabs so
 * mobile visitors have the same access AccountRail gives desktop.
 */
export function AccountTabs({
  active,
  onChange,
}: {
  active: AccountTabId;
  onChange: (id: AccountTabId) => void;
}) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    void navigate({ to: "/" });
  }

  return (
    <ScrollRow
      as="nav"
      ariaLabel="Account sections"
      activeKey={active}
      innerClassName="gap-1 border-b border-[color:var(--border-subtle)]"
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
            t.id === active &&
              "border-[color:var(--text-primary)] text-[color:var(--text-primary)]",
          )}
        >
          {t.label}
        </button>
      ))}
      <button type="button" onClick={() => void handleSignOut()} className={linkClassName}>
        {AUTH_COPY.signOut}
      </button>
    </ScrollRow>
  );
}
