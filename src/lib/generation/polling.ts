// Native image generation — polling schedule. Pure, no imports, so it's
// testable without pulling in the browser Supabase client (client.ts does).

/** Pure so the backoff schedule is unit-testable without timers or React. */
export function nextPollDelayMs(elapsedMs: number): number {
  return elapsedMs < 20_000 ? 2_500 : 5_000;
}

const TERMINAL_STATUSES = new Set(["succeeded", "failed", "cancelled"]);

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}
