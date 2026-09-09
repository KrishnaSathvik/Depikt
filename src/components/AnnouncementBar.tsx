import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, X } from "lucide-react";
import { ANNOUNCEMENT, isAnnouncementLive } from "@/lib/product";

const STORAGE_KEY = `depikt:announcement-dismissed:${ANNOUNCEMENT.id}`;

/**
 * Compact editorial launch block rendered under the header. Data-driven
 * from ANNOUNCEMENT in product.ts; dismissal is remembered per announcement
 * id. Renders nothing when the announcement is inactive, expired, or
 * dismissed. Hidden during SSR so a dismissed block never flashes.
 */
export function AnnouncementBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAnnouncementLive(ANNOUNCEMENT)) return;
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      /* storage unavailable: show the block */
    }
    if (!dismissed) setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <section
      aria-label="Announcement"
      className="border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)]"
    >
      <div className="relative mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-6 pr-12 sm:px-6 md:min-h-[120px] md:flex-row md:items-center md:justify-between md:gap-10 md:py-8 lg:px-12">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="pill pill-solid !px-2.5 !py-1 !text-[12px]">{ANNOUNCEMENT.badge}</span>
            <h2 className="text-heading-md text-[color:var(--text-primary)] md:text-heading-lg">
              {ANNOUNCEMENT.title}
            </h2>
          </div>
          <p className="mt-2 max-w-[60ch] text-body-md text-[color:var(--text-secondary)]">
            {ANNOUNCEMENT.body}
          </p>
        </div>
        <Link
          to="/blog/$slug"
          params={{ slug: ANNOUNCEMENT.slug }}
          className="group inline-flex shrink-0 items-center gap-1.5 text-body-md font-medium text-[color:var(--text-primary)] underline-offset-4 hover:underline"
        >
          {ANNOUNCEMENT.cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--text-tertiary)] transition-colors hover:bg-[color:var(--bg-elevated)] hover:text-[color:var(--text-primary)] sm:right-5 md:top-1/2 md:-translate-y-1/2 lg:right-6"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
