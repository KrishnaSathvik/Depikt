import type { SourceContextType } from "./job-request.ts";
import type { LivePollSnapshot } from "./live-poll.ts";
import { UUID_RE } from "./entities.ts";
import { raceWithTimeout } from "./timeout.ts";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const PREFIX = "depikt.generate.activeSessionId";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
function browserStore(): Store | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** Recovery belongs to the authenticated user and the workspace that submitted it. */
export function activeSessionStore(
  userId: string,
  source: SourceContextType,
  storage: Store | null = browserStore(),
) {
  const surface =
    source === "prompt_build" ? "build" : source === "prompt_critique" ? "critique" : "generate";
  const key = `${PREFIX}:${userId}:${surface}`;
  return {
    save(sessionId: string) {
      try {
        storage?.setItem(key, JSON.stringify({ sessionId, savedAt: Date.now() }));
      } catch {
        /* Recovery storage must not interrupt a submitted request. */
      }
    },
    read(): string | null {
      try {
        // Legacy unscoped ids cannot establish which user/mode authorized recovery.
        storage?.removeItem(PREFIX);
        const value = JSON.parse(storage?.getItem(key) ?? "null");
        if (
          !value ||
          !UUID_RE.test(value.sessionId) ||
          !Number.isFinite(value.savedAt) ||
          value.savedAt > Date.now() ||
          Date.now() - value.savedAt > MAX_AGE_MS
        ) {
          storage?.removeItem(key);
          return null;
        }
        return value.sessionId;
      } catch {
        return null;
      }
    },
    clear() {
      try {
        storage?.removeItem(key);
      } catch {
        /* Optional persistence. */
      }
    },
  };
}

/** Opening a workspace performs a bounded read, never a generation request. */
export async function readRestorableSession(
  sessionId: string,
  read: (id: string) => Promise<LivePollSnapshot>,
  timeoutMs = 10_000,
): Promise<LivePollSnapshot | null> {
  try {
    const snapshot = await raceWithTimeout<LivePollSnapshot | null>(
      read(sessionId),
      timeoutMs,
      null,
    );
    return snapshot?.jobs.length ? snapshot : null;
  } catch {
    return null;
  }
}
