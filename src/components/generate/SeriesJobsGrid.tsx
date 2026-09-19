import { resultRatioLabel } from "@/lib/generation/result-state";
import type { GenerationChildJob } from "@/lib/generation/use-generation";
import { GenerationCanvas } from "./GenerationCanvas";
import { GenerationActions } from "./GenerationActions";

/** Every child uses the same progress, result and action components as a single image. */
export function SeriesJobsGrid({
  jobs,
  onDownload,
  onEdit,
  onRegenerate,
  onNew,
}: {
  jobs: GenerationChildJob[];
  onDownload: (versionId: string) => void;
  onEdit: (versionId: string) => void;
  onRegenerate: (versionId: string) => void;
  onNew?: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
      {jobs.map((job, index) => {
        const label = job.label || `Image ${index + 1}`;
        const failed = job.status === "failed" || job.status === "cancelled";
        const versionId = job.result?.versionId;
        return (
          <section key={job.jobId} aria-label={label} className="min-w-0 space-y-3">
            <p className="label-mono truncate">{label}</p>
            <GenerationCanvas
              state={failed ? "error" : job.status === "succeeded" ? "result" : "generating"}
              aspectRatio={resultRatioLabel(job.width || 1, job.height || 1)}
              orientation={
                job.width === job.height
                  ? "square"
                  : job.width < job.height
                    ? "portrait"
                    : "landscape"
              }
              imageUrl={job.result?.url}
              imageAlt={label}
              errorMessage={job.errorMessage}
              onRetry={onNew}
              jobStatus={job.status === "queued" ? "queued" : "running"}
              refining={job.refining}
              warning={job.validation?.warning}
              validationMessage={job.validation?.temporalSupport?.message}
              actions={
                versionId ? (
                  <GenerationActions
                    onDownload={() => onDownload(versionId)}
                    onEdit={() => onEdit(versionId)}
                    onRegenerate={() => onRegenerate(versionId)}
                    onNew={onNew}
                  />
                ) : undefined
              }
            />
          </section>
        );
      })}
    </div>
  );
}
