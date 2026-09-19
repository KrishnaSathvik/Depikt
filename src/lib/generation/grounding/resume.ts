import type { TemporalSupport } from "./temporal.ts";
import type { SubmitInput } from "../use-generation.ts";
import { isPublicHttpsUrl } from "./contract.ts";
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const key = "depikt.grounding.resume.v1";
export interface GroundingSummary {
  temporalSupport?: TemporalSupport;
  sources: Array<{ id: string; url: string; title: string }>;
  createdAt: string;
}
interface Resume {
  userId: string;
  sessionId: string;
  input: SubmitInput;
  referenceAssetIds: string[];
  grounding: GroundingSummary;
}
const storage = () => {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
};
export function saveGroundingResume(value: Resume, store: Store | null = storage()): void {
  try {
    store?.setItem(
      key,
      JSON.stringify({
        ...value,
        input: { ...value.input, idempotencyKey: undefined, refreshGrounding: undefined },
      }),
    );
  } catch {
    /* private mode */
  }
}
export function clearGroundingResume(store: Store | null = storage()): void {
  try {
    store?.removeItem(key);
  } catch {
    /* private mode */
  }
}
export function readGroundingResume(
  userId: string,
  store: Store | null = storage(),
): Resume | null {
  try {
    const raw = store?.getItem(key);
    if (!raw || raw.length > 50000) return null;
    const v = JSON.parse(raw) as Resume;
    if (
      v.userId !== userId ||
      typeof v.sessionId !== "string" ||
      typeof v.input?.prompt !== "string" ||
      !Array.isArray(v.referenceAssetIds) ||
      v.referenceAssetIds.some((p) => typeof p !== "string") ||
      !Array.isArray(v.grounding?.sources) ||
      v.grounding.sources.length > 12 ||
      v.grounding.sources.some((s) => typeof s.title !== "string" || !isPublicHttpsUrl(s.url))
    )
      return null;
    return v;
  } catch {
    return null;
  }
}
