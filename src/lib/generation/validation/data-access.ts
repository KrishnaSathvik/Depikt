import type { UntypedSupabaseClient } from "../db-types.ts";
import type { ValidationResult } from "./contract.ts";
import { signAssessment } from "./assessment.ts";
export function validationDataAccess(
  db: UntypedSupabaseClient,
  jobId: string,
  userId: string,
  sessionId: string,
  secret: string,
) {
  return {
    // Initial jobs cannot independently spend a per-request repair budget.
    async claimRepair(): Promise<boolean> {
      return false;
    },
    async save(result: ValidationResult, attempt: number): Promise<void> {
      const snapshot = signAssessment(result, userId, sessionId, jobId, secret);
      const { data, error } = await db
        .from("generation_jobs")
        .update({
          validation_result: { snapshot, repairAttempts: attempt },
          usage_json: { validation: { ...result, repairAttempts: attempt } },
        })
        .eq("id", jobId)
        .eq("user_id", userId)
        .eq("status", "running")
        .select("id")
        .maybeSingle();
      if (error || !data) throw new Error("Could not save validation result");
    },
  };
}
