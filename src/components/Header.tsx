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

// Visible labels: Generate · Prompt Library · Templates · Gallery.
// Header prepends Generate (flag on) or Prompt (flag off). Pricing sits
// with Sign in on the right. Blog and MCP stay footer-only.
//
// White, translucent, hairline bottom border. The active route is marked
// with a 1px ink underline rather than a pill or background.

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading } = useAuth();
  const workspaceItem: NavItem = isNativeGenerationEnabled()
    ? { to: ROUTES.prompt, label: TOOL.generate, search: { mode: "generate" } }
    : { to: ROUTES.prompt, label: TOOL.prompt };
  const items: NavItem[] = [workspaceItem, ...NAV_ITEMS];
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[color:var(--border-subtle)] bg-[color:var(--bg)]/90 backdrop-blur-md">
      <div className="relative mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-12">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Depikt home">
          <img src={logo} alt="" width={24} height={24} className="h-6 w-6" />
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
            Depikt
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 whitespace-nowrap md:flex"
        >
          {items.map(({ to, label, exact, search }) => (
            <Link
              key={`${to}-${label}`}
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

        {/* Sign in only after auth has resolved as signed-out. While loading,
            reserve the same width so signed-in sessions never flash Sign in. */}
        <div className="flex h-7 items-center justify-end gap-3">
          <Link
            to={ROUTES.pricing}
            className="px-2 py-1 text-[14px] font-medium text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
          >
            Pricing
          </Link>
          {user ? (
            <AccountMenu user={user} />
          ) : loading ? (
            <span className="inline-block min-w-[4.5rem] px-2 py-1" aria-hidden />
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

      <ScrollRow
        as="nav"
        ariaLabel="Primary"
        activeKey={pathname}
        className="border-t border-[color:var(--border-subtle)] md:hidden"
        innerClassName="justify-center px-2"
      >
        {items.map(({ to, label, exact, search }) => (
          <Link
            key={`${to}-${label}`}
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
