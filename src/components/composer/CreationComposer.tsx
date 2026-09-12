import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ScrollRow } from "@/components/ScrollRow";
import type { ComposerExample } from "@/data/composer-examples";

export interface CreationComposerProps {
  /** The textarea itself — callers keep full control of ref/value/onKeyDown/onPaste/drag-drop. */
  children: ReactNode;
  /** Attachment tray: reference thumbnails + "Add reference" control. Omit for no divider row. */
  referencesSlot?: ReactNode;
  /** Left side of the footer: ratio/credits/keyboard-hint — quiet contextual info, never the primary action. */
  caption?: ReactNode;
  /** The submit button itself — callers keep full control of onClick/disabled/label. */
  submit: ReactNode;
  onDragOver?: React.DragEventHandler;
  onDrop?: React.DragEventHandler;
  className?: string;
}

/**
 * Shared textarea classes for Generate / Build / Critique so the three modes
 * share one input density. Critique may append `font-mono` for pasted prompts.
 */
export const COMPOSER_TEXTAREA_CLASS =
  "resize-y text-[17px] leading-[1.6] px-5 py-4 sm:text-[18px] min-h-[220px]";

/**
 * The one visual shell for a creation input — Generate, Prompt Build, and
 * Prompt Critique all wrap their textarea in this instead of three
 * unrelated-looking stacks of textarea/dashed-button/black-rectangle. The
 * submit action lives inside the composer's own footer, next to whatever
 * contextual info applies (ratio, credits, a keyboard hint) — never a
 * separate full-width button floating below.
 *
 * Deliberately not a compound/slot-registry component: three explicit props
 * (referencesSlot, caption, submit) cover every current caller without
 * hidden coupling, and each caller keeps its own textarea (ref, onKeyDown,
 * onPaste, drag-and-drop) rather than this component reimplementing it.
 */
export function CreationComposer({
  children,
  referencesSlot,
  caption,
  submit,
  onDragOver,
  onDrop,
  className,
}: CreationComposerProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "overflow-hidden rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)]",
        "[&_textarea]:rounded-none [&_textarea]:border-0 [&_textarea]:shadow-none [&_textarea]:focus-visible:outline-none [&_textarea]:focus-visible:ring-0",
        className,
      )}
    >
      {children}
      {referencesSlot && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--border-subtle)] px-4 py-3">
          {referencesSlot}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border-subtle)] px-4 py-3">
        <div className="min-w-0 text-body-sm text-[color:var(--text-secondary)]">{caption}</div>
        {submit}
      </div>
    </div>
  );
}

/**
 * Horizontal suggestion cards under the composer — not filter pills.
 * Each card shows a short title + hint; click fills the full `text`.
 */
export function ComposerChips({
  label = "Try one of these",
  chips,
  onSelect,
  className,
}: {
  label?: string;
  chips: ReadonlyArray<ComposerExample>;
  onSelect: (text: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="eyebrow">{label}</p>
      <ScrollRow ariaLabel={label} innerClassName="gap-2.5 pb-0.5">
        {chips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => onSelect(chip.text)}
            className={cn(
              "group shrink-0 snap-start w-[min(220px,72vw)] rounded-md border border-[color:var(--border-default)]",
              "bg-[color:var(--bg)] px-3.5 py-3 text-left transition-colors",
              "hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-subtle)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2",
            )}
          >
            <span className="block text-body-sm font-medium text-[color:var(--text-primary)]">
              {chip.label}
            </span>
            <span className="mt-1 block line-clamp-2 text-[12px] leading-snug text-[color:var(--text-tertiary)]">
              {chip.hint}
            </span>
          </button>
        ))}
      </ScrollRow>
    </div>
  );
}
