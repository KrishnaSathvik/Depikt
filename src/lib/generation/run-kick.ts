export interface RunKickEntry {
  attempts: number;
  nextStartAt: number;
}

export const RUN_KICK_BACKOFF_MS = 2_500;
export const RUN_KICK_MAX_MS = 30_000;

/** Shared across every mounted useGeneration hook so Build/Critique cannot queue extra /run requests behind Generate. */
export const runKicksInFlight = new Set<string>();
export const runKickState = new Map<string, RunKickEntry>();

export function runKickDelayMs(attempts: number): number {
  const exp = Math.max(0, attempts);
  const delay = RUN_KICK_BACKOFF_MS * 2 ** exp;
  return Math.min(delay, RUN_KICK_MAX_MS);
}

export function shouldStartQueuedJob(
  status: string,
  entry: RunKickEntry | undefined,
  inFlight: boolean,
  now: number,
): boolean {
  if (status !== "queued") return false;
  if (inFlight) return false;
  if (entry && now < entry.nextStartAt) return false;
  return true;
}

export function nextKickEntryAfterFailure(
  entry: RunKickEntry | undefined,
  now: number,
): RunKickEntry {
  const attempts = (entry?.attempts ?? 0) + 1;
  return { attempts, nextStartAt: now + runKickDelayMs(attempts - 1) };
}

export function jobsReadyToStart(
  jobs: Array<{ id: string; status: string }>,
  kicks: Map<string, RunKickEntry>,
  inFlight: Set<string>,
  now: number,
): string[] {
  return jobs
    .filter((job) => shouldStartQueuedJob(job.status, kicks.get(job.id), inFlight.has(job.id), now))
    .map((job) => job.id);
}
