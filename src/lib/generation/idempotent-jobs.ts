// Native image generation — idempotent replay of POST /api/generation/jobs.
//
// create_generation_job(s) already replay-safe *at the RPC layer*: calling
// either RPC twice with the same idempotency key/prefix returns the
// existing job(s) rather than double-reserving credits. But by the time
// either RPC runs, jobs.ts had already unconditionally inserted a brand
// new generation_sessions row for this request -- so a retried/double
// submitted create-jobs call still leaves an orphaned session behind, and
// the response's sessionId doesn't even match the job's real session. This
// module is the lookup that lets the route return the existing session +
// jobs and skip the insert (and the session, RPC, and decomposeSeries call
// that follow it) entirely on replay. See jobs.ts.

export interface ExistingJobRow {
  id: string;
  session_id: string;
  idempotency_key: string;
  status: string;
  series_index: number | null;
  series_label: string | null;
}

export interface ExistingJobsResult {
  sessionId: string;
  jobs: Array<{ id: string; label: string | null; index: number | null; status: string }>;
}

export type ExistingSessionDecision =
  | { kind: "replay"; result: ExistingJobsResult }
  | { kind: "reuse" }
  | { kind: "invalid" };

/**
 * Exact keys assigned by create_generation_job(s). Keeping this as a list
 * avoids treating user-controlled `%` and `_` characters as LIKE wildcards.
 */
export function generationJobIdempotencyKeys(
  idempotencyKey: string,
  isSeries: boolean,
  selectedCount: number,
): string[] {
  if (!isSeries) return [idempotencyKey];
  return Array.from({ length: selectedCount }, (_, index) => `${idempotencyKey}:${index + 1}`);
}

/** Same `{ sessionId, jobs }` shape a fresh create returns, from a complete exact replay. */
export function toExistingJobsResult(
  rows: ExistingJobRow[],
  expectedIdempotencyKeys: string[],
): ExistingJobsResult | null {
  if (rows.length !== expectedIdempotencyKeys.length || rows.length === 0) return null;

  const expectedKeys = new Set(expectedIdempotencyKeys);
  const actualKeys = new Set(rows.map((row) => row.idempotency_key));
  if (
    actualKeys.size !== expectedKeys.size ||
    [...expectedKeys].some((key) => !actualKeys.has(key))
  ) {
    return null;
  }

  const sessionId = rows[0]!.session_id;
  if (rows.some((row) => row.session_id !== sessionId)) return null;

  const sorted = [...rows].sort((a, b) => (a.series_index ?? -1) - (b.series_index ?? -1));
  return {
    sessionId,
    jobs: sorted.map((r) => ({
      id: r.id,
      label: r.series_label,
      index: r.series_index,
      status: r.status,
    })),
  };
}

/**
 * Decide what a retry may do with the session that owns its unique create key.
 * An empty leftover is safe to reuse; a partial or unexpected job set must
 * never be spliced into a new request.
 */
export function decideExistingSession(
  rows: ExistingJobRow[],
  expectedIdempotencyKeys: string[],
): ExistingSessionDecision {
  if (rows.length === 0) return { kind: "reuse" };

  const result = toExistingJobsResult(rows, expectedIdempotencyKeys);
  return result ? { kind: "replay", result } : { kind: "invalid" };
}
