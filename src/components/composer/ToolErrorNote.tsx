import { AlertCircle, RotateCcw } from "lucide-react";

/**
 * Inline failure note directly under a creator composer — where the person is
 * looking — instead of a transient toast in a corner. Announced politely to
 * assistive tech; "Try again" re-runs the same request.
 */
export function ToolErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--error)]/25 bg-[color:var(--error)]/[0.05] px-4 py-3 text-body-sm text-[color:var(--text-primary)]"
    >
      <AlertCircle className="h-4 w-4 shrink-0 text-[color:var(--error)]" aria-hidden />
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-4 text-[13px] font-medium transition-colors hover:border-[color:var(--border-strong)] sm:min-h-9"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Try again
        </button>
      )}
    </div>
  );
}
