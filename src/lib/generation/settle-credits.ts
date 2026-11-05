import type { UntypedSupabaseClient } from "./db-types.ts";

export type SettleOutcome = "charged" | "refunded";

export interface SettleLegacyArgs {
  userId: string;
  amount: number;
  idempotencyKey: string;
}

/** PostgREST "function not found" — the lock-down migration is not applied yet. */
function isMissingFunction(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "PGRST202" || code === "42883";
}

/**
 * Settle one job's reservation through settle_generation_job, which reads
 * owner, amount and key from the job row and allows exactly one outcome.
 *
 * Until the lock-down migration is applied, falls back to the old
 * finalize_generation_credits call so generation keeps working; once the
 * migration lands, that fallback is never reached (and would be denied).
 */
export async function settleJobCredits(
  db: UntypedSupabaseClient,
  jobId: string,
  outcome: SettleOutcome,
  legacy: SettleLegacyArgs,
): Promise<{ availableCredits: number }> {
  const settled = await db.rpc("settle_generation_job", { p_job_id: jobId, p_outcome: outcome });
  if (!settled.error) {
    const row = Array.isArray(settled.data) ? settled.data[0] : settled.data;
    return { availableCredits: (row?.available_credits as number) ?? 0 };
  }
  if (!isMissingFunction(settled.error)) throw settled.error;

  const { data, error } = await db.rpc("finalize_generation_credits", {
    p_user_id: legacy.userId,
    p_amount: legacy.amount,
    p_idempotency_key: legacy.idempotencyKey,
    p_outcome: outcome,
    p_job_id: jobId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { availableCredits: (row?.available_credits as number) ?? 0 };
}
