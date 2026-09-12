import { Link } from "@tanstack/react-router";
import { MCP, ROUTES, TOOL } from "@/lib/product";

type FooterLink = { to: string; label: string };

function Column({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text-primary)]">
        {title}
      </p>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="text-body-sm text-[color:var(--text-secondary)] underline-offset-4 hover:text-[color:var(--text-primary)] hover:underline"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Restrained two-column footer. No Product column: the header nav already
 * covers Library/Prompt/Generate/Gallery, so repeating it here was just
 * noise. Templates, MCP, Help, and Pricing all live under Resources; no
 * separate Sign up/Sign in/Account column -- the header avatar (signed in)
 * or "Sign in" link (signed out) already cover that. White, hairline, no
 * tagline.
 *
 * Favorites/History are NOT here -- a global utility link buried at the
 * bottom of every page is the wrong home for something people reach for
 * mid-task. They're linked from where the data is actually created/used
 * instead: the Library header (favoriting) and the header's account menu
 * for signed-in users. See src/routes/favorites.tsx, history.tsx.
 */
export function Footer() {
  const resources: FooterLink[] = [
    { to: ROUTES.blog, label: TOOL.blog },
    { to: "/templates", label: TOOL.templates },
    { to: MCP.pagePath, label: "MCP" },
    { to: ROUTES.help, label: "Help" },
    { to: ROUTES.pricing, label: "Pricing" },
  ];
  const legal: FooterLink[] = [
    { to: ROUTES.privacy, label: "Privacy" },
    { to: ROUTES.terms, label: "Terms" },
  ];

  return (
    <footer className="border-t border-[color:var(--border-subtle)] bg-[color:var(--bg)]">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-12">
        <div className="grid grid-cols-2 gap-8">
          <Column title="Resources" links={resources} />
          <Column title="Legal" links={legal} />
        </div>
        <div className="mt-10 flex items-baseline gap-3 border-t border-[color:var(--border-subtle)] pt-6">
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
            Depikt
          </span>
          <span className="text-body-sm text-[color:var(--text-tertiary)]">
            © {new Date().getFullYear()} Depikt
          </span>
        </div>
      </div>
    </footer>
  );
}
