import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, X } from "lucide-react";
import { ANNOUNCEMENT, isAnnouncementLive } from "@/lib/product";

const STORAGE_KEY = `depikt:announcement-dismissed:${ANNOUNCEMENT.id}`;

/**
 * Single-line announcement strip rendered above the hero. Data-driven from
 * ANNOUNCEMENT in product.ts; dismissal is remembered per announcement id.
 * Renders nothing when the announcement is inactive, expired, or dismissed.
 *
 * Starts hidden during SSR and reveals after mount so a dismissed strip
 * never flashes on the server-rendered frame.
 */
export function AnnouncementBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAnnouncementLive(ANNOUNCEMENT)) return;
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      /* storage unavailable: show the strip */
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
    <div
      role="region"
      aria-label="Announcement"
      className="border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)]"
    >
      <div className="mx-auto flex h-10 max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-12">
        <Link
          to="/blog/$slug"
          params={{ slug: ANNOUNCEMENT.slug }}
          className="group flex min-w-0 flex-1 items-center gap-3 text-[13px] text-[color:var(--text-primary)]"
        >
          <span className="pill pill-solid shrink-0 !px-2 !py-[3px] !text-[11px]">
            {ANNOUNCEMENT.badge}
          </span>
          <span className="truncate">
            <span className="font-medium">{ANNOUNCEMENT.title}</span>
            <span className="hidden text-[color:var(--text-secondary)] sm:inline">
              {" "}
              {ANNOUNCEMENT.body}
            </span>
          </span>
          <span className="ml-auto hidden shrink-0 items-center gap-1 font-medium underline-offset-4 group-hover:underline sm:inline-flex">
            {ANNOUNCEMENT.cta}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
          <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 sm:hidden" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[color:var(--text-tertiary)] transition-colors hover:bg-[color:var(--bg-elevated)] hover:text-[color:var(--text-primary)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
