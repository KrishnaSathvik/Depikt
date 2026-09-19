/** Frozen launch economics. Feature activation is a separate operational decision. */
export const LAUNCH_ECONOMIC_POLICY = Object.freeze({
  version: "launch-v1",
  creditsPerRequestedImage: 1,
  validationExtraCredits: 0,
  groundingExtraCredits: 0,
  automaticRepairExtraCredits: 0,
  maxAutomaticRepairsPerRequest: 1,
  minimumRepairConfidence: 0.9,
  maxWebQueries: 3,
  maxVisualQueries: 2,
  maxGroundingSources: 8,
});
export const MAX_AUTO_REPAIR_ATTEMPTS_PER_REQUEST = 1;
export const INCLUDED_REPAIR_POLICY = "platform_absorbs_one_per_request";
export function automaticRepairEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return (
    env.VALIDATION_REPAIR_ENABLED === "true" && env.AUTO_REPAIR_POLICY === INCLUDED_REPAIR_POLICY
  );
}
