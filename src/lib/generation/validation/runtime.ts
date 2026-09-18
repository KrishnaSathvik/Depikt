import type { ValidationTelemetry } from "./openai-providers.ts";
import type { StoredImage } from "../openai-images.ts";
import type { ValidationPlan, ValidationResult } from "./contract.ts";
import { INCLUDED_REPAIR_POLICY } from "../economic-policy.ts";
import { validateResult, type ValidationContext } from "./engine.ts";
import { planRepair, repairIsBetter, type RepairPlan } from "./repair.ts";

export interface ValidationRuntime {
  plan: ValidationPlan;
  providerTelemetry?: ValidationTelemetry;
  context: Omit<ValidationContext, "image">;
  repairPolicy: "disabled" | typeof INCLUDED_REPAIR_POLICY;
  /** True while initial series outputs are collected; the server coordinator owns repairs. */
  refinementPending?: boolean;
  initialResult?: ValidationResult;
  claimRepair(): Promise<boolean>;
  save(result: ValidationResult, attempt: number): Promise<void>;
}
export interface ValidationOutcome<T> {
  output: T;
  result: ValidationResult;
  attempts: number;
  repairOutcome: "not_attempted" | "improved" | "not_improved" | "provider_failed";
  selected: "original" | "repair";
}
/** A generated image is never discarded because checking or its included repair failed. */
export async function validateAndRepair<T extends { image: StoredImage }>(
  initial: T,
  runtime: ValidationRuntime,
  repair: (plan: RepairPlan, result: ValidationResult, current: T) => Promise<T>,
): Promise<ValidationOutcome<T>> {
  let result: ValidationResult;
  try {
    result =
      runtime.initialResult ??
      (await validateResult(runtime.plan, { ...runtime.context, image: initial.image }));
  } catch {
    result = {
      verdict: "fail",
      checks: runtime.plan.checks.map((c) => ({
        ...c,
        status: "unavailable",
        confidence: 0,
        evidence: "Validation unavailable",
        method: "deterministic",
      })),
    };
  }
  const original: ValidationOutcome<T> = {
    output: initial,
    result,
    attempts: 0,
    repairOutcome: "not_attempted",
    selected: "original",
  };
  try {
    await runtime.save(result, 0);
  } catch {
    return original;
  }
  const plan = planRepair(result, {
    hasMask: !!runtime.context.mask,
    hasReferences: !!runtime.context.references.length,
  });
  if (result.verdict !== "repairable" || !plan || runtime.repairPolicy !== INCLUDED_REPAIR_POLICY)
    return original;
  try {
    if (!(await runtime.claimRepair())) return original;
  } catch {
    return original;
  }
  try {
    const output = await repair(plan, result, initial);
    const revalidated = await validateResult(runtime.plan, {
      ...runtime.context,
      image: output.image,
    });
    const better = repairIsBetter(result, revalidated);
    // Telemetry persistence failure must not lose either usable result.
    await runtime.save(revalidated, 1).catch(() => {});
    return {
      output: better ? output : initial,
      result: better ? revalidated : result,
      attempts: 1,
      repairOutcome: better ? "improved" : "not_improved",
      selected: better ? "repair" : "original",
    };
  } catch {
    return { ...original, attempts: 1, repairOutcome: "provider_failed" };
  }
}
