import type { UntypedSupabaseClient } from "@/lib/generation/db-types";

export const STALE_MS = 6 * 60 * 1000;

export const STALE_ERROR_MESSAGE = "Generation timed out. Your credit was returned.";

export interface StaleJob {
  id: string;
  user_id: string;
  idempotency_key: string;
  status: string;
  created_at: string;
}

export interface StaleJobResult {
  applied: boolean;
  status: string;
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
  if (!applyStaleFailure(job, now, STALE_MS)) {
    return { applied: false, status: job.status };
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
    return { applied: false, status: job.status };
  }

  if (!data) {
    const { data: liveJob, error: liveError } = await supabase
      .from("generation_jobs")
      .select("status")
      .eq("id", job.id)
      .maybeSingle();

    return {
      applied: false,
      status: liveError || !liveJob ? job.status : liveJob.status,
    };
  }

  await supabase
    .rpc("finalize_generation_credits", {
      p_user_id: job.user_id,
      p_amount: 1,
      p_idempotency_key: job.idempotency_key,
      p_outcome: "refunded",
      p_job_id: job.id,
    })
    .then(
      () => undefined,
      () => undefined,
    );

  return { applied: true, status: "failed" };
}
