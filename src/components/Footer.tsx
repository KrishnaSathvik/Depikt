import { Link } from "@tanstack/react-router";
import { NAV_ITEMS } from "@/lib/product";

/**
 * Shared site footer. White, hairline top border, quiet: it reads as the end
 * of the document, not a banner.
 */
export function Footer() {
  return (
    <footer className="border-t border-[color:var(--border-subtle)] bg-[color:var(--bg)]">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-12">
        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-4">
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
            Depikt
          </span>
          <span className="text-body-sm text-[color:var(--text-tertiary)]">
            A workspace for better image prompts.
          </span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          {NAV_ITEMS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="text-body-sm text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
            >
              {label}
            </Link>
          ))}
          <Link
            to="/templates"
            className="text-body-sm text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
          >
            Templates
          </Link>
        </nav>
        <span className="text-body-sm text-[color:var(--text-tertiary)]">
          © {new Date().getFullYear()} Depikt
        </span>
      </div>
    </footer>
  );
}
