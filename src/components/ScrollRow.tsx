import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Horizontal scroll row with an overflow affordance: a small chevron on the
 * right while more items exist. Native scrollbar hidden, momentum scrolling
 * on, snap-to-item on touch.
 *
 * Pass `activeKey` (for example the current pathname) to scroll the active
 * item (`data-status="active"` from TanStack Link, or `data-active="true"`)
 * into view whenever it changes.
 */
export function ScrollRow({
  children,
  className,
  innerClassName,
  activeKey,
  ariaLabel,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  activeKey?: string;
  ariaLabel?: string;
  as?: "div" | "nav";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowsRight, setOverflowsRight] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // Ignore leftover snap/subpixel scroll so the start of the row stays clean.
    setOverflowsRight(max - el.scrollLeft > 12);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const syncSnapPadding = () => {
      const styles = getComputedStyle(el);
      el.style.scrollPaddingInlineStart = styles.paddingInlineStart;
      el.style.scrollPaddingInlineEnd = styles.paddingInlineEnd;
    };
    syncSnapPadding();
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      syncSnapPadding();
      measure();
    }) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  // Keep the active item visible (first paint and on route change).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // TanStack Link marks the active route with data-status="active"; other
    // callers can set data-active="true" themselves.
    const active = el.querySelector<HTMLElement>('[data-status="active"], [data-active="true"]');
    if (!active) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const pad = Number.parseFloat(getComputedStyle(el).paddingInlineStart) || 0;
    const left = Math.max(0, active.offsetLeft - pad);
    const right = active.offsetLeft + active.offsetWidth + pad;
    if (left < el.scrollLeft || right > el.scrollLeft + el.clientWidth) {
      el.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
    }
    measure();
  }, [activeKey, measure]);

  return (
    <Tag aria-label={ariaLabel} className={cn("relative min-w-0", className)}>
      <div
        ref={ref}
        className={cn(
          "no-scrollbar flex overflow-x-auto [-webkit-overflow-scrolling:touch] [scroll-snap-type:x_proximity]",
          innerClassName,
        )}
      >
        {children}
      </div>
      {/* Chevron only — a white gradient overlay reads as a veil on solid pills. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 flex items-center justify-end pr-1 transition-opacity duration-200",
          overflowsRight ? "opacity-100" : "opacity-0",
        )}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg)] text-[color:var(--text-tertiary)]">
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Tag>
  );
}
