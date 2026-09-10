import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { MCP, ROUTES, TOOL } from "@/lib/product";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";

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
 * Restrained four-column footer. Templates and MCP live here (never in the
 * primary header); the Account column shows Sign in or Account depending on
 * session. White, hairline, no tagline.
 */
export function Footer() {
  const { user } = useAuth();
  const product: FooterLink[] = [
    { to: ROUTES.library, label: TOOL.library },
    { to: ROUTES.prompt, label: TOOL.prompt },
    ...(isNativeGenerationEnabled() ? [{ to: ROUTES.legacyBuilder, label: TOOL.generate }] : []),
    { to: ROUTES.gallery, label: TOOL.gallery },
  ];
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
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <Column title="Product" links={product} />
          <Column title="Resources" links={resources} />
          <Column title="Account" links={account} />
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
