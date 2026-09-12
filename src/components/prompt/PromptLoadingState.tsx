import { Loader2 } from "lucide-react";
import { INTENT_STAGE_LABELS, describeIntent } from "@/lib/product";

/**
 * Shared loading card for Build and Critique stacked output. Same shell +
 * skeleton bars; stage copy differs by mode. Generate uses ThinkingField
 * on the canvas instead.
 */
export function PromptLoadingState({
  variant,
  intent,
}: {
  variant: "build" | "critique";
  intent?: Record<string, unknown> | null;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] p-6"
    >
      <div className="flex items-start gap-2.5 text-mono-sm text-[color:var(--text-secondary)]">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
        {variant === "build" ? <BuildStages intent={intent} /> : <CritiqueStages />}
      </div>
      <div className="mt-6 space-y-2.5">
        <div className="h-2 animate-pulse rounded-sm bg-[color:var(--border-default)]" />
        <div className="h-2 animate-pulse rounded-sm bg-[color:var(--border-default)]" />
        <div className="h-2 w-4/5 animate-pulse rounded-sm bg-[color:var(--border-default)]" />
        <div className="h-2 w-3/4 animate-pulse rounded-sm bg-[color:var(--border-default)]" />
      </div>
    </div>
  );
}

function BuildStages({ intent }: { intent?: Record<string, unknown> | null }) {
  const facts = describeIntent(intent);
  const understood = facts.length > 0;
  if (!understood) {
    return <span>{INTENT_STAGE_LABELS.understanding}</span>;
  }
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <span className="text-[color:var(--text-tertiary)]">{INTENT_STAGE_LABELS.understood}</span>
        <span className="text-[color:var(--text-primary)]">{facts.join(" · ")}</span>
      </div>
      <div>{INTENT_STAGE_LABELS.building}</div>
    </div>
  );
}

function CritiqueStages() {
  return (
    <div className="min-w-0 space-y-1.5">
      <div>Reading your prompt…</div>
      <div className="text-[color:var(--text-tertiary)]">Scoring against the rubric…</div>
      <div className="text-[color:var(--text-tertiary)]">Drafting a rewrite…</div>
    </div>
  );
}
