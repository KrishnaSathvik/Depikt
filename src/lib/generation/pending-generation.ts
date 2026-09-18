// Native image generation — pending-submission persistence across the OAuth
// sign-in round trip.
//
// This is a different concern from handoff.ts: handoff.ts carries a *pre-fill*
// (Library/Gallery/Prompt handed the composer a prompt/reference to show,
// nothing has been submitted yet). This module carries an *already-submitted
// intent* — the user already pressed Generate/Generate image/Generate
// rewrite while signed out. A real OAuth round trip (lovable.auth.signInWithOAuth)
// can hard-navigate and remount the page, so holding that intent only in a
// React ref (as earlier code did) loses it silently: the user returns
// authenticated to a page that has forgotten they ever pressed Generate.
//
// sessionStorage, tab-scoped and short-lived like the other generation
// persistence keys (see use-generation.ts's ACTIVE_SESSION_KEY).

import type { SourceContextType } from "./job-request";
import type { RoutingHints } from "./model-router";
import type { Intent } from "../prompt-engine/intent";

export interface PendingGeneration {
  entityIds?: string[];
  prompt: string;
  /** Original Build/Critique request. Series planning must use this, not `prompt`. */
  userInput?: string | null;
  intent?: Intent | null;
  /** Raw reference data URLs — re-uploaded on resume, since an unauthenticated
   * upload attempt 401s and a hard navigation may not have kept the in-memory
   * ReferenceEntry state that a retry would otherwise patch. */
  referenceDataUrls: string[];
  structuredAspectRatio: string | null;
  routingHints: RoutingHints | null;
  sourceContext: { type: SourceContextType; id?: string | null };
  sourceVersionId: string | null;
  /** Generated before auth started and reused verbatim on resume, so a
   * duplicate resume (e.g. an effect re-running) can't double-charge —
   * the backend's idempotency dedup is the final backstop. */
  idempotencyKey: string;
}

const KEY = "depikt:pending-generation";

const DIRECT_HANDOFF_SOURCES: readonly SourceContextType[] = ["library", "gallery", "template"];

/** Whether this mounted generation surface owns resuming a persisted OAuth submission. */
export function pendingGenerationMatchesSource(
  hookType: SourceContextType,
  pendingType: SourceContextType,
): boolean {
  return (
    hookType === pendingType ||
    (hookType === "direct" && DIRECT_HANDOFF_SOURCES.includes(pendingType))
  );
}

export function savePendingGeneration(p: PendingGeneration): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // private mode/quota: resume just won't work, the visible "Try again" path still does
  }
}

/** Read without clearing — callers must call clearPendingGeneration() themselves,
 * exactly once, right before they start actually resuming the submission. */
export function readPendingGeneration(): PendingGeneration | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingGeneration;
  } catch {
    return null;
  }
}

export function clearPendingGeneration(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // see savePendingGeneration
  }
}
