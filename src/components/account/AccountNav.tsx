import { ACCOUNT_TABS, type AccountTabId } from "@/lib/profile/account-tabs";
import { cn } from "@/lib/utils";

/**
 * One nav, shared by desktop and mobile: three small underline tabs (same
 * treatment as Header's own primary nav), not a permanent sidebar. Three
 * sections never needed a rail -- it left the page looking like a
 * half-empty admin panel, and duplicated the identity AccountHeader
 * already shows. Sign out lives at the bottom of Profile now, not mixed
 * into this row.
 */
export function AccountNav({
  active,
  onChange,
}: {
  active: AccountTabId;
  onChange: (id: AccountTabId) => void;
}) {
  return (
    <nav
      aria-label="Account sections"
      className="flex items-center justify-center gap-1 border-b border-[color:var(--border-subtle)] sm:justify-start"
    >
      {ACCOUNT_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-current={t.id === active ? "page" : undefined}
          onClick={() => onChange(t.id)}
          className={cn(
            "relative px-4 py-3 text-[14px] font-medium transition-colors after:absolute after:inset-x-4 after:-bottom-px after:h-[2px] after:transition-opacity",
            t.id === active
              ? "text-[color:var(--text-primary)] after:bg-[color:var(--text-primary)] after:opacity-100"
              : "text-[color:var(--text-secondary)] after:opacity-0 hover:text-[color:var(--text-primary)]",
          )}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
