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
import { settleJobCredits } from "./settle-credits.ts";
import { transitionJob } from "./job-transition.ts";

export function didUpdateRow<T>({ data, error }: { data: T | null; error: unknown }): boolean {
  if (error) throw error;
  return Boolean(data);
}

export function createSupabaseDataAccess(
  supabaseIn: SupabaseClient<Database>,
  options: { executionToken?: string | null } = {},
): GenerationDataAccess {
  const supabase = asGenerationClient(supabaseIn);
  const executionToken = options.executionToken ?? null;
  return {
    async markJobRunning(jobId) {
      return transitionJob(supabase, jobId, "running", {}, executionToken);
    },

    async markJobSucceeded(jobId, patch) {
      return transitionJob(supabase, jobId, "succeeded", patch, executionToken);
    },

    async markJobFailed(jobId, patch) {
      await transitionJob(supabase, jobId, "failed", patch, executionToken);
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
          ...(row.mediaMetadata ? { media_metadata: row.mediaMetadata } : {}),
        })
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id as string };
    },

    async finalizeCredits(userId, amount, idempotencyKey, outcome, jobId) {
      // Owner, amount and key are read from the job row in the database.
      return settleJobCredits(supabase, jobId, outcome, { userId, amount, idempotencyKey });
    },

    buildStoragePath(userId, sessionId, versionId, format = "png") {
      return imageVersionStoragePath(
        userId,
        sessionId,
        versionId,
        format === "jpeg" ? "jpg" : format,
      );
    },

    newVersionId() {
      return crypto.randomUUID();
    },
  };
}
