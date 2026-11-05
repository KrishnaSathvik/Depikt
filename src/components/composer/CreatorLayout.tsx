import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Idle creator layout: the composer full width, then mode-specific starters
 * and showcases underneath. Results replace the footer once they exist.
 */
export function CreatorIdleLayout({
  children,
  footer,
}: {
  children: ReactNode;
  /** Full-width content under the composer (quick starts, showcases). */
  footer?: ReactNode;
}) {
  return (
    <div className="space-y-10">
      <div className="mx-auto min-w-0 max-w-[880px]">{children}</div>
      {footer}
    </div>
  );
}

const RATIOS: ReadonlyArray<{ value: string | null; label: string; w: number; h: number }> = [
  { value: null, label: "Auto", w: 12, h: 12 },
  { value: "1:1", label: "1:1", w: 12, h: 12 },
  { value: "3:2", label: "3:2", w: 15, h: 10 },
  { value: "2:3", label: "2:3", w: 10, h: 15 },
  { value: "16:9", label: "16:9", w: 16, h: 9 },
  { value: "9:16", label: "9:16", w: 9, h: 16 },
];

/**
 * Every shape icon is drawn inside the same 16×16 envelope so the row never
 * jumps: the tallest portrait and the widest landscape occupy identical space.
 */
const ICON_BOX = 16;
const ICON_MAX = 14;

function iconSize(w: number, h: number) {
  const scale = ICON_MAX / Math.max(w, h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

/**
 * Aspect ratio as one segmented control: a single hairline track holding all
 * six choices at equal weight, the picked one filled with ink. A radio group,
 * keyboard-native.
 */
export function RatioPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Aspect ratio"
      className="grid w-full grid-cols-6 gap-0.5 rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] p-1 sm:inline-grid sm:w-auto sm:grid-cols-[repeat(6,minmax(0,auto))] sm:gap-1"
      onKeyDown={(event) => {
        const step =
          event.key === "ArrowRight" || event.key === "ArrowDown"
            ? 1
            : event.key === "ArrowLeft" || event.key === "ArrowUp"
              ? -1
              : 0;
        if (!step) return;
        event.preventDefault();
        const index = RATIOS.findIndex((r) => r.value === value);
        const next = RATIOS[(index + step + RATIOS.length) % RATIOS.length];
        onChange(next.value);
        const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]");
        buttons[RATIOS.indexOf(next)]?.focus();
      }}
    >
      {RATIOS.map((r) => {
        const selected = value === r.value;
        const { width, height } = iconSize(r.w, r.h);
        return (
          <Button
            variant="ghost"
            key={r.label}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(r.value)}
            className={cn(
              "inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-full px-1 text-[12px] font-medium transition-colors sm:gap-1.5 sm:px-2.5 sm:text-[13px]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]",
              selected
                ? "bg-[color:var(--text-primary)] text-[color:var(--accent-text)]"
                : "text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]",
            )}
          >
            <span
              aria-hidden
              className="grid shrink-0 place-items-center"
              style={{ width: ICON_BOX, height: ICON_BOX }}
            >
              {r.value === null ? (
                <span
                  className="rounded-[3px] border-[1.5px] border-dashed border-current"
                  style={{ width, height }}
                />
              ) : (
                <span
                  className="rounded-[2px] border-[1.5px] border-current"
                  style={{ width, height }}
                />
              )}
            </span>
            {r.label}
          </Button>
        );
      })}
    </div>
  );
}
