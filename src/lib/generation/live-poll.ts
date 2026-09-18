import type { JobStatusResponse, SessionVersion } from "./client.ts";

export interface LivePollJobRow {
  id: string;
  status: string;
  operation: string;
  model: string;
  width: number | null;
  height: number | null;
  safe_error_message: string | null;
  usage_json?: { validation?: JobStatusResponse["validation"] } | null;
  session_id: string;
  series_index: number | null;
  series_label: string | null;
}

export interface LivePollVersionRow {
  id: string;
  job_id: string;
  parent_version_id: string | null;
  storage_path: string;
  width: number;
  height: number;
  prompt: string;
  model: string;
  created_at: string;
}

export interface LivePollSnapshot {
  jobs: Array<JobStatusResponse & { label: string | null; index: number | null }>;
  versions: SessionVersion[];
}

/**
 * Maps a live DB snapshot into the client poll shape. Kept pure so the
 * Generate spinner can update from Supabase even while local workerd is
 * still blocked inside POST /run.
 */
export function assembleLivePoll(
  jobs: LivePollJobRow[],
  versions: LivePollVersionRow[],
  signedUrls: Map<string, string | null>,
): LivePollSnapshot {
  const versionsByJob = new Map<string, LivePollVersionRow>();
  for (const version of versions) {
    if (!versionsByJob.has(version.job_id)) versionsByJob.set(version.job_id, version);
  }

  return {
    jobs: jobs.map((job) => {
      const version = job.status === "succeeded" ? (versionsByJob.get(job.id) ?? null) : null;
      return {
        ...(job.usage_json?.validation ? { validation: job.usage_json.validation } : {}),
        jobId: job.id,
        sessionId: job.session_id,
        status: job.status as JobStatusResponse["status"],
        operation: job.operation as JobStatusResponse["operation"],
        model: job.model as JobStatusResponse["model"],
        width: job.width ?? 0,
        height: job.height ?? 0,
        errorMessage: job.status === "failed" ? job.safe_error_message : null,
        result: version
          ? {
              versionId: version.id,
              url: signedUrls.get(version.id) ?? null,
              width: version.width,
              height: version.height,
            }
          : null,
        label: job.series_label,
        index: job.series_index,
      };
    }),
    versions: versions.map((version) => ({
      id: version.id,
      parent_version_id: version.parent_version_id,
      storage_path: version.storage_path,
      width: version.width,
      height: version.height,
      prompt: version.prompt,
      model: version.model as SessionVersion["model"],
      created_at: version.created_at,
      url: signedUrls.get(version.id) ?? null,
    })),
  };
}
