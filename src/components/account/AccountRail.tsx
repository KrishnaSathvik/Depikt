import { DepiktAvatar } from "@/components/profile/DepiktAvatar";
import { useProfile } from "@/lib/profile/profile-context";
import { ACCOUNT_TABS, type AccountTabId } from "@/lib/profile/account-tabs";
import { cn } from "@/lib/utils";

/**
 * Desktop-only left rail (hidden below `lg` — AccountTabs is the mobile
 * equivalent, a horizontal ScrollRow). A quiet 200px column, not a dark
 * dashboard sidebar: white background, a hairline separating it from the
 * content, identity at the top so the account feels like a whole page
 * rather than a settings panel bolted onto a summary tab.
 */
export function AccountRail({
  active,
  onChange,
}: {
  active: AccountTabId;
  onChange: (id: AccountTabId) => void;
}) {
  const { profile } = useProfile();

  return (
    <nav
      aria-label="Account sections"
      className="hidden w-[200px] shrink-0 border-r border-[color:var(--border-subtle)] pr-6 lg:block"
    >
      <div className="flex items-center gap-3">
        {profile && (
          <DepiktAvatar seed={profile.avatarSeed} style={profile.avatarVariant} size={40} />
        )}
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
      </div>

      <ul className="mt-6 space-y-0.5">
        {ACCOUNT_TABS.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              aria-current={t.id === active ? "page" : undefined}
              onClick={() => onChange(t.id)}
              className={cn(
                "block w-full rounded-md px-3 py-2 text-left text-[14px] font-medium transition-colors",
                t.id === active
                  ? "bg-[color:var(--bg-subtle)] text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-primary)]",
              )}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
