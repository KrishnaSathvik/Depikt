import { ChevronRight } from "lucide-react";

/** Collapsed brief after Build / Critique submit — click to expand and edit. */
export function CollapsedInput({
  label,
  text,
  onExpand,
}: {
  label: string;
  text: string;
  onExpand: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="group w-full rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3 text-left transition-colors hover:border-[color:var(--border-strong)]"
    >
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-[13px] font-medium text-[color:var(--text-tertiary)]">
          {label}
        </span>
        <span className="flex-1 truncate text-body-sm text-[color:var(--text-secondary)]">
          {text}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)] transition-colors group-hover:text-[color:var(--text-primary)]" />
      </div>
    </button>
  );
}
