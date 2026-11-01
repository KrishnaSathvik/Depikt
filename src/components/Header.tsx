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

// Home is the creator; Library is the single browse destination. A floating
// glass bar: brand left, Create + Library centred, account right — one row at
// every width.
export function Header() {
  const { user, loading } = useAuth();
  const items: NavItem[] = [...NAV_ITEMS];
  return (
    <header className="sticky top-0 z-40 w-full px-3 pt-3 sm:px-5">
      <div className="relative mx-auto flex h-12 max-w-[1200px] items-center justify-between rounded-full border border-[color:var(--border-subtle)] bg-white/75 pl-3 pr-2 shadow-[0_8px_30px_-18px_rgba(17,17,17,0.35)] backdrop-blur-xl backdrop-saturate-150 sm:pl-4">
        <Link to="/" className="flex min-h-10 items-center gap-2" aria-label="Depikt home">
          <img src={logo} alt="" width={24} height={24} className="h-6 w-6 rounded-md" />
          <span className="text-[16px] font-semibold tracking-[-0.03em] text-[color:var(--text-primary)]">
            Depikt
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="flex items-center gap-0.5 whitespace-nowrap md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
        >
          <Link to="/" hash="create" className={NAV_CLS}>
            Create
          </Link>
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
        <div className="flex h-10 items-center justify-end gap-1 sm:h-8">
          {user ? (
            <Suspense fallback={<span className="min-w-7" aria-label="Loading account" />}>
              <AccountMenu user={user} />
            </Suspense>
          ) : loading ? (
            <span className="inline-block min-w-[4.5rem] px-2 py-1" aria-hidden />
          ) : (
            <Link
              to={ROUTES.signIn}
              className="inline-flex h-10 items-center rounded-full bg-[color:var(--text-primary)] px-4 sm:h-8 text-[13px] font-medium text-[color:var(--bg)] transition-colors hover:bg-[color:var(--accent-hover)] hover:text-[color:var(--text-tertiary)]"
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
  "relative inline-flex min-h-10 items-center rounded-full px-3 text-[14px] sm:min-h-8 font-medium transition-colors duration-150 after:absolute after:bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-[image:var(--brand-gradient)] after:opacity-0 after:transition-opacity";
const NAV_CLS = `${NAV_BASE} text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-primary)]`;
const NAV_CLS_ACTIVE = `${NAV_BASE} text-[color:var(--text-primary)] after:opacity-100`;
