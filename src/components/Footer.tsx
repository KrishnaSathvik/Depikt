import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";
import { MCP, ROUTES, TOOL } from "@/lib/product";

type FooterLink = { to: string; label: string };

function Column({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-[color:var(--text-primary)]">{title}</p>
      <ul className="mt-4 space-y-3">
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="text-body-sm text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
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
 * Footer: brand block (mark and tagline) and two
 * link columns, then the copyright row. No
 * Product column — the header covers Create/Library; Templates, MCP, Help,
 * and Pricing live under Resources. Account links stay in the header menu.
 */
export function Footer() {
  const resources: FooterLink[] = [
    { to: ROUTES.blog, label: TOOL.blog },
    { to: MCP.pagePath, label: "MCP" },
    { to: ROUTES.help, label: "Help" },
    { to: ROUTES.pricing, label: "Pricing" },
  ];
  const legal: FooterLink[] = [
    { to: ROUTES.privacy, label: "Privacy" },
    { to: ROUTES.terms, label: "Terms" },
  ];

  return (
    <footer className="relative mt-8 overflow-hidden border-t border-[color:var(--border-subtle)] bg-[color:var(--bg)]">
      <div className="relative mx-auto max-w-[1200px] px-4 pt-14 sm:px-6">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Depikt home">
              <img src={logo} alt="" width={28} height={28} className="h-7 w-7 rounded-lg" />
              <span className="text-[20px] font-semibold tracking-[-0.03em] text-[color:var(--text-primary)]">
                Depikt
              </span>
            </Link>
            <p className="mt-4 text-body-sm leading-relaxed text-[color:var(--text-secondary)]">
              The reference library and prompt workspace for ChatGPT Images.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-12 sm:gap-20">
            <Column title="Resources" links={resources} />
            <Column title="Legal" links={legal} />
          </div>
        </div>

        <div className="relative mt-14 flex flex-col gap-2 border-t border-[color:var(--border-subtle)] py-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[13px] text-[color:var(--text-tertiary)]">
            © {new Date().getFullYear()} Depikt. All rights reserved.
          </span>
          <span className="text-[13px] text-[color:var(--text-tertiary)]">
            Built for ChatGPT Images 2.5
          </span>
        </div>
      </div>
    </footer>
  );
}
