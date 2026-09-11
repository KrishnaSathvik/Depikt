import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";
import { NAV_ITEMS, ROUTES, TOOL } from "@/lib/product";
import { ScrollRow } from "@/components/ScrollRow";
import { useRouterState } from "@tanstack/react-router";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { useAuth } from "@/lib/auth-context";
import { AccountMenu } from "@/components/auth/AccountMenu";

interface NavItem {
  to: (typeof ROUTES)[keyof typeof ROUTES];
  label: string;
  exact?: boolean;
  search?: { mode: "generate" };
}

// Visible labels come from product.ts (Library · Generate · Gallery). Blog
// lives in the footer only, not the header.
// Generate, Build, and Critique are all modes inside one unified workspace
// (/prompt), not separate nav items; Templates lives in the footer. The one
// nav entry for that workspace is inserted here, between Library and
// Gallery: labeled Generate when the native-generation feature flag is on,
// or Prompt when it's off (Build/Critique predate the flag and must stay
// reachable without it) — never part of the frozen NAV_ITEMS export itself.
//
// White, translucent, hairline bottom border. The active route is marked
// with a 1px ink underline rather than a pill or background.

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading } = useAuth();
  // Links straight to /prompt (not the /generate redirect route) so the
  // active-state match below works purely on pathname, matching whichever
  // mode tab ends up selected.
  const workspaceItem: NavItem = isNativeGenerationEnabled()
    ? { to: ROUTES.prompt, label: TOOL.generate, search: { mode: "generate" } }
    : { to: ROUTES.prompt, label: TOOL.prompt };
  const items: NavItem[] = [NAV_ITEMS[0], workspaceItem, NAV_ITEMS[1]];
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[color:var(--border-subtle)] bg-[color:var(--bg)]/90 backdrop-blur-md">
      <div className="relative mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-12">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Depikt home">
          <img src={logo} alt="" width={24} height={24} className="h-6 w-6" />
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
            Depikt
          </span>
        </Link>

        {/* Desktop: centered nav */}
        <nav
          aria-label="Primary"
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 whitespace-nowrap md:flex"
        >
          {items.map(({ to, label, exact, search }) => (
            <Link
              key={to}
              to={to}
              search={search}
              className={NAV_CLS}
              activeProps={{ className: NAV_CLS_ACTIVE }}
              activeOptions={exact ? { exact: true } : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right: exactly one auth control. Signed out → "Sign in"; signed in → avatar menu. */}
        <div className="flex h-7 min-w-[56px] items-center justify-end">
          {loading ? null : user ? (
            <AccountMenu user={user} />
          ) : (
            <Link
              to={ROUTES.signIn}
              className="px-2 py-1 text-[14px] font-medium text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      {/* Mobile: scrollable nav row with an overflow cue; the active route scrolls into view. */}
      <ScrollRow
        as="nav"
        ariaLabel="Primary"
        activeKey={pathname}
        className="border-t border-[color:var(--border-subtle)] md:hidden"
        innerClassName="justify-center px-2"
      >
        {items.map(({ to, label, exact, search }) => (
          <Link
            key={to}
            to={to}
            search={search}
            className={MOBILE_NAV_CLS}
            activeProps={{ className: MOBILE_NAV_CLS_ACTIVE }}
            activeOptions={exact ? { exact: true } : undefined}
          >
            {label}
          </Link>
        ))}
      </ScrollRow>
    </header>
  );
}

const NAV_BASE =
  "relative px-3 py-2 text-[14px] font-medium transition-colors duration-150 after:absolute after:inset-x-3 after:-bottom-[15px] after:h-px after:bg-[color:var(--text-primary)] after:opacity-0 after:transition-opacity";
const NAV_CLS = `${NAV_BASE} text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]`;
const NAV_CLS_ACTIVE = `${NAV_BASE} text-[color:var(--text-primary)] after:opacity-100`;

const MOBILE_NAV_CLS =
  "shrink-0 snap-start whitespace-nowrap px-3 py-2.5 text-[13px] font-medium text-[color:var(--text-secondary)] transition-colors border-b border-transparent";
const MOBILE_NAV_CLS_ACTIVE =
  "shrink-0 snap-start whitespace-nowrap px-3 py-2.5 text-[13px] font-medium text-[color:var(--text-primary)] border-b border-[color:var(--text-primary)] -mb-px";
