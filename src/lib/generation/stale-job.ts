import type { UntypedSupabaseClient } from "@/lib/generation/db-types";

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
): Promise<void> {
  if (job.status !== "succeeded") return;

  try {
    const { error } = await supabase.rpc("finalize_generation_credits", {
      p_user_id: job.user_id,
      p_amount: 1,
      p_idempotency_key: job.idempotency_key,
      p_outcome: "charged",
      p_job_id: job.id,
    });
    if (error) return;
  } catch {
    return;
  }
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
): Promise<StaleJobResult> {
  const refund = async (): Promise<void> => {
    try {
      const { error } = await supabase.rpc("finalize_generation_credits", {
        p_user_id: job.user_id,
        p_amount: 1,
        p_idempotency_key: job.idempotency_key,
        p_outcome: "refunded",
        p_job_id: job.id,
      });
      if (error) return;
    } catch {
      return;
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

  const { data, error } = await supabase
    .from("generation_jobs")
    .update({
      status: "failed",
      completed_at: now.toISOString(),
      error_code: "timed_out",
      safe_error_message: STALE_ERROR_MESSAGE,
    })
    .eq("id", job.id)
    .in("status", ["queued", "running"])
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
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
