// Profile + Creations -- authenticated client fetch wrappers. Reuses the
// same Bearer-token attach as generation (generationFetch) rather than
// duplicating it -- these routes sit next to /api/generation/* and
// /api/billing/* under the same authenticateGenerationRequest server check.

import { generationFetch, GenerationApiError } from "@/lib/generation/client";
import { removeCreationFromCache } from "./creations-cache";
import { privateScope } from "@/lib/private-cache";
import { supabase } from "@/integrations/supabase/client";

export { GenerationApiError };

async function profileJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await generationFetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new GenerationApiError(
      (body as { error?: string }).error ?? "Request failed",
      res.status,
    );
  }
  return body as T;
}

export interface ProfileResponse {
  username: string;
  displayName: string | null;
  avatarSeed: string;
  avatarVariant: string;
}

export function getProfile(): Promise<ProfileResponse> {
  return profileJson<ProfileResponse>("/api/account/profile");
}

export interface UpdateProfileInput {
  displayName?: string;
  username?: string;
  /** DiceBear style id (see AVATAR_STYLES) -- set together with avatarSeed from the picker. */
  avatarVariant?: string;
  /** DiceBear seed -- the picker sets this alongside avatarVariant; a style change alone keeps the current seed. */
  avatarSeed?: string;
}

export function updateProfile(input: UpdateProfileInput): Promise<ProfileResponse> {
  return profileJson<ProfileResponse>("/api/account/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
  return profileJson<{ available: boolean }>("/api/account/username-availability", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export interface CreationItem {
  id: string;
  jobId: string | null;
  sessionId: string | null;
  url: string | null;
  width: number;
  height: number;
  prompt: string;
  createdAt: string;
  operation: "generate" | "edit" | null;
  parentVersionId: string | null;
  seriesIndex: number | null;
  seriesLabel: string | null;
  model: "flare" | "sunburst";
}

export interface CreationsPage {
  items: CreationItem[];
  nextCursor: string | null;
}

export function getCreations(
  opts: {
    cursor?: string | null;
    type?: "all" | "generated" | "edited";
    limit?: number;
  } = {},
): Promise<CreationsPage> {
  const params = new URLSearchParams();
  if (opts.cursor) params.set("cursor", opts.cursor);
  if (opts.type && opts.type !== "all") params.set("type", opts.type);
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return profileJson<CreationsPage>(`/api/account/creations${qs ? `?${qs}` : ""}`);
}

export async function deleteCreation(id: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const scope = data.session ? privateScope(data.session.user.id) : null;
  await profileJson<{ deleted: true }>(`/api/account/creations/${id}`, { method: "DELETE" });
  if (scope) removeCreationFromCache(scope, id);
}

export function getCreationDetail(id: string): Promise<import("./creation-detail").CreationDetail> {
  return profileJson(`/api/account/creations/${id}`);
}
