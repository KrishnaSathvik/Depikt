// The build/client flag enables the UI. Server runtime false always overrides
// an enabled build, so operations can be stopped without rebuilding. Runtime
// true or unset defers to build configuration. Missing flags default off.
export function isNativeGenerationEnabled(explicitValue?: string): boolean {
  // Runtime shutdown must win even when Vite baked an enabled client flag
  // into the server artifact. Runtime true does not override a disabled build.
  const runtime = typeof process !== "undefined" ? process.env.GENERATION_ENABLED : undefined;
  if (runtime === "false") return false;
  const fromVite = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_GENERATION_ENABLED;
  return (explicitValue ?? fromVite ?? runtime) === "true";
}

/** V4 grounding. Server env only; missing or any value other than "true" is off. */
export function isGroundingEnabled(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): boolean {
  return env.GROUNDING_ENABLED === "true";
}

/** V5 validation + automatic refinement. Server env only; defaults off. */
export function isValidationRepairEnabled(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): boolean {
  return env.VALIDATION_REPAIR_ENABLED === "true";
}
