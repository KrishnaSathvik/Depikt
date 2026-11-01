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
  "resize-none [field-sizing:content] min-h-[168px] max-h-[44vh] overflow-y-auto text-[17px] leading-[1.6] px-5 pt-5 pb-4 sm:px-6 sm:text-[19px] placeholder:text-[color:var(--text-quaternary)]";

/**
 * One visual language for every control in the composer's tool row and
 * footer (reference upload, saved references, reference intent, ratio): sans
 * pill, hairline border, secondary ink, and a 44px touch target on mobile that
 * relaxes to 36px from `sm` up. Mono stays reserved for data.
 */
export const COMPOSER_TOOL_CLASS =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-3 text-[13px] sm:px-3.5 font-medium text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-1 sm:min-h-9";

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
        "composer-shell overflow-hidden rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] shadow-[var(--shadow-md)] transition-[border-color,box-shadow] duration-150",
        // The surface, not the bare textarea, shows focus — one calm ring for the whole input.
        "focus-within:border-[color:var(--border-strong)] focus-within:shadow-[var(--shadow-lg)]",
        "[&_textarea]:rounded-none [&_textarea]:border-0 [&_textarea]:bg-transparent [&_textarea]:shadow-none [&_textarea]:focus-visible:outline-none [&_textarea]:focus-visible:ring-0",
        className,
      )}
    >
      {children}
      {referencesSlot && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3 pt-2 sm:gap-2 sm:px-5">
          {referencesSlot}
        </div>
      )}
      <div className="composer-footer flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border-subtle)] px-4 py-3 sm:px-5 [&>button]:min-h-11 [&>button]:w-full [&>button]:rounded-full [&>button]:px-5 sm:[&>button]:min-h-10 sm:[&>button]:w-auto">
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
  compact = false,
}: {
  compact?: boolean;
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
              "group shrink-0 snap-start rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-left transition-colors",
              compact ? "min-h-11 px-4 sm:min-h-10" : "w-[min(220px,72vw)] rounded-xl px-3.5 py-3",
              "hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-subtle)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2",
            )}
          >
            <span className="block text-body-sm font-medium text-[color:var(--text-primary)]">
              {chip.label}
            </span>
            {!compact && (
              <span className="mt-1 block line-clamp-2 text-[12px] leading-snug text-[color:var(--text-tertiary)]">
                {chip.hint}
              </span>
            )}
          </button>
        ))}
      </ScrollRow>
    </div>
  );
}
