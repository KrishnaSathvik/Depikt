import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { MCP, ROUTES, TOOL } from "@/lib/product";

type FooterLink = { to: string; label: string };

function Column({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
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
 * the Account column shows Sign in or Account depending on session. White,
 * hairline, no tagline.
 *
 * Mobile/tablet (below lg): a balanced two-column grid — Resources in one
 * column, Account+Legal stacked together in the other (three items don't
 * split evenly into two, so Account and Legal share a column rather than
 * leaving Legal wrapping alone under Resources). Desktop (lg+): three
 * separate columns, via `lg:contents` releasing the pair back into the grid.
 */
export function Footer() {
  const { user } = useAuth();
  const resources: FooterLink[] = [
    { to: ROUTES.blog, label: TOOL.blog },
    { to: "/templates", label: TOOL.templates },
    { to: MCP.pagePath, label: "MCP" },
    { to: ROUTES.help, label: "Help" },
  ];
  const account: FooterLink[] = [
    { to: ROUTES.pricing, label: "Pricing" },
    user ? { to: ROUTES.account, label: "Account" } : { to: ROUTES.signIn, label: "Sign in" },
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
            <Column title="Account" links={account} />
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
