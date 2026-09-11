import { Link } from "@tanstack/react-router";
import { ScrollRow } from "@/components/ScrollRow";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_EXTERNAL_LINKS,
  ACCOUNT_TABS,
  isAccountTabId,
  type AccountTabId,
} from "@/lib/profile/account-tabs";

export { ACCOUNT_TABS, isAccountTabId, type AccountTabId };

const linkClassName =
  "shrink-0 snap-start whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-[13px] font-medium text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]";

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
      <button
        type="button"
        data-active={ACCOUNT_TABS[0].id === active ? "true" : undefined}
        aria-current={ACCOUNT_TABS[0].id === active ? "page" : undefined}
        onClick={() => onChange(ACCOUNT_TABS[0].id)}
        className={cn(
          linkClassName,
          ACCOUNT_TABS[0].id === active &&
            "border-[color:var(--text-primary)] text-[color:var(--text-primary)]",
        )}
      >
        {ACCOUNT_TABS[0].label}
      </button>
      {ACCOUNT_EXTERNAL_LINKS.map((l) => (
        <Link key={l.to} to={l.to} className={linkClassName}>
          {l.label}
        </Link>
      ))}
      {ACCOUNT_TABS.slice(1).map((t) => (
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
    </ScrollRow>
  );
}
