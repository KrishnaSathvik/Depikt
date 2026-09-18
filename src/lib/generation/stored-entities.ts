import { entityReferenceLayout } from "./entity-preamble.ts";
import {
  UUID_RE,
  MAX_ATTACHED_ENTITIES,
  MAX_ADHOC_REFERENCE_IMAGES,
  MAX_JOB_INPUT_IMAGES_WITH_ENTITIES,
  ROLES_BY_TYPE,
  validRole,
  type ResolvedEntity,
  type EntityType,
} from "./entities.ts";
export class EntityReferenceUnavailableError extends Error {
  constructor() {
    super("Could not load the locked reference pack.");
    this.name = "EntityReferenceUnavailableError";
  }
}
/** Absence is legacy-compatible; any claimed but malformed lock fails closed. */
export function extractStoredEntities(planJson: unknown, userId?: string): ResolvedEntity[] {
  if (!planJson || typeof planJson !== "object") return [];
  const root = planJson as Record<string, unknown>;
  if (!Object.hasOwn(root, "entities")) {
    if (Number(root.lockedEntityCount) > 0 || Number(root.entityCount) > 0)
      throw new EntityReferenceUnavailableError();
    return [];
  }
  const fail = (): never => {
    throw new EntityReferenceUnavailableError();
  };
  if (!Array.isArray(root.entities) || root.entities.length > MAX_ATTACHED_ENTITIES) return fail();
  const ids = new Set<string>(),
    paths = new Set<string>();
  for (const e of root.entities) {
    if (
      !e ||
      typeof e !== "object" ||
      typeof e.id !== "string" ||
      !UUID_RE.test(e.id) ||
      ids.has(e.id) ||
      e.locked !== true ||
      typeof e.type !== "string" ||
      !Object.hasOwn(ROLES_BY_TYPE, e.type) ||
      typeof e.name !== "string" ||
      !e.name.trim() ||
      e.name.length > 60 ||
      typeof e.description !== "string" ||
      e.description.length > 600 ||
      !Array.isArray(e.resolvedReferences) ||
      !e.resolvedReferences.length ||
      e.resolvedReferences.length > 3
    )
      return fail();
    ids.add(e.id);
    for (const ref of e.resolvedReferences) {
      if (
        !ref ||
        typeof ref.assetId !== "string" ||
        !UUID_RE.test(ref.assetId) ||
        !validRole(e.type as EntityType, ref.role) ||
        typeof ref.path !== "string" ||
        paths.has(ref.path)
      )
        return fail();
      const match = ref.path.match(
        /^users\/([0-9a-f-]{36})\/entities\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.(png|jpg|webp)$/i,
      );
      if (
        !match ||
        !UUID_RE.test(match[1]) ||
        match[2] !== e.id ||
        match[3] !== ref.assetId ||
        (userId && match[1] !== userId)
      )
        return fail();
      paths.add(ref.path);
    }
  }
  if (
    (root.lockedEntityCount !== undefined && root.lockedEntityCount !== ids.size) ||
    (root.entityCount !== undefined && root.entityCount !== ids.size)
  )
    return fail();
  if (
    ids.size &&
    (!Array.isArray(root.referenceAssetIds) ||
      root.referenceAssetIds.length > MAX_ADHOC_REFERENCE_IMAGES ||
      root.referenceAssetIds.some((v: unknown) => typeof v !== "string" || !v) ||
      (root.sourceVersionId != null &&
        (typeof root.sourceVersionId !== "string" || !UUID_RE.test(root.sourceVersionId))) ||
      paths.size + root.referenceAssetIds.length + (root.sourceVersionId ? 1 : 0) >
        MAX_JOB_INPUT_IMAGES_WITH_ENTITIES)
  )
    return fail();
  return root.entities as ResolvedEntity[];
}
export function extractStoredEntityReferencePaths(planJson: unknown, userId?: string): string[] {
  return entityReferenceLayout(extractStoredEntities(planJson, userId), 0).flatMap(({ entity }) =>
    entity.resolvedReferences.map((r) => r.path),
  );
}
