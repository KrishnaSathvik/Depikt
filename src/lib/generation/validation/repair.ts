import type { ValidationResult } from "./contract.ts";
export type RepairAction =
  | "retry_generation"
  | "stronger_reference_fidelity"
  | "retry_masked_edit"
  | "remove_unwanted_text"
  | "rerender_exact_text";
export interface RepairPlan {
  action: RepairAction;
  problems: Array<{ checkId: string; problem: string; target: string }>;
}
export function planRepair(
  result: ValidationResult,
  context: { hasMask: boolean; hasReferences: boolean },
): RepairPlan | null {
  const failed = result.checks.filter((c) => c.status !== "pass");
  if (
    !failed.length ||
    failed.some(
      (c) => c.status === "unavailable" || ["series_count", "missing_entity"].includes(c.kind),
    )
  )
    return null;
  if (
    failed.some((c) =>
      ["character_identity", "product_identity", "brand_identity"].includes(c.kind),
    ) &&
    !context.hasReferences
  )
    return null;
  if (failed.some((c) => c.kind === "edit_preservation") && !context.hasMask) return null;
  const action: RepairAction = context.hasMask
    ? "retry_masked_edit"
    : failed.some((c) =>
          ["character_identity", "product_identity", "brand_identity"].includes(c.kind),
        )
      ? "stronger_reference_fidelity"
      : failed.some((c) => c.kind === "exact_text")
        ? "rerender_exact_text"
        : failed.some((c) => c.kind === "unwanted_text")
          ? "remove_unwanted_text"
          : "retry_generation";
  return {
    action,
    problems: failed.map((c) => ({ checkId: c.id, problem: c.kind, target: c.target })),
  };
}
export function repairInstruction(plan: RepairPlan, result: ValidationResult): string {
  const text = result.checks
    .filter((c) => c.kind === "exact_text")
    .flatMap((c) => c.expectedText ?? []);
  const instructions: Record<RepairAction, string> = {
    retry_generation: "Retry the original request, strictly satisfying every listed requirement.",
    stronger_reference_fidelity:
      "Match the attached identity references closely. Preserve distinguishing geometry, face, packaging and marks.",
    retry_masked_edit:
      "Retry using the original source and original mask. Modify only transparent pixels. Preserve every opaque pixel.",
    remove_unwanted_text:
      "Remove unwanted lettering while preserving all requested content and composition.",
    rerender_exact_text:
      "Correct the requested lettering exactly while preserving composition and other content.",
  };
  return `${instructions[plan.action]}\nRequirements to correct: ${JSON.stringify(plan.problems)}${text.length ? `\nExact text: ${JSON.stringify(text)}` : ""}`;
}
