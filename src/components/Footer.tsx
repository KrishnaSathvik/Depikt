import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
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
 * Restrained three-column footer. No Product column: the header nav
 * already covers Library/Prompt/Generate/Gallery, so repeating it here was
 * just noise. Templates and MCP live here (never in the primary header);
 * "Get Started" carries Pricing plus the account entry points -- Sign
 * up/Sign in when signed out, the one Account link once signed in (no
 * point offering to sign up again). White, hairline, no tagline.
 *
 * Favorites/History are NOT here -- a global utility link buried at the
 * bottom of every page is the wrong home for something people reach for
 * mid-task. They're linked from where the data is actually created/used
 * instead: the Library header (favoriting) and the header's account menu
 * for signed-in users. See src/routes/favorites.tsx, history.tsx.
 *
 * Mobile/tablet (below lg): a balanced two-column grid — Resources in one
 * column, Get Started+Legal stacked together in the other (three items
 * don't split evenly into two, so they share a column rather than leaving
 * Legal wrapping alone under Resources). Desktop (lg+): three separate
 * columns, via `lg:contents` releasing the pair back into the grid.
 */
export function Footer() {
  const { user } = useAuth();
  const resources: FooterLink[] = [
    { to: ROUTES.blog, label: TOOL.blog },
    { to: "/templates", label: TOOL.templates },
    { to: MCP.pagePath, label: "MCP" },
    { to: ROUTES.help, label: "Help" },
  ];
  const getStarted: FooterLink[] = [
    { to: ROUTES.pricing, label: "Pricing" },
    ...(user
      ? [{ to: ROUTES.account, label: "Account" }]
      : [
          { to: ROUTES.signUp, label: "Sign up" },
          { to: ROUTES.signIn, label: "Sign in" },
        ]),
  ];
  const legal: FooterLink[] = [
    { to: ROUTES.privacy, label: "Privacy" },
    { to: ROUTES.terms, label: "Terms" },
  ];

  return (
    <footer className="border-t border-[color:var(--border-subtle)] bg-[color:var(--bg)]">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-12">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-3">
          <Column title="Resources" links={resources} />
          <div className="space-y-6 lg:contents">
            <Column title="Get Started" links={getStarted} />
            <Column title="Legal" links={legal} />
          </div>
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
