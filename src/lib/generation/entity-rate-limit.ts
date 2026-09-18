// Authenticated pack management has no model calls. Keep its budget separate
// from billable generation and allow multi-view upload/edit workflows.
const WINDOW = 60_000;
const LIMIT = 60;
export function createEntityRateLimiter() {
  const users = new Map<string, number[]>();
  return (userId: string, now = Date.now()): boolean => {
    const hits = (users.get(userId) ?? []).filter((at) => now - at < WINDOW);
    if (hits.length >= LIMIT) return true;
    hits.push(now);
    users.set(userId, hits);
    if (users.size > 5000) {
      for (const [id, times] of users) {
        if (now - times[times.length - 1] >= WINDOW) users.delete(id);
      }
    }
    return false;
  };
}
export const entityRateLimitExceeded = createEntityRateLimiter();
