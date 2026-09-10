// Native image generation — authenticated client fetch + polling.
//
// The /api/generation/* routes are plain file-route API endpoints, not
// TanStack serverFn RPCs, so the existing attachSupabaseAuth middleware
// (wired for serverFn calls only) doesn't apply here. This attaches the
// same Bearer token by hand, straight from the browser's own Supabase
// session — never a service role, matching every other layer of this
// feature.

import { supabase } from "@/integrations/supabase/client";
export { nextPollDelayMs, isTerminalStatus } from "./polling";

export class GenerationApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GenerationApiError";
    this.status = status;
  }
}

export async function generationFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(path, { ...init, headers });
}

async function generationJson<T>(path: string, init?: RequestInit): Promise<T> {
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

export interface CreateJobRequest {
  operation: "generate" | "edit";
  model: "flare" | "sunburst";
  prompt: string;
  referenceAssetIds?: string[];
  sourceVersionId?: string | null;
  sourceContext?: { type: string; id?: string | null };
  idempotencyKey: string;
  structuredAspectRatio?: string | null;
}

export interface CreateJobResponse {
  jobId: string;
  sessionId: string;
  status: string;
}

export function createGenerationJob(req: CreateJobRequest): Promise<CreateJobResponse> {
  return generationJson<CreateJobResponse>("/api/generation/jobs", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export interface JobStatusResponse {
  jobId: string;
  sessionId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  operation: "generate" | "edit";
  model: "flare" | "sunburst";
  width: number;
  height: number;
  errorMessage: string | null;
  result: { versionId: string; url: string; width: number; height: number } | null;
}

export function getGenerationJob(jobId: string): Promise<JobStatusResponse> {
  return generationJson<JobStatusResponse>(`/api/generation/jobs/${jobId}`);
}

export interface SessionVersion {
  id: string;
  parent_version_id: string | null;
  storage_path: string;
  width: number;
  height: number;
  prompt: string;
  model: "flare" | "sunburst";
  created_at: string;
  url: string | null;
}

export function getGenerationSession(
  sessionId: string,
): Promise<{ sessionId: string; versions: SessionVersion[] }> {
  return generationJson(`/api/generation/sessions/${sessionId}`);
}

export function getCreditBalance(): Promise<{ availableCredits: number }> {
  return generationJson("/api/generation/credits");
}

export function uploadReferenceImage(
  dataUrl: string,
): Promise<{ assetId: string; path: string; previewUrl: string | null }> {
  return generationJson("/api/generation/references", {
    method: "POST",
    body: JSON.stringify({ dataUrl }),
  });
}
