// Target-model versioning for library prompts.
//
// The existing ~500 curated prompts were written for GPT Image 2 and stay
// exactly as they are; they carry target_model "gpt-image-2". Future
// ChatGPT Images 2.5 entries use "gpt-image-2.5". Rows without the column
// (databases where the migration has not run yet) default to the legacy value.

export const TARGET_MODELS = ["gpt-image-2", "gpt-image-2.5"] as const;
export type TargetModel = (typeof TARGET_MODELS)[number];

export const DEFAULT_TARGET_MODEL: TargetModel = "gpt-image-2";

export const TARGET_MODEL_LABELS: Record<TargetModel, string> = {
  "gpt-image-2": "GPT Image 2",
  "gpt-image-2.5": "Images 2.5",
};

export function isTargetModel(v: unknown): v is TargetModel {
  return typeof v === "string" && (TARGET_MODELS as readonly string[]).includes(v);
}

/** Unknown, null, or legacy-shaped values map to the legacy collection. */
export function normalizeTargetModel(v: unknown): TargetModel {
  return isTargetModel(v) ? v : DEFAULT_TARGET_MODEL;
}

export interface CollectionOption {
  value: TargetModel | "all";
  label: string;
  count: number;
}

/**
 * Collections present in the loaded library, in a stable order, with "All"
 * first. The UI shows a collection filter only when more than one collection
 * actually has prompts, so no empty Images 2.5 tab is ever rendered.
 */
export function availableCollections(
  prompts: ReadonlyArray<{ target_model?: unknown }>,
): CollectionOption[] {
  const counts = new Map<TargetModel, number>();
  for (const p of prompts) {
    const tm = normalizeTargetModel(p.target_model);
    counts.set(tm, (counts.get(tm) ?? 0) + 1);
  }
  const present = TARGET_MODELS.filter((tm) => (counts.get(tm) ?? 0) > 0);
  const options: CollectionOption[] = present.map((tm) => ({
    value: tm,
    label: TARGET_MODEL_LABELS[tm],
    count: counts.get(tm) ?? 0,
  }));
  return [{ value: "all", label: "All", count: prompts.length }, ...options];
}

export function shouldShowCollectionFilter(
  prompts: ReadonlyArray<{ target_model?: unknown }>,
): boolean {
  return availableCollections(prompts).length > 2;
}
