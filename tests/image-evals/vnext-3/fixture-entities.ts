import { readFileSync } from "node:fs";
import type {
  EntityType,
  EntityRole,
  ReferenceEntity,
} from "../../../src/lib/generation/entities.ts";
export const FIXTURE_USER = "10000000-0000-4000-8000-000000000001";
const packs = JSON.parse(
  readFileSync(new URL("./fixtures/prompts.json", import.meta.url), "utf8"),
) as Array<{
  id: string;
  name: string;
  type: EntityType;
  description: string;
  roles: EntityRole[];
}>;
export function fixtureEntity(key: string): ReferenceEntity {
  const index = packs.findIndex((p) => p.id === key);
  if (index < 0) throw new Error("Unknown fixture");
  const pack = packs[index];
  const id = `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
  return {
    id,
    user_id: FIXTURE_USER,
    name: pack.name,
    type: pack.type,
    description: pack.description,
    assets: pack.roles.map((role, i) => {
      const assetId = `30000000-0000-4000-8000-${String(index * 10 + i + 1).padStart(12, "0")}`;
      return {
        id: assetId,
        entity_id: id,
        user_id: FIXTURE_USER,
        storage_path: `users/${FIXTURE_USER}/entities/${id}/${assetId}.webp`,
        role: role === "front" && i === 0 ? "primary" : role,
        sort_order: i,
        mime_type: "image/webp",
        created_at: "2026-09-16T00:00:00Z",
      };
    }),
  };
}
export function fixturePath(entityId: string, assetId: string): URL {
  const index = packs.findIndex((p) => fixtureEntity(p.id).id === entityId);
  const entity = fixtureEntity(packs[index].id);
  const i = entity.assets.findIndex((a) => a.id === assetId);
  return new URL(
    `./fixtures/${packs[index].id}/${packs[index].roles[i].replaceAll("_", "-")}.webp`,
    import.meta.url,
  );
}
