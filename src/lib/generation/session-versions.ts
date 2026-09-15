interface SessionJobStatus {
  id: string;
  status: string;
}

interface SessionVersion {
  job_id: string;
}

export function versionsForSucceededJobs<T extends SessionVersion>(
  versions: T[],
  jobs: SessionJobStatus[],
): T[] {
  const succeededJobIds = new Set(
    jobs.filter((job) => job.status === "succeeded").map((job) => job.id),
  );
  return versions.filter((version) => succeededJobIds.has(version.job_id));
}
