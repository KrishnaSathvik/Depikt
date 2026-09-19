import type { JobStatusResponse, SessionVersion } from "./client.ts";

/** An explicitly selected image always wins over the first child in a series. */
export function selectedGenerationResult(
  jobs: JobStatusResponse[],
  versions: SessionVersion[],
  versionId: string | null,
) {
  const version = versions.find((v) => v.id === versionId) ?? null;
  const job =
    jobs.find(
      (j) => j.result?.versionId === versionId || (version?.job_id && j.jobId === version.job_id),
    ) ??
    jobs[0] ??
    null;
  return { version, job, url: version ? version.url : (job?.result?.url ?? null) };
}

/** A pending assessment is not an active repair. Expired worker claims are not live progress. */
export function isRepairInProgress(
  jobId: string,
  repair: { job_id: string | null; state: string; started_at: string } | null,
  now = Date.now(),
): boolean {
  return (
    repair?.job_id === jobId &&
    repair.state === "running" &&
    now - Date.parse(repair.started_at) < 6 * 60 * 1000
  );
}

/** Regenerating a series child is one new image, never a replay of the whole series brief. */
export function regenerateVersionInput(version: SessionVersion) {
  return {
    prompt: version.prompt,
    userInput: "Regenerate this image as one image, preserving its content and composition.",
    sourceVersionId: version.id,
    structuredAspectRatio: `${version.width}:${version.height}`,
    refreshGrounding: false,
  };
}

/** Same ratio caption for individual and series canvases. */
export function resultRatioLabel(width: number, height: number): string {
  let a = width,
    b = height;
  while (b) [a, b] = [b, a % b];
  const divisor = a || 1;
  return `${width / divisor}:${height / divisor}`;
}
