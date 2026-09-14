import { Loader2 } from "lucide-react";
import { GENERATION_STAGE_LABELS } from "@/lib/product";
import type { GenerationChildJob } from "@/lib/generation/use-generation";

/** A confirmed series' child jobs, with an image or per-job progress state. */
export function SeriesJobsGrid({ jobs }: { jobs: GenerationChildJob[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {jobs.map((job, index) => (
        <SeriesJobSlot key={job.jobId} job={job} index={index} />
      ))}
    </div>
  );
}

function SeriesJobSlot({ job, index }: { job: GenerationChildJob; index: number }) {
  const label = job.label || `Image ${index + 1}`;

  if (job.status === "succeeded" && job.result) {
    return (
      <div className="space-y-1.5">
        <img
          src={job.result.url}
          alt={label}
          className="aspect-square w-full rounded-md border border-[color:var(--border-subtle)] object-cover"
        />
        <p className="truncate text-[12px] font-mono text-[color:var(--text-tertiary)]">{label}</p>
      </div>
    );
  }

  const failed = job.status === "failed" || job.status === "cancelled";
  return (
    <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] p-3">
      {failed ? (
        <p className="text-body-sm text-red-600">{job.errorMessage ?? "Failed"}</p>
      ) : (
        <Loader2 className="h-5 w-5 animate-spin text-[color:var(--text-tertiary)]" />
      )}
      <p className="truncate text-[12px] font-mono text-[color:var(--text-tertiary)]">{label}</p>
      {!failed && (
        <p className="text-[11px] text-[color:var(--text-tertiary)]">
          {job.status === "queued"
            ? GENERATION_STAGE_LABELS.starting
            : GENERATION_STAGE_LABELS.creating}
        </p>
      )}
    </div>
  );
}
