import type { ValidationTelemetry } from "./openai-providers.ts";
import type { StoredImage } from "../openai-images.ts";
import type { ValidationPlan, ValidationResult } from "./contract.ts";
import { MAX_AUTO_REPAIR_ATTEMPTS } from "./contract.ts";
import { validateResult, type ValidationContext } from "./engine.ts";
import { planRepair, type RepairPlan } from "./repair.ts";

export class ValidationFailure extends Error {
  readonly code: string;
  constructor(result: ValidationResult) {
    super("The image did not satisfy the required checks.");
    this.code = result.checks.some((c) => c.status === "unavailable")
      ? "validation_unavailable"
      : "validation_failed";
  }
}
export interface ValidationRuntime {
  plan: ValidationPlan;
  providerTelemetry?: ValidationTelemetry;
  context: Omit<ValidationContext, "image">;
  /** No policy is configured by default. No extra user credit is ever reserved. */
  repairPolicy: "disabled" | "platform_absorbs_one";
  claimRepair(): Promise<boolean>;
  save(result: ValidationResult, attempt: number): Promise<void>;
}
/** At most one retry; a failed or uncertain revalidation terminates the job. */
export async function validateAndRepair<T extends { image: StoredImage }>(
  initial: T,
  runtime: ValidationRuntime,
  repair: (plan: RepairPlan, result: ValidationResult, current: T) => Promise<T>,
): Promise<{ output: T; result: ValidationResult; attempts: number }> {
  let output = initial;
  let result = await validateResult(runtime.plan, { ...runtime.context, image: output.image });
  await runtime.save(result, 0);
  if (result.verdict === "pass") return { output, result, attempts: 0 };
  const plan = planRepair(result, {
    hasMask: !!runtime.context.mask,
    hasReferences: !!runtime.context.references.length,
  });
  if (
    !plan ||
    runtime.repairPolicy !== "platform_absorbs_one" ||
    MAX_AUTO_REPAIR_ATTEMPTS !== 1 ||
    !(await runtime.claimRepair())
  )
    throw new ValidationFailure(result);
  output = await repair(plan, result, output);
  result = await validateResult(runtime.plan, { ...runtime.context, image: output.image });
  await runtime.save(result, 1);
  if (result.verdict !== "pass") throw new ValidationFailure(result);
  return { output, result, attempts: 1 };
}
