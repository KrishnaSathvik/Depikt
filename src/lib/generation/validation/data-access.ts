import type { UntypedSupabaseClient } from "../db-types.ts";
import type { ValidationResult } from "./contract.ts";
export function validationDataAccess(db: UntypedSupabaseClient, jobId: string, userId: string) {
  return {
    async claimRepair(): Promise<boolean> {
      const { data, error } = await db.rpc("claim_generation_repair", { p_job_id: jobId });
      if (error) throw new Error("Could not reserve repair attempt");
      return data === true;
    },
    async save(result: ValidationResult, attempt: number): Promise<void> {
      const { data, error } = await db
        .from("generation_jobs")
        .update({
          validation_result: { ...result, repairAttempts: attempt },
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
