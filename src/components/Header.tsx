import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

const NAV_ITEMS = [
  { to: "/library" as const, label: "Library", exact: true },
  { to: "/generate" as const, label: "Generate" },
  { to: "/critique" as const, label: "Critique" },
  { to: "/gallery" as const, label: "Gallery" },
  { to: "/blog" as const, label: "Blog" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[color:var(--border-subtle)] bg-[color:var(--bg)]/85 backdrop-blur-md">
      <div className="relative mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6 lg:px-12">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="Depikt logo" width={28} height={28} className="h-7 w-7 dark:invert" />
          <span className="text-[15px] font-semibold tracking-tight text-[color:var(--text-primary)]">
            Depikt
          </span>
        </Link>

        {/* Desktop: centered nav */}
        <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-1">
          {NAV_ITEMS.map(({ to, label, exact }) => (
            <Link
              key={to}
              to={to}
              className={NAV_CLS}
              activeProps={{ className: NAV_CLS_ACTIVE }}
              activeOptions={exact ? { exact: true } : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile: scrollable nav row */}
      <nav className="flex md:hidden overflow-x-auto border-t border-[color:var(--border-subtle)] px-4 no-scrollbar">
        {NAV_ITEMS.map(({ to, label, exact }) => (
          <Link
            key={to}
            to={to}
            className={MOBILE_NAV_CLS}
            activeProps={{ className: MOBILE_NAV_CLS_ACTIVE }}
            activeOptions={exact ? { exact: true } : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

const NAV_CLS =
  "px-3 py-2 text-sm font-medium text-[color:var(--text-secondary)] transition-colors duration-150 hover:text-[color:var(--text-primary)]";
const NAV_CLS_ACTIVE = "px-3 py-2 text-sm font-medium text-[color:var(--text-primary)]";

const MOBILE_NAV_CLS =
  "shrink-0 px-3 py-2.5 text-sm font-medium text-[color:var(--text-secondary)] transition-colors";
const MOBILE_NAV_CLS_ACTIVE =
  "shrink-0 px-3 py-2.5 text-sm font-medium text-[color:var(--text-primary)] border-b-2 border-[color:var(--accent)]";
