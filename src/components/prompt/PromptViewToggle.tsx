import { Code2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export type PromptViewMode = "text" | "json";

/**
 * Shared Text/JSON (or Report/JSON) toggle used on Build prompt surfaces and
 * Critique reports — same chrome, different labels via `textLabel`.
 */
export function PromptViewToggle({
  value,
  onChange,
  ariaLabel,
  textLabel = "Text",
}: {
  value: PromptViewMode;
  onChange: (next: PromptViewMode) => void;
  ariaLabel: string;
  textLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex items-center gap-0.5 rounded-md bg-[color:var(--bg-subtle)] p-0.5"
    >
      {(["text", "json"] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded px-2 text-[12px] font-medium transition-colors",
            value === v
              ? "bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] shadow-sm-card"
              : "text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]",
          )}
        >
          {v === "text" ? <FileText className="h-3 w-3" /> : <Code2 className="h-3 w-3" />}
          {v === "text" ? textLabel : "JSON"}
        </button>
      ))}
    </div>
  );
}
