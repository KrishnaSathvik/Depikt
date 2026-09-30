import { Link } from "@tanstack/react-router";
import { MCP, ROUTES, TOOL } from "@/lib/product";

type FooterLink = { to: string; label: string };

function Column({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
        {title}
      </p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="text-body-sm text-[color:var(--text-secondary)] underline-offset-4 transition-colors hover:text-[color:var(--text-primary)]"
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
 * One-section footer: brand block on the left (name, tagline, copyright),
 * link columns on the right. On mobile it stacks into a single column.
 * No Product column -- the header nav already covers Library/Prompt/Gallery;
 * Templates, MCP, Help, and Pricing live under Resources. Favorites/History
 * stay where the data is created (Library header, account menu).
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
    <footer className="border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)]">
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-12">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Link
              to="/"
              className="text-[17px] font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]"
            >
              Depikt
            </Link>
            <p className="mt-3 text-body-sm leading-relaxed text-[color:var(--text-secondary)]">
              The reference library and prompt workspace for ChatGPT Images.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            <Column title="Resources" links={resources} />
            <Column title="Legal" links={legal} />
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-[color:var(--border-subtle)] pt-6 sm:flex-row sm:items-center sm:justify-between">
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
