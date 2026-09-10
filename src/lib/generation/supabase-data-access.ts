// Native image generation — Supabase-backed GenerationDataAccess.
//
// Thin glue over job-pipeline.ts's interface. Every call uses the
// request-scoped, user-JWT-bound Supabase client (see
// src/lib/generation/auth.ts) — never a service role — so RLS enforces
// ownership the same way it was verified in
// supabase/migrations/20260910130000_add_generation_job_lifecycle.sql and
// 20260910140000_add_generation_storage.sql.
//
// Not unit-tested directly (it is a straight pass-through to the Supabase
// client, which needs a live connection to exercise meaningfully); the
// logic it wires together is tested in generation-job-pipeline.test.ts
// against the interface this file implements.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { GenerationDataAccess } from "./job-pipeline.ts";
import { GENERATION_BUCKET, imageVersionStoragePath } from "./storage-paths.ts";
import { asGenerationClient } from "./db-types.ts";

export function createSupabaseDataAccess(
  supabaseIn: SupabaseClient<Database>,
): GenerationDataAccess {
  const supabase = asGenerationClient(supabaseIn);
  return {
    async markJobRunning(jobId) {
      const { error } = await supabase
        .from("generation_jobs")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", jobId);
      if (error) throw error;
    },

    async markJobSucceeded(jobId, patch) {
      const { error } = await supabase
        .from("generation_jobs")
        .update({
          status: "succeeded",
          completed_at: new Date().toISOString(),
          usage_json: patch.usage,
          estimated_api_cost_usd: patch.estimatedApiCostUsd,
          openai_request_id: patch.openaiRequestId ?? null,
        })
        .eq("id", jobId);
      if (error) throw error;
    },

    async markJobFailed(jobId, patch) {
      const { error } = await supabase
        .from("generation_jobs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_code: patch.errorCode,
          safe_error_message: patch.safeErrorMessage,
        })
        .eq("id", jobId);
      if (error) throw error;
    },

    async uploadImage(path, bytes, mimeType) {
      const { error } = await supabase.storage
        .from(GENERATION_BUCKET)
        .upload(path, bytes, { contentType: mimeType, upsert: false });
      if (error) throw error;
    },

    async insertImageVersion(row) {
      const { data, error } = await supabase
        .from("image_versions")
        .insert({
          user_id: row.userId,
          session_id: row.sessionId,
          job_id: row.jobId,
          parent_version_id: row.parentVersionId,
          storage_path: row.storagePath,
          mime_type: row.mimeType,
          width: row.width,
          height: row.height,
          prompt: row.prompt,
          model: row.model,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id as string };
    },

    async finalizeCredits(userId, amount, idempotencyKey, outcome, jobId) {
      const { data, error } = await supabase.rpc("finalize_generation_credits", {
        p_user_id: userId,
        p_amount: amount,
        p_idempotency_key: idempotencyKey,
        p_outcome: outcome,
        p_job_id: jobId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return { availableCredits: row.available_credits as number };
    },

    buildStoragePath(userId, sessionId, versionId) {
      return imageVersionStoragePath(userId, sessionId, versionId, "png");
    },

    newVersionId() {
      return crypto.randomUUID();
    },
  };
}
