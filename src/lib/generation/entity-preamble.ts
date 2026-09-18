import type { ResolvedEntity } from "./entities.ts";
export function entityReferenceLayout(entities: ResolvedEntity[], precedingImages: number) {
  let index = precedingImages + 1;
  return entities.map((entity) => {
    const first = index;
    index += entity.resolvedReferences.length;
    return { entity, first, last: index - 1 };
  });
}
export function buildEntityPreamble(entities: ResolvedEntity[], precedingImages: number): string {
  const lines = entityReferenceLayout(entities, precedingImages).map(
    ({ entity: e, first, last }) => {
      const images =
        first === last ? `Reference image ${first}` : `Reference images ${first}–${last}`;
      const description = e.description ? `: ${e.description}` : "";
      if (e.type === "character")
        return `${images} show ${e.name}. Preserve ${e.name}'s identity: facial structure, age appearance, hair identity, and defining features${description}. Clothing, pose, expression, environment and lighting may change unless the request says otherwise.`;
      if (e.type === "product")
        return `${images} show ${e.name}. Preserve the exact product identity and packaging: container geometry, cap, label layout, logo/brand mark including enclosing shapes and symbols, typography placement, illustrations, defining colors, and proportions${description}. Do not simplify, substitute, or redesign brand marks. Environment, lighting, and presentation may change.`;
      return `${images} show the ${e.name} brand. Preserve the supplied brand identity, logo treatment and visual language${description}. Do not simplify or redraw supplied logo geometry.`;
    },
  );
  if (entities.length > 1)
    lines.push("Keep each named subject distinct; do not merge features between them.");
  return lines.join("\n");
}
