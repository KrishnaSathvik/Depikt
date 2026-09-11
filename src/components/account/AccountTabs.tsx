import { ScrollRow } from "@/components/ScrollRow";
import { cn } from "@/lib/utils";
import { ACCOUNT_TABS, isAccountTabId, type AccountTabId } from "@/lib/profile/account-tabs";

export { ACCOUNT_TABS, isAccountTabId, type AccountTabId };

/**
 * Mobile: a compact horizontal tab row (ScrollRow, same pattern as the
 * header's mobile nav). Desktop uses AccountRail instead — see account.tsx,
 * which renders this only below `lg`.
 */
export function AccountTabs({
  active,
  onChange,
}: {
  active: AccountTabId;
  onChange: (id: AccountTabId) => void;
}) {
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
            "shrink-0 snap-start whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-[13px] font-medium text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]",
            t.id === active &&
              "border-[color:var(--text-primary)] text-[color:var(--text-primary)]",
          )}
        >
          {t.label}
        </button>
      ))}
    </ScrollRow>
  );
}
