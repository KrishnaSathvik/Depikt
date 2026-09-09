import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PromptSurfaceProps {
  /** Small label in the header, e.g. "Your prompt", "Before", "Rewritten prompt". */
  label?: ReactNode;
  /** Right-aligned header controls (Copy, view toggle). */
  actions?: ReactNode;
  /** Prompt text, or custom children. */
  children: ReactNode;
  /** Render the body in the mono face (default) or the sans face. */
  mono?: boolean;
  className?: string;
  bodyClassName?: string;
}

/**
 * The one visual treatment for a prompt: a light, bordered reading surface.
 * Used by the homepage example, the Builder output, the Critic's rewritten
 * prompt, the Library detail dialog, templates, and blog examples.
 *
 * White is the canvas, black is the ink: prompts are content to read, not
 * terminal output, so this surface is never dark.
 */
export function PromptSurface({
  label,
  actions,
  children,
  mono = true,
  className,
  bodyClassName,
}: PromptSurfaceProps) {
  const hasHeader = label !== undefined || actions !== undefined;
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)]",
        className,
      )}
    >
      {hasHeader && (
        <div className="flex min-h-[44px] items-center justify-between gap-4 border-b border-[color:var(--border-subtle)] px-5 py-2.5">
          <span className="label-mono">{label}</span>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
      )}
      <div
        className={cn(
          "whitespace-pre-wrap break-words px-5 py-5 text-[15px] leading-[1.75] text-[color:var(--text-primary)] sm:px-6",
          mono ? "font-mono text-[14px]" : "font-sans",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
