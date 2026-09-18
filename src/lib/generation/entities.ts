export const MAX_ADHOC_REFERENCE_IMAGES = 4;
// OpenAI supports up to 16 GPT Image edit inputs.
// Depikt intentionally caps entity jobs at 8 for cost,
// latency, and reference-selection quality.
export const MAX_JOB_INPUT_IMAGES_WITH_ENTITIES = 8;
export const MAX_ENTITIES_PER_USER = 50;
export const MAX_ASSETS_PER_ENTITY = 8;
export const MAX_ATTACHED_ENTITIES = 4;
export const ROLES_BY_TYPE = {
  character: ["primary", "front", "three_quarter", "profile", "full_body"],
  product: ["primary", "front", "three_quarter", "back", "side", "detail"],
  brand: ["logo", "style_reference", "product_shot"],
} as const;
export type EntityType = keyof typeof ROLES_BY_TYPE;
export type EntityRole = (typeof ROLES_BY_TYPE)[EntityType][number];
export interface EntityAsset {
  id: string;
  entity_id: string;
  user_id: string;
  storage_path: string;
  role: EntityRole;
  sort_order: number;
  mime_type: string;
  created_at: string;
  previewUrl?: string | null;
}
export interface ReferenceEntity {
  id: string;
  user_id: string;
  name: string;
  type: EntityType;
  description: string;
  assets: EntityAsset[];
}
export interface ResolvedEntity {
  id: string;
  type: EntityType;
  name: string;
  description: string;
  locked: true;
  resolvedReferences: Array<{ assetId: string; role: EntityRole; path: string }>;
}
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const entityReferenceIntent = (type: EntityType) =>
  (({ character: "subject_identity", product: "product_object", brand: "style" }) as const)[type];
export function validRole(type: EntityType, role: unknown): role is EntityRole {
  return typeof role === "string" && (ROLES_BY_TYPE[type] as readonly string[]).includes(role);
}
