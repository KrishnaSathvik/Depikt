import type { UntypedSupabaseClient } from "@/lib/generation/db-types";
import { CREDIT_CHARGE_BUDGET_MS, raceWithTimeout } from "./timeout.ts";
import { settleJobCredits } from "./settle-credits.ts";
import { isExecutionTokenError, transitionJob } from "./job-transition.ts";
import { generationMetric } from "./telemetry.ts";

export const STALE_MS = 6 * 60 * 1000;

export const STALE_ERROR_MESSAGE = "Generation timed out. Your credit was returned.";

export interface StaleJob {
  id: string;
  user_id: string;
  idempotency_key: string;
  status: string;
  created_at: string;
  error_code?: string | null;
  safe_error_message?: string | null;
}

export interface StaleJobResult {
  applied: boolean;
  status: string;
  safe_error_message: string | null;
}

export async function settleSucceededJobCredits(
  supabase: UntypedSupabaseClient,
  job: Pick<StaleJob, "id" | "user_id" | "idempotency_key" | "status">,
  timeoutMs: number = CREDIT_CHARGE_BUDGET_MS,
): Promise<void> {
  if (job.status !== "succeeded") return;

  await raceWithTimeout(
    (async () => {
      try {
        await settleJobCredits(supabase, job.id, "charged", {
          userId: job.user_id,
          amount: 1,
          idempotencyKey: job.idempotency_key,
        });
      } catch (error) {
        // Observable, not silent: the scheduled reaper reconciles what this misses.
        console.error("credits_settle_failed", job.id, "charged", error);
        generationMetric("credits_settle_failed", { jobId: job.id, outcome: "charged" });
      }
    })(),
    timeoutMs,
    undefined,
  );
}

export function applyStaleFailure(
  job: Pick<StaleJob, "status" | "created_at">,
  now: Date,
  staleMs: number,
): boolean {
  return (
    (job.status === "queued" || job.status === "running") &&
    now.getTime() - new Date(job.created_at).getTime() > staleMs
  );
}

export async function failAndRefundStaleJob(
  supabase: UntypedSupabaseClient,
  job: StaleJob,
  now = new Date(),
  /**
   * Resolves the job's execution token (Step 3). Only called when a stale
   * transition is actually attempted. Post-migration, a token-less failure
   * transition is denied; in that case this degrades to "not applied" and
   * the scheduled reaper (reap_stale_generation_jobs) settles the job
   * instead of the poll path.
   */
  resolveExecutionToken?: () => Promise<string | null>,
): Promise<StaleJobResult> {
  const refund = async (): Promise<void> => {
    try {
      await settleJobCredits(supabase, job.id, "refunded", {
        userId: job.user_id,
        amount: 1,
        idempotencyKey: job.idempotency_key,
      });
    } catch (error) {
      // Observable, not silent: the scheduled reaper reconciles what this misses.
      console.error("credits_settle_failed", job.id, "refunded", error);
      generationMetric("credits_settle_failed", { jobId: job.id, outcome: "refunded" });
    }
  };

  if (job.status === "failed" && job.error_code === "timed_out") {
    await refund();
    return {
      applied: false,
      status: job.status,
      safe_error_message: job.safe_error_message ?? STALE_ERROR_MESSAGE,
    };
  }

  if (!applyStaleFailure(job, now, STALE_MS)) {
    return {
      applied: false,
      status: job.status,
      safe_error_message: job.safe_error_message ?? null,
    };
  }

  let applied: boolean;
  try {
    const executionToken = resolveExecutionToken ? await resolveExecutionToken() : null;
    applied = await transitionJob(
      supabase,
      job.id,
      "failed",
      {
        errorCode: "timed_out",
        safeErrorMessage: STALE_ERROR_MESSAGE,
      },
      executionToken,
    );
  } catch (error) {
    if (!isExecutionTokenError(error)) throw error;
    // Token unavailable/invalid: leave the job for the scheduled reaper.
    generationMetric("stale_job_deferred_to_reaper", { jobId: job.id });
    return {
      applied: false,
      status: job.status,
      safe_error_message: job.safe_error_message ?? null,
    };
  }

  if (!applied) {
    const { data: liveJob, error: liveError } = await supabase
      .from("generation_jobs")
      .select("status, error_code, safe_error_message")
      .eq("id", job.id)
      .maybeSingle();

    if (liveError) throw liveError;

    if (liveJob?.status === "failed" && liveJob.error_code === "timed_out") {
      await refund();
    }

    return {
      applied: false,
      status: liveJob?.status ?? job.status,
      safe_error_message: liveJob?.safe_error_message ?? job.safe_error_message ?? null,
    };
  }

  await refund();

  return {
    applied: true,
    status: "failed",
    safe_error_message: STALE_ERROR_MESSAGE,
  };
}
