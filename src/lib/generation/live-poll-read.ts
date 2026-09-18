import { supabase } from "@/integrations/supabase/client";
import { asGenerationClient } from "./db-types.ts";
import { GENERATION_BUCKET } from "./storage-paths.ts";
import { createSignedUrlWithTimeout } from "./signed-url.ts";
import {
  assembleLivePoll,
  type LivePollJobRow,
  type LivePollSnapshot,
  type LivePollVersionRow,
} from "./live-poll.ts";

/**
 * Reads job/version rows from Supabase with the user's JWT. This must not
 * go through `/api/generation/*` — local workerd serializes those behind
 * the long-lived POST /run, which is why a refresh (no /run in flight)
 * showed a result the live spinner never saw.
 */
export async function readGenerationSessionLive(sessionId: string): Promise<LivePollSnapshot> {
  const db = asGenerationClient(supabase);
  const [{ data: jobRows, error: jobsError }, { data: versionRows, error: versionsError }] =
    await Promise.all([
      db
        .from("generation_jobs")
        .select(
          "id, status, operation, model, width, height, safe_error_message, session_id, series_index, series_label, usage_json",
        )
        .eq("session_id", sessionId)
        .order("series_index", { ascending: true }),
      db
        .from("image_versions")
        .select(
          "id, job_id, parent_version_id, storage_path, width, height, prompt, model, created_at",
        )
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true }),
    ]);
  if (jobsError || versionsError) {
    throw new Error("Could not load the generation session");
  }

  const jobs = (jobRows ?? []) as LivePollJobRow[];
  const versions = (versionRows ?? []) as LivePollVersionRow[];
  const succeededIds = new Set(
    jobs.filter((job) => job.status === "succeeded").map((job) => job.id),
  );
  const signedUrls = new Map<string, string | null>();
  await Promise.all(
    versions
      .filter((version) => succeededIds.has(version.job_id))
      .map(async (version) => {
        const url = await createSignedUrlWithTimeout(async () => {
          return db.storage.from(GENERATION_BUCKET).createSignedUrl(version.storage_path, 600);
        });
        signedUrls.set(version.id, url);
      }),
  );

  return assembleLivePoll(jobs, versions, signedUrls);
}
