import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";
import { NAV_ITEMS, ROUTES } from "@/lib/product";
import { useAuth } from "@/lib/auth-context";
import { lazy, Suspense } from "react";
const AccountMenu = lazy(() =>
  import("@/components/auth/AccountMenu").then((m) => ({ default: m.AccountMenu })),
);

interface NavItem {
  to: (typeof ROUTES)[keyof typeof ROUTES];
  label: string;
  exact?: boolean;
  search?: { mode: "generate" };
}

// Home is the creator; Library is the single browse destination.
export function Header() {
  const { user, loading } = useAuth();
  const items: NavItem[] = [...NAV_ITEMS];
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[color:var(--border-subtle)] bg-[color:var(--bg)]/90 backdrop-blur-md">
      <div className="relative mx-auto flex h-12 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-12">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Depikt home">
          <img src={logo} alt="" width={24} height={24} className="h-6 w-6" />
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
            Depikt
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="flex items-center gap-0.5 whitespace-nowrap md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
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
        <div className="flex h-7 items-center justify-end gap-1">
          {user ? (
            <Suspense fallback={<span className="min-w-7" aria-label="Loading account" />}>
              <AccountMenu user={user} />
            </Suspense>
          ) : loading ? (
            <span className="inline-block min-w-[4.5rem] px-2 py-1" aria-hidden />
          ) : (
            <Link
              to={ROUTES.signIn}
              className="px-2 py-1 text-[13px] font-medium text-[color:var(--text-tertiary)] transition-colors hover:text-[color:var(--text-primary)]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

const NAV_BASE =
  "relative px-3 py-1.5 text-[14px] font-medium transition-colors duration-150 after:absolute after:inset-x-3 after:-bottom-[13px] after:h-px after:bg-[color:var(--text-primary)] after:opacity-0 after:transition-opacity";
const NAV_CLS = `${NAV_BASE} text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]`;
const NAV_CLS_ACTIVE = `${NAV_BASE} text-[color:var(--text-primary)] after:opacity-100`;
