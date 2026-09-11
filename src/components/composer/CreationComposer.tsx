import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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

export function ComposerChips({
  label = "Try:",
  chips,
  onSelect,
  className,
}: {
  label?: string;
  chips: ReadonlyArray<{ label: string; text: string }>;
  onSelect: (text: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="mr-1 text-mono-sm text-[color:var(--text-tertiary)]">{label}</span>
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => onSelect(chip.text)}
          className="pill normal-case tracking-normal text-[12px] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
