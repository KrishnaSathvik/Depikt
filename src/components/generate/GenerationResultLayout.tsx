import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Generate's working view. The image owns a large stage; the prompt, status,
 * references and versions sit in a side panel on desktop (below it on
 * phones). Series grids and the edit form need the full width, so they
 * stack instead — and while editing, the form leads so the mask is in reach.
 */
export function GenerationResultLayout({
  stage,
  details,
  stacked = false,
  detailsFirst = false,
}: {
  stage: ReactNode;
  details: ReactNode;
  /** Full-width stack (series grid, edit mode). */
  stacked?: boolean;
  detailsFirst?: boolean;
}) {
  const stageBox = (
    <div className="flex min-h-[320px] items-center justify-center sm:min-h-[520px]">
      <div className="w-full min-w-0">{stage}</div>
    </div>
  );
  const panel = (
    <aside
      aria-label="Image details"
      className={cn(
        "min-w-0 border-t border-border pt-4 sm:pt-5 lg:border-t-0",
        !stacked && "lg:sticky lg:top-16",
      )}
    >
      {details}
    </aside>
  );
  if (stacked) {
    return (
      <div className="space-y-6">
        {detailsFirst ? panel : stageBox}
        {detailsFirst ? stageBox : panel}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      {stageBox}
      {panel}
    </div>
  );
}
