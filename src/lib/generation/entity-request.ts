import { ROLES_BY_TYPE, validRole, type EntityType } from "./entities.ts";
import { validateReferenceUploadRequest } from "./reference-upload-request.ts";
export function validateEntityBody(body: unknown, patch = false) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return { ok: false as const, error: "Invalid request body" };
  const b = body as Record<string, unknown>;
  if (
    Object.keys(b).some(
      (k) => !(patch ? ["name", "description"] : ["name", "type", "description"]).includes(k),
    )
  )
    return { ok: false as const, error: "Invalid reference pack field" };
  if (
    (!patch || "name" in b) &&
    (typeof b.name !== "string" || !b.name.trim() || b.name.trim().length > 60)
  )
    return { ok: false as const, error: "Name must be 1–60 characters" };
  if (!patch && (typeof b.type !== "string" || !Object.hasOwn(ROLES_BY_TYPE, b.type)))
    return { ok: false as const, error: "Invalid reference pack type" };
  if ("description" in b && (typeof b.description !== "string" || b.description.length > 600))
    return { ok: false as const, error: "Description must be at most 600 characters" };
  return {
    ok: true as const,
    value: {
      ...("name" in b ? { name: (b.name as string).trim() } : {}),
      ...(!patch ? { type: b.type as EntityType } : {}),
      ...("description" in b
        ? { description: (b.description as string).trim() }
        : !patch
          ? { description: "" }
          : {}),
    },
  };
}
export function validateEntityAssetBody(body: unknown, type: EntityType) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return { ok: false as const, error: "Invalid request body" };
  const b = body as Record<string, unknown>;
  if (Object.keys(b).some((k) => !["dataUrl", "role"].includes(k)))
    return { ok: false as const, error: "Do not send a storage path or asset metadata" };
  if (!validRole(type, b.role)) return { ok: false as const, error: "Invalid reference role" };
  const validation = validateReferenceUploadRequest({ dataUrl: b.dataUrl });
  return validation.ok ? { ...validation, role: b.role } : validation;
}
