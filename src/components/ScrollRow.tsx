import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Horizontal scroll row with an overflow affordance: a soft fade on each
 * edge that still has content beyond it, plus a small chevron on the right
 * while more items exist. The cue disappears at the end of the row. Native
 * scrollbar hidden, momentum scrolling on, snap-to-item on touch.
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
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ left: el.scrollLeft > 2, right: max - el.scrollLeft > 2 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
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
    const left = active.offsetLeft - 16;
    const right = active.offsetLeft + active.offsetWidth + 16;
    if (left < el.scrollLeft || right > el.scrollLeft + el.clientWidth) {
      el.scrollTo({ left: Math.max(0, left), behavior: reduce ? "auto" : "smooth" });
    }
    measure();
  }, [activeKey, measure]);

  return (
    <Tag aria-label={ariaLabel} className={cn("relative min-w-0", className)}>
      <div
        ref={ref}
        className={cn(
          "no-scrollbar flex overflow-x-auto scroll-px-4 [-webkit-overflow-scrolling:touch] [scroll-snap-type:x_proximity]",
          innerClassName,
        )}
      >
        {children}
      </div>
      {/* Edge cues: pointer-events none so they never block taps. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[color:var(--bg)] to-transparent transition-opacity duration-200",
          edges.left ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-end bg-gradient-to-l from-[color:var(--bg)] via-[color:var(--bg)]/80 to-transparent pr-1 transition-opacity duration-200",
          edges.right ? "opacity-100" : "opacity-0",
        )}
      >
        <ChevronRight className="h-3.5 w-3.5 text-[color:var(--text-tertiary)]" />
      </div>
    </Tag>
  );
}
