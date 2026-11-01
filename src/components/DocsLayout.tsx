import type { ReactNode } from "react";
import { Mail } from "lucide-react";

/** The address already published in Help and the legal pages. */
export const SUPPORT_EMAIL = "depiktapp@gmail.com";

/**
 * Shared layout for reading/support pages (Help, Privacy, Terms): a sticky
 * sidebar card on the left (desktop) beside the content column. The sidebar
 * stretches to the content's height so its sticky child can travel.
 */
export function DocsLayout({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-12 lg:mt-16 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4">{sidebar}</div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Sidebar card with a small label. */
export function SidebarCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="surface-card p-4">
      <p className="px-2 text-[12px] font-medium uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** "Still need help?" — the one real support channel, shown wherever people read docs. */
export function ContactCard() {
  return (
    <div className="surface-card overflow-hidden p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[image:var(--brand-gradient)] text-white shadow-[var(--brand-glow)]">
        <Mail className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-[color:var(--text-primary)]">
        Still need help?
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--text-secondary)]">
        Email us about your account, billing, or privacy.
      </p>
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="mt-3 inline-flex min-h-11 items-center text-[13px] font-medium text-[color:var(--text-primary)] underline underline-offset-4 sm:min-h-0"
      >
        {SUPPORT_EMAIL}
      </a>
    </div>
  );
}
