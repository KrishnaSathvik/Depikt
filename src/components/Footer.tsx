import { Link } from "@tanstack/react-router";
import { NAV_ITEMS, POSITIONING } from "@/lib/product";

/**
 * Shared site footer. Ink surface: the one dark band on every page.
 */
export function Footer() {
  return (
    <footer className="ink">
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-12 lg:py-16">
        <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-[44ch]">
            <p className="text-[15px] font-semibold tracking-[-0.02em]">Depikt</p>
            <p className="mt-3 text-body-sm text-[color:var(--ink-text-secondary)]">
              {POSITIONING.concept} Depikt writes and reviews prompts; the images are made in
              ChatGPT.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            {NAV_ITEMS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-body-sm text-[color:var(--ink-text-secondary)] transition-colors hover:text-[color:var(--ink-text)]"
              >
                {label}
              </Link>
            ))}
            <Link
              to="/templates"
              className="text-body-sm text-[color:var(--ink-text-secondary)] transition-colors hover:text-[color:var(--ink-text)]"
            >
              Templates
            </Link>
          </nav>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--ink-border)] pt-6 font-mono text-[11.5px] uppercase tracking-[0.06em] text-[color:var(--ink-text-secondary)]">
          <span>© {new Date().getFullYear()} Depikt</span>
          <span>Free · No login · No image generation</span>
        </div>
      </div>
    </footer>
  );
}
