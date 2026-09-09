import Dexie, { type Table } from "dexie";

export interface FavoriteRecord {
  promptId: string;
  promptSource: string;
  createdAt: number;
}

export interface HistoryRecord {
  id: string;
  kind: "generate" | "critique";
  roughIdea: string;
  result: Record<string, unknown>;
  createdAt: number;
  // ---- v2 (Phase 2) optional fields; absent on records written before ----
  /** Processed reference image data URL, when one was used and fit the storage budget. */
  referenceImage?: string;
  /** UI-selected reference intent ("auto" or a ReferenceIntent). */
  referenceIntent?: string;
  /** Structured intent produced by the Builder (also present inside result.intent). */
  intent?: Record<string, unknown>;
  /** True when an image was used but not stored because it exceeded the budget. */
  referenceImageOmitted?: boolean;
  /** Engine version that produced the result. */
  promptVersion?: string;
}

class PixelaryDB extends Dexie {
  favorites!: Table<FavoriteRecord, string>;
  history!: Table<HistoryRecord, string>;

  constructor() {
    super("pixelary");
    this.version(1).stores({
      favorites: "promptId, createdAt",
      history: "id, createdAt",
    });
    // v2: same indexes; new optional, non-indexed fields on history records.
    // Existing rows are readable as-is; the upgrade only stamps promptVersion
    // from result.prompt_version so old and new entries can be told apart.
    this.version(2)
      .stores({
        favorites: "promptId, createdAt",
        history: "id, createdAt",
      })
      .upgrade((tx) =>
        tx
          .table("history")
          .toCollection()
          .modify((rec: HistoryRecord) => {
            Object.assign(rec, normalizeHistoryRecord(rec));
          }),
      );
  }
}

/**
 * Pure normalization used by the v2 upgrade and by tests: fills promptVersion
 * from the stored result when missing and leaves everything else untouched.
 */
export function normalizeHistoryRecord(rec: HistoryRecord): HistoryRecord {
  const out: HistoryRecord = { ...rec };
  if (!out.promptVersion) {
    const pv = (rec.result as { prompt_version?: unknown } | undefined)?.prompt_version;
    if (typeof pv === "string") out.promptVersion = pv;
  }
  if (!out.intent) {
    const intent = (rec.result as { intent?: unknown } | undefined)?.intent;
    if (intent && typeof intent === "object") out.intent = intent as Record<string, unknown>;
  }
  return out;
}

export const db = new PixelaryDB();
