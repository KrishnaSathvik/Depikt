import { useLiveQuery } from "dexie-react-hooks";
import { db, normalizeHistoryRecord, type HistoryRecord } from "./db.ts";

export type { HistoryRecord };

const MAX_ENTRIES = 50;

/**
 * Storage bound for reference images kept with history entries. A processed
 * reference is typically 100–400 KB; PNGs can be larger. With 50 entries the
 * worst case stays under ~35 MB, which IndexedDB handles comfortably. Images
 * above this size are not stored and the entry is flagged instead.
 */
export const MAX_STORED_IMAGE_CHARS = 700_000;

export function useHistory(): HistoryRecord[] {
  const entries = useLiveQuery(() => db.history.orderBy("createdAt").reverse().toArray(), []);
  return entries ?? [];
}

export function useHistoryCount(): number {
  const count = useLiveQuery(() => db.history.count(), []);
  return count ?? 0;
}

export interface NewHistoryEntry {
  kind: HistoryRecord["kind"];
  roughIdea: string;
  result: Record<string, unknown>;
  referenceImage?: string | null;
  referenceIntent?: string | null;
}

/** Pure: apply the image storage bound and derive intent/version fields. Exported for tests. */
export function prepareHistoryRecord(
  entry: NewHistoryEntry,
  id: string,
  createdAt: number,
): HistoryRecord {
  const rec: HistoryRecord = {
    id,
    kind: entry.kind,
    roughIdea: entry.roughIdea,
    result: entry.result,
    createdAt,
  };
  if (entry.referenceIntent) rec.referenceIntent = entry.referenceIntent;
  if (entry.referenceImage) {
    if (entry.referenceImage.length <= MAX_STORED_IMAGE_CHARS)
      rec.referenceImage = entry.referenceImage;
    else rec.referenceImageOmitted = true;
  }
  return normalizeHistoryRecord(rec);
}

export async function addHistoryEntry(entry: NewHistoryEntry): Promise<HistoryRecord> {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const full = prepareHistoryRecord(entry, id, Date.now());
  await db.history.add(full);

  // Cap at MAX_ENTRIES — remove oldest beyond limit
  const count = await db.history.count();
  if (count > MAX_ENTRIES) {
    const excess = await db.history
      .orderBy("createdAt")
      .limit(count - MAX_ENTRIES)
      .toArray();
    await db.history.bulkDelete(excess.map((e) => e.id));
  }

  return full;
}

export async function removeHistoryEntry(id: string): Promise<void> {
  await db.history.delete(id);
}

export async function clearAllHistory(): Promise<void> {
  await db.history.clear();
}

export async function getHistoryById(id: string): Promise<HistoryRecord | undefined> {
  const rec = await db.history.get(id);
  return rec ? normalizeHistoryRecord(rec) : undefined;
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
