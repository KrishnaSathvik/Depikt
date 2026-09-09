// Provenance, review-status and reference metadata for library prompts.
//
// One library holds two collections (GPT Image 2 legacy rows and ChatGPT
// Images 2.5 rows). `target_model` (see target-model.ts) separates them;
// the vocabularies below separate *tested* entries from *staged* ones and
// record where each prompt came from. Legacy rows carry none of these
// columns and normalize to "approved / depikt_original / none", which is
// what they are: live, untagged, hand-picked prompts.

import { normalizeTargetModel, type TargetModel } from "./target-model.ts";

// ---------- vocabularies ----------

export const SOURCE_TYPES = [
  "official_prompt", // OpenAI published the prompt text itself
  "official_inspired", // OpenAI showed the output only; the prompt is ours
  "community_inspired", // derived from a public creator workflow; the prompt is ours
  "depikt_original", // written from scratch by Depikt
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const PROMPT_STATUSES = ["draft", "test_ready", "tested", "approved"] as const;
export type PromptStatus = (typeof PROMPT_STATUSES)[number];

export const REFERENCE_MODES = [
  "none",
  "identity",
  "style",
  "product",
  "composition",
  "sketch",
  "multi_reference",
  "edit_source",
] as const;
export type ReferenceMode = (typeof REFERENCE_MODES)[number];

/** Which Images 2.5 API model the next phase should try first. */
export const MODEL_HINTS = ["flare", "sunburst", "either"] as const;
export type ModelHint = (typeof MODEL_HINTS)[number];

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  official_prompt: "OpenAI prompt",
  official_inspired: "Inspired by OpenAI example",
  community_inspired: "Community-inspired",
  depikt_original: "Depikt original",
};

export const STATUS_LABELS: Record<PromptStatus, string> = {
  draft: "Draft",
  test_ready: "Test-ready",
  tested: "Tested",
  approved: "Approved",
};

// ---------- guards and normalizers ----------

export function isSourceType(v: unknown): v is SourceType {
  return typeof v === "string" && (SOURCE_TYPES as readonly string[]).includes(v);
}
export function isPromptStatus(v: unknown): v is PromptStatus {
  return typeof v === "string" && (PROMPT_STATUSES as readonly string[]).includes(v);
}
export function isReferenceMode(v: unknown): v is ReferenceMode {
  return typeof v === "string" && (REFERENCE_MODES as readonly string[]).includes(v);
}

/**
 * Rows without a status (every legacy GPT Image 2 row, and databases where
 * the provenance migration has not run) are live content and read as approved.
 */
export function normalizeStatus(v: unknown): PromptStatus {
  return isPromptStatus(v) ? v : "approved";
}
export function normalizeSourceType(v: unknown): SourceType {
  return isSourceType(v) ? v : "depikt_original";
}
export function normalizeReferenceMode(v: unknown): ReferenceMode {
  return isReferenceMode(v) ? v : "none";
}

// ---------- visibility ----------

/** Only approved prompts are shown to the public library. */
export function isPublicStatus(status: unknown): boolean {
  return normalizeStatus(status) === "approved";
}

export interface MetadataLike {
  id: string;
  target_model?: unknown;
  status?: unknown;
  source_type?: unknown;
  category?: string;
  created_at?: string;
}

export function filterPublic<T extends MetadataLike>(prompts: ReadonlyArray<T>): T[] {
  return prompts.filter((p) => isPublicStatus(p.status));
}

// ---------- filtering and sorting ----------

export function filterByModel<T extends MetadataLike>(
  prompts: ReadonlyArray<T>,
  model: TargetModel | "all",
): T[] {
  if (model === "all") return [...prompts];
  return prompts.filter((p) => normalizeTargetModel(p.target_model) === model);
}

export function filterByStatus<T extends MetadataLike>(
  prompts: ReadonlyArray<T>,
  status: PromptStatus | "all",
): T[] {
  if (status === "all") return [...prompts];
  return prompts.filter((p) => normalizeStatus(p.status) === status);
}

export function filterBySourceType<T extends MetadataLike>(
  prompts: ReadonlyArray<T>,
  source: SourceType | "all",
): T[] {
  if (source === "all") return [...prompts];
  return prompts.filter((p) => normalizeSourceType(p.source_type) === source);
}

export function filterByCategory<T extends MetadataLike>(
  prompts: ReadonlyArray<T>,
  category: string | "All",
): T[] {
  if (category === "All") return [...prompts];
  return prompts.filter((p) => p.category === category);
}

/** Newest first by created_at; rows without a date sort last. Stable. */
export function sortNewest<T extends MetadataLike>(prompts: ReadonlyArray<T>): T[] {
  return [...prompts].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

/**
 * Merge database rows with in-repo staged rows. A database row with the same
 * id wins, so promoting a staged prompt into `curated_prompts` never lists it
 * twice.
 */
export function mergeById<T extends MetadataLike>(
  primary: ReadonlyArray<T>,
  secondary: ReadonlyArray<T>,
): T[] {
  const seen = new Set(primary.map((p) => p.id));
  return [...primary, ...secondary.filter((p) => !seen.has(p.id))];
}

// ---------- slugs ----------

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
