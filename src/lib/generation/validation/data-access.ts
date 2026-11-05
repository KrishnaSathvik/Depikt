import type { UntypedSupabaseClient } from "../db-types.ts";
import type { ValidationResult } from "./contract.ts";
import { signAssessment } from "./assessment.ts";
import { saveJobValidation } from "../job-transition.ts";
export function validationDataAccess(
  db: UntypedSupabaseClient,
  jobId: string,
  userId: string,
  sessionId: string,
  secret: string,
  executionToken: string | null = null,
) {
  return {
    // Initial jobs cannot independently spend a per-request repair budget.
    async claimRepair(): Promise<boolean> {
      return false;
    },
    async save(result: ValidationResult, attempt: number): Promise<void> {
      const snapshot = signAssessment(result, userId, sessionId, jobId, secret);
      await saveJobValidation(
        db,
        jobId,
        userId,
        { snapshot, repairAttempts: attempt },
        { ...result, repairAttempts: attempt },
        executionToken,
      );
    },
  };
}
