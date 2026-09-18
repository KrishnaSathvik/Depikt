import { UUID_RE, MAX_ATTACHED_ENTITIES } from "./entities.ts";
import type { SubmitInput } from "./use-generation.ts";
type SessionStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const KEY = "depikt.generate.entityResume";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
interface EntityResume {
  userId: string;
  sessionId: string;
  input: SubmitInput;
  referenceAssetIds: string[];
  savedAt: number;
}
const defaultStore = () => {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
};
export function saveEntityResume(
  userId: string,
  sessionId: string,
  input: SubmitInput,
  referenceAssetIds: string[],
  storage: SessionStore | null = defaultStore(),
) {
  try {
    if (!input.entityIds?.length) {
      storage?.removeItem(KEY);
      return;
    }
    storage?.setItem(
      KEY,
      JSON.stringify({
        userId,
        sessionId,
        input: { ...input, idempotencyKey: undefined },
        referenceAssetIds,
        savedAt: Date.now(),
      }),
    );
  } catch {
    /* Restricted storage must not interrupt a submitted job. */
  }
}
export function readEntityResume(
  userId: string,
  storage: SessionStore | null = defaultStore(),
): EntityResume | null {
  try {
    const value = JSON.parse(storage?.getItem(KEY) ?? "null") as EntityResume | null;
    if (
      !value ||
      value.userId !== userId ||
      !UUID_RE.test(value.sessionId) ||
      !Number.isFinite(value.savedAt) ||
      Date.now() - value.savedAt > MAX_AGE_MS ||
      !value.input ||
      typeof value.input.prompt !== "string" ||
      !Array.isArray(value.input.entityIds) ||
      !value.input.entityIds.length ||
      value.input.entityIds.length > MAX_ATTACHED_ENTITIES ||
      value.input.entityIds.some((id) => typeof id !== "string" || !UUID_RE.test(id)) ||
      !Array.isArray(value.referenceAssetIds) ||
      value.referenceAssetIds.some((path) => typeof path !== "string")
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
export function clearEntityResume(storage: SessionStore | null = defaultStore()) {
  try {
    storage?.removeItem(KEY);
  } catch {
    /* optional persistence */
  }
}
