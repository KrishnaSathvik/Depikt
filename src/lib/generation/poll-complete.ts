import { isTerminalStatus } from "./polling.ts";

export function jobHasUsableResultUrl(job: {
  status: string;
  result?: { url: string | null } | null;
}): boolean {
  return typeof job.result?.url === "string" && job.result.url.length > 0;
}

/** All children are terminal, but at least one success still has no signed URL. */
export function sessionAwaitingResultUrl(
  jobs: Array<{ status: string; result?: { url: string | null } | null }>,
): boolean {
  if (jobs.length === 0) return false;
  if (jobs.some((job) => !isTerminalStatus(job.status))) return false;
  return jobs.some((job) => job.status === "succeeded" && !jobHasUsableResultUrl(job));
}

/** Brief window after session create when jobs may not be visible yet. */
export const EMPTY_SESSION_POLL_GRACE_MS = 10_000;

/**
 * Keep the active session and poller while work is in flight *or* a
 * succeeded job is still waiting on a signed URL. Clearing on terminal
 * status alone strands a paid success on "Loading image…".
 *
 * An empty job list is not "poll forever": a missing session stops, and a
 * just-created session only waits through a short grace period.
 */
export function shouldKeepPollingSession(
  jobs: Array<{ status: string; result?: { url: string | null } | null }>,
  options?: { elapsedMs?: number },
): boolean {
  if (jobs.length === 0) {
    const elapsedMs = options?.elapsedMs;
    if (elapsedMs === undefined) return false;
    return elapsedMs < EMPTY_SESSION_POLL_GRACE_MS;
  }
  if (jobs.some((job) => !isTerminalStatus(job.status))) return true;
  return sessionAwaitingResultUrl(jobs);
}
