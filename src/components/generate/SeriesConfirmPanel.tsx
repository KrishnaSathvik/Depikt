import { Button } from "@/components/ui/button";
import { CTA } from "@/lib/product";
import type { useGeneration } from "@/lib/generation/use-generation";

/**
 * Shown when useGeneration's phase is "confirm" — a plan came back with
 * requiresCountConfirmation (a series bigger than the auto cap) and no job
 * or credit reservation exists yet. Reused by GenerateWorkspace, BuildMode,
 * and CritiqueMode (any of the three can submit a request that decomposes
 * into a big series), right alongside GenerationCreditGate.
 */
export function SeriesConfirmPanel({
  gen,
  className,
}: {
  gen: ReturnType<typeof useGeneration>;
  className?: string;
}) {
  if (gen.phase !== "confirm" || !gen.planPreview) return null;
  const plan = gen.planPreview;
  // Never offer a batch the user can't afford — an unknown balance (still
  // loading) is not treated as insufficient; the server is authoritative.
  const canOfferAll = gen.credits === null || gen.credits >= plan.desiredCount;

  return (
    <div className={className}>
      <p className="text-body-md">{CTA.seriesConfirmTitle(plan.desiredCount)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => gen.confirmSeriesCount(plan.autoCount)} className="gap-2">
          {CTA.seriesConfirmAuto(plan.autoCount)} · {plan.creditCostAuto} credits
        </Button>
        {canOfferAll && plan.desiredCount !== plan.autoCount && (
          <Button
            variant="outline"
            onClick={() => gen.confirmSeriesCount(plan.desiredCount)}
            className="gap-2"
          >
            {CTA.seriesConfirmAll(plan.desiredCount)} · {plan.creditCostAll} credits
          </Button>
        )}
      </div>
    </div>
  );
}
