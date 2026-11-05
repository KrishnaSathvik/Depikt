// Job state changes go through transition_generation_job, which enforces
// valid transitions, field allowlists and ownership in the database. Direct
// UPDATEs on generation_jobs are revoked from signed-in users once the Step 2
// migration lands; until then the legacy fallback keeps the app working (and
// is denied afterwards, so it is never reached).

import type { UntypedSupabaseClient } from "./db-types.ts";

/** PostgREST "function not found" — the Step 2 migration is not applied yet. */
function isMissingFunction(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "PGRST202" || code === "42883";
}

export type JobTransition = "running" | "succeeded" | "failed" | "cancelled";

/** PostgREST "insufficient privilege" — execution token missing/wrong after the Step 3 migration. */
export function isExecutionTokenError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  return (
    e?.code === "42501" ||
    (typeof e?.message === "string" && e.message.includes("execution token"))
  );
}

export type ClaimOutcome = "claimed" | "already_running" | "terminal" | "not_found";

/**
 * Claim a queued job for execution via the Step 3 RPC. Returns null when
 * the RPC does not exist yet (pre-migration), so the caller can fall back
 * to the legacy conditional UPDATE.
 */
export async function claimJobForExecution(
  db: UntypedSupabaseClient,
  jobId: string,
  executionToken: string,
): Promise<ClaimOutcome | null> {
  const { data, error } = await db.rpc("claim_generation_job", {
    p_job_id: jobId,
    p_execution_token: executionToken,
  });
  if (error) {
    if (isMissingFunction(error)) return null;
    throw error;
  }
  return data as ClaimOutcome;
}

export interface SucceededPatch {
  usage: unknown;
  estimatedApiCostUsd: number | null;
  openaiRequestId?: string;
}

export interface FailedPatch {
  errorCode: string;
  safeErrorMessage: string;
}

function didUpdate<T>({ data, error }: { data: T | null; error: unknown }): boolean {
  if (error) throw error;
  return Boolean(data);
}

async function legacyTransition(
  db: UntypedSupabaseClient,
  jobId: string,
  to: JobTransition,
  patch: SucceededPatch | FailedPatch | Record<string, never>,
): Promise<boolean> {
  if (to === "running") {
    return didUpdate(
      await db
        .from("generation_jobs")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", jobId)
        .in("status", ["queued", "running"])
        .select("id")
        .maybeSingle(),
    );
  }
  if (to === "succeeded") {
    const p = patch as SucceededPatch;
    return didUpdate(
      await db
        .from("generation_jobs")
        .update({
          status: "succeeded",
          completed_at: new Date().toISOString(),
          usage_json: p.usage,
          estimated_api_cost_usd: p.estimatedApiCostUsd,
          openai_request_id: p.openaiRequestId ?? null,
        })
        .eq("id", jobId)
        .eq("status", "running")
        .select("id")
        .maybeSingle(),
    );
  }
  if (to === "failed") {
    const p = patch as FailedPatch;
    return didUpdate(
      await db
        .from("generation_jobs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_code: p.errorCode,
          safe_error_message: p.safeErrorMessage,
        })
        .eq("id", jobId)
        .in("status", ["queued", "running"])
        .select("id")
        .maybeSingle(),
    );
  }
  return didUpdate(
    await db
      .from("generation_jobs")
      .update({ status: "cancelled", completed_at: new Date().toISOString() })
      .eq("id", jobId)
      .in("status", ["queued", "running"])
      .select("id")
      .maybeSingle(),
  );
}

/**
 * Move a job to a new status. Returns true when the transition was applied
 * (or the job was already running, for re-entry safety). Throws on invalid
 * transitions and unexpected errors.
 *
 * `executionToken` is the per-job, database-minted secret the Step 3
 * migration requires for running/succeeded/failed transitions (cancellation
 * stays token-free). Pass null only on the legacy pre-migration path — once
 * the migration lands, token-less execution transitions are denied, which
 * is what stops a user from force-failing their own running job through
 * direct RPC access.
 */
export async function transitionJob(
  db: UntypedSupabaseClient,
  jobId: string,
  to: JobTransition,
  patch: SucceededPatch | FailedPatch | Record<string, never> = {},
  executionToken: string | null = null,
): Promise<boolean> {
  const rpcPatch =
    to === "succeeded"
      ? {
          usage_json: (patch as SucceededPatch).usage ?? null,
          estimated_api_cost_usd: (patch as SucceededPatch).estimatedApiCostUsd ?? null,
          openai_request_id: (patch as SucceededPatch).openaiRequestId ?? null,
        }
      : to === "failed"
        ? {
            error_code: (patch as FailedPatch).errorCode,
            safe_error_message: (patch as FailedPatch).safeErrorMessage,
          }
        : {};
  const { data, error } = await db.rpc("transition_generation_job", {
    p_job_id: jobId,
    p_to_status: to,
    p_patch: rpcPatch,
    p_execution_token: executionToken,
  });
  if (!error) return Boolean(data);
  if (!isMissingFunction(error)) throw error;
  return legacyTransition(db, jobId, to, patch);
}

/** Persist the validation snapshot for a running job. */
export async function saveJobValidation(
  db: UntypedSupabaseClient,
  jobId: string,
  userId: string,
  validationResult: unknown,
  usageValidation: unknown,
  executionToken: string | null = null,
): Promise<void> {
  const { data, error } = await db.rpc("save_generation_job_validation", {
    p_job_id: jobId,
    p_validation_result: validationResult,
    p_usage_validation: usageValidation,
    p_execution_token: executionToken,
  });
  if (!error) {
    if (!data) throw new Error("Could not save validation result");
    return;
  }
  if (!isMissingFunction(error)) throw error;
  const legacy = await db
    .from("generation_jobs")
    .update({
      validation_result: validationResult,
      usage_json: { validation: usageValidation },
    })
    .eq("id", jobId)
    .eq("user_id", userId)
    .eq("status", "running")
    .select("id")
    .maybeSingle();
  if (legacy.error || !legacy.data) throw new Error("Could not save validation result");
}
