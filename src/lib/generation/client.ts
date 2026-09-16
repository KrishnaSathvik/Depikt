// Native image generation — authenticated client fetch + polling.
//
// The /api/generation/* routes are plain file-route API endpoints, not
// TanStack serverFn RPCs, so the existing attachSupabaseAuth middleware
// (wired for serverFn calls only) doesn't apply here. This attaches the
// same Bearer token by hand, straight from the browser's own Supabase
// session — never a service role, matching every other layer of this
// feature.

import { supabase } from "@/integrations/supabase/client";
import type { Intent } from "@/lib/prompt-engine/intent";
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
  return fetch(path, { cache: "no-store", ...init, headers });
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

// The browser never assembles or submits an executable plan — no operation,
// no mode, no per-image briefs. POST /plans is the only place a prompt (or
// a pre-computed Intent) turns into a plan; the plan travels back as an
// opaque, signed planToken that POST /jobs merely verifies. See job-request.ts.

export interface CreatePlanRequest {
  /** The final, ready-to-render prompt (a direct /generate submission, or Build/Critique's finished output). */
  prompt: string;
  /** The original human request, when different from `prompt` (Build/Critique). Series decomposition needs this, not the writer's PAGE-block output. */
  userInput?: string | null;
  /** Pre-computed Intent from Build/Critique, when available — skips a redundant intent-analysis call. */
  intent?: Intent | null;
  referenceAssetIds?: string[];
  sourceVersionId?: string | null;
  /** Server-issued id from uploadEditMask. Never a storage path. */
  maskAssetId?: string | null;
  sourceContext?: { type: string; id?: string | null };
  structuredAspectRatio?: string | null;
}

export interface DisplayPlan {
  mode: "single" | "series" | "collage" | "contact_sheet" | "edit";
  desiredCount: number;
  autoCount: number;
  separateAssets: boolean;
  searchNeeded: boolean;
  requiresCountConfirmation: boolean;
  creditCostAuto: number;
  creditCostAll: number;
}

export interface CreatePlanResponse {
  plan: DisplayPlan;
  planToken: string;
}

export function createGenerationPlan(req: CreatePlanRequest): Promise<CreatePlanResponse> {
  return generationJson<CreatePlanResponse>("/api/generation/plans", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export interface CreateJobsFromPlanRequest {
  planToken: string;
  /** Required only when the plan's `requiresCountConfirmation` is true. */
  selectedCount?: number;
  idempotencyKey: string;
  structuredAspectRatio?: string | null;
  sourceContext: { type: string; id?: string | null };
}

export interface CreateJobsResponse {
  sessionId: string;
  jobs: Array<{ id: string; label: string | null; index: number | null; status: string }>;
}

export function createGenerationJobs(req: CreateJobsFromPlanRequest): Promise<CreateJobsResponse> {
  return generationJson<CreateJobsResponse>("/api/generation/jobs", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * Kicks off the actual work. Long-lived on purpose: the server does the
 * OpenAI call inside this request (no waitUntil/Queues available), so the
 * caller must NOT await it — start it, then poll the job as usual.
 */
export function startGenerationJob(jobId: string, referencePaths: string[]): Promise<Response> {
  return generationFetch(`/api/generation/jobs/${jobId}/run`, {
    method: "POST",
    body: JSON.stringify({ referencePaths }),
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
  result: { versionId: string; url: string | null; width: number; height: number } | null;
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

export interface SessionJobSummary {
  id: string;
  status: string;
  series_index: number | null;
  series_label: string | null;
  created_at: string;
}

export function getGenerationSession(
  sessionId: string,
): Promise<{ sessionId: string; versions: SessionVersion[]; jobs: SessionJobSummary[] }> {
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

export function uploadEditMask(
  sourceVersionId: string,
  dataUrl: string,
): Promise<{ assetId: string }> {
  return generationJson("/api/generation/masks", {
    method: "POST",
    body: JSON.stringify({ sourceVersionId, dataUrl }),
  });
}
