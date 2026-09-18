import { LAUNCH_ECONOMIC_POLICY } from "../economic-policy.ts";
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
      (c) =>
        c.status === "unavailable" ||
        (c.confidence ?? (c.method === "deterministic" ? 1 : 0)) <
          LAUNCH_ECONOMIC_POLICY.minimumRepairConfidence ||
        ["series_count", "missing_entity"].includes(c.kind),
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

/** Lexicographic hard-failure rank. No aesthetic check can spend the budget. */
const PRIORITY: Record<string, number> = {
  character_identity: 0,
  product_identity: 0,
  brand_identity: 0,
  entity_distinction: 0,
  exact_text: 1,
  unwanted_text: 1,
  edit_preservation: 2,
  requested_edit: 2,
  object_count: 3,
  missing_entity: 3,
  grounding_consistency: 4,
  composition: 5,
  strict_preservation: 5,
  dimensions: 5,
};
export function failureScore(result: ValidationResult): number[] {
  const score = Array<number>(6).fill(0);
  for (const c of result.checks)
    if (c.status !== "pass") score[PRIORITY[c.kind] ?? 5] += c.status === "unavailable" ? 2 : 1;
  return score;
}
export function repairIsBetter(original: ValidationResult, repaired: ValidationResult): boolean {
  if (
    repaired.checks.some(
      (c) => c.status === "unavailable" || (c.kind === "dimensions" && c.status !== "pass"),
    )
  )
    return false;
  const a = failureScore(original),
    b = failureScore(repaired);
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return b[i] < a[i];
  return false;
}
export interface RepairCandidate {
  jobId: string;
  result: ValidationResult;
  hasMask: boolean;
  hasReferences: boolean;
}
export function selectRepairCandidate(candidates: RepairCandidate[]): RepairCandidate | null {
  const eligible = candidates.filter(
    (c) => c.result.verdict === "repairable" && planRepair(c.result, c),
  );
  const confidence = (c: RepairCandidate) =>
    Math.min(...c.result.checks.filter((k) => k.status === "fail").map((k) => k.confidence ?? 1));
  eligible.sort((a, b) => {
    const sa = failureScore(a.result),
      sb = failureScore(b.result);
    for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sb[i] - sa[i];
    return confidence(b) - confidence(a) || a.jobId.localeCompare(b.jobId);
  });
  return eligible[0] ?? null;
}
