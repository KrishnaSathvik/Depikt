import { generationFetch, GenerationApiError } from "./client";
import type { ReferenceEntity } from "./entities";
export async function entityRequest<T>(suffix = "", method = "GET", body?: unknown): Promise<T> {
  const response = await generationFetch(`/api/generation/entities${suffix}`, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw new GenerationApiError(data.error ?? "Could not update reference packs", response.status);
  return data as T;
}
export const listReferenceEntities = () => entityRequest<{ entities: ReferenceEntity[] }>();
