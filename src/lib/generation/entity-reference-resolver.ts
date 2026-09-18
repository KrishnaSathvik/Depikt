import {
  MAX_ATTACHED_ENTITIES,
  MAX_JOB_INPUT_IMAGES_WITH_ENTITIES,
  validRole,
  type ReferenceEntity,
  type ResolvedEntity,
} from "./entities.ts";

/** Pure selection; entity order is the order in the signed request. */
export function resolveEntityReferences({
  entities,
  prompt,
  budget,
}: {
  entities: ReferenceEntity[];
  prompt: string;
  budget: number;
}): ResolvedEntity[] {
  if (
    !Number.isInteger(budget) ||
    budget < entities.length ||
    budget > MAX_JOB_INPUT_IMAGES_WITH_ENTITIES ||
    entities.length > MAX_ATTACHED_ENTITIES
  )
    throw new Error("Too many reference images for one request");
  const close = /\b(close[- ]?up|portrait|headshot|face|macro|label|detail)\b/i.test(prompt);
  const action =
    /\b(full[- ]body|running|walking|standing|dancing|jumping|holding|wearing|outfit)\b/i.test(
      prompt,
    );
  const choices = entities.map((entity) => {
    const productAnchor = entity.assets.some((a) => a.role === "primary") ? "primary" : "front";
    const roles =
      entity.type === "brand"
        ? ["logo", "style_reference", "product_shot"]
        : entity.type === "character"
          ? close
            ? ["primary", "front", "three_quarter"]
            : action
              ? ["primary", "full_body", "three_quarter"]
              : ["primary", "three_quarter", "full_body"]
          : close
            ? [productAnchor, "detail", "three_quarter"]
            : action
              ? [productAnchor, "three_quarter", "side"]
              : [productAnchor, "three_quarter", "back"];
    const rank = (role: string) => {
      const index = roles.indexOf(role);
      return index < 0 ? roles.length : index;
    };
    const assets = [...entity.assets].sort(
      (a, b) =>
        rank(a.role) - rank(b.role) ||
        a.sort_order - b.sort_order ||
        a.created_at.localeCompare(b.created_at) ||
        a.id.localeCompare(b.id),
    );
    if (
      !assets.length ||
      assets.some(
        (a) =>
          a.entity_id !== entity.id ||
          a.user_id !== entity.user_id ||
          !validRole(entity.type, a.role) ||
          !a.storage_path.startsWith(`users/${entity.user_id}/entities/${entity.id}/`) ||
          a.storage_path.includes(".."),
      )
    )
      throw new Error("Invalid reference pack");
    return assets.slice(0, 3);
  });
  const counts = entities.map(() => 1);
  let remaining = budget - entities.length;
  while (remaining > 0) {
    let allocated = false;
    for (let i = 0; i < counts.length && remaining > 0; i++)
      if (counts[i] < choices[i].length) {
        counts[i]++;
        remaining--;
        allocated = true;
      }
    if (!allocated) break;
  }
  return entities.map((entity, i) => ({
    id: entity.id,
    type: entity.type,
    name: entity.name,
    description: entity.description,
    locked: true,
    resolvedReferences: choices[i]
      .slice(0, counts[i])
      .map((a) => ({ assetId: a.id, role: a.role, path: a.storage_path })),
  }));
}

/** Keep nonexistent and foreign ids indistinguishable at the planning boundary. */
export function selectOwnedEntities(
  rows: ReferenceEntity[],
  entityIds: string[],
  userId: string,
): ReferenceEntity[] {
  if (
    rows.length !== entityIds.length ||
    new Set(entityIds).size !== entityIds.length ||
    rows.some((e) => e.user_id !== userId || !entityIds.includes(e.id))
  )
    throw new Error("Invalid reference pack");
  return entityIds.map((id) => {
    const entity = rows.find((e) => e.id === id);
    if (!entity) throw new Error("Invalid reference pack");
    return entity;
  });
}
