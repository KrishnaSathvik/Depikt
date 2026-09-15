/** Resolve `work` or `fallback` if it has not settled within `timeoutMs`. */
export async function raceWithTimeout<T>(
  work: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Charge-after-success is retried by poll. Do not hold /run or poll GET on it. */
export const CREDIT_CHARGE_BUDGET_MS = 2_000;
