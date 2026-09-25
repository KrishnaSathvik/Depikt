import { RESULT_STATUS, VERSION_LABELS } from "../product.ts";
import type { JobStatusResponse, SessionVersion } from "./client";
import type { TemporalSupport } from "./grounding/temporal";

export interface ResultStatusLine {
  title: string;
  detail?: string;
}

export type VersionLineageKind = keyof typeof VERSION_LABELS;

type ValidationView = NonNullable<JobStatusResponse["validation"]> & {
  repairOutcome?: "not_attempted" | "improved" | "not_improved" | "provider_failed";
  selected?: "original" | "repair";
};

/**
 * User-facing result chrome. Maps grounding + validation payload into
 * editorial lines. Never surfaces verdict enums, confidence, V4/V5, or
 * repairable/pass_with_limitation.
 */
export function resultStatusLines(args: {
  sourceCount?: number;
  temporalSupport?: TemporalSupport | null;
  validation?: ValidationView | null;
  refining?: boolean;
}): ResultStatusLine[] {
  if (args.refining) return [{ title: RESULT_STATUS.refining }];

  const lines: ResultStatusLine[] = [];
  const sourceCount = args.sourceCount ?? 0;
  if (sourceCount > 0) {
    lines.push({ title: RESULT_STATUS.grounded, detail: RESULT_STATUS.sources(sourceCount) });
  }

  const temporal = args.temporalSupport ?? args.validation?.temporalSupport;
  if (temporal?.status === "unverified" && temporal.message) {
    lines.push({ title: temporal.message });
  }

  const verdict = args.validation?.verdict;
  if (verdict === "pass") {
    lines.push({ title: RESULT_STATUS.validated, detail: RESULT_STATUS.validatedDetail });
  } else if (args.validation?.warning && temporal?.status !== "unverified") {
    lines.push({ title: RESULT_STATUS.limitation });
  }

  const attempts = args.validation?.repairAttempts ?? 0;
  const repaired =
    args.validation?.repairOutcome === "improved" ||
    (args.validation?.selected === "repair" && attempts > 0);
  if (repaired) {
    lines.push({
      title: RESULT_STATUS.refined,
      detail: RESULT_STATUS.refinedDetail,
    });
  }

  return lines;
}

export function versionLineageKind(
  version: SessionVersion,
  versions: SessionVersion[],
  jobs: Array<{
    jobId?: string;
    id?: string;
    operation?: string;
    result?: { versionId: string } | null;
  }>,
): VersionLineageKind {
  if (!version.parent_version_id) return "original";
  const parent = versions.find((v) => v.id === version.parent_version_id);
  if (parent && version.job_id && parent.job_id && version.job_id === parent.job_id) {
    return "refinement";
  }
  const job = jobs.find(
    (j) =>
      j.result?.versionId === version.id || j.jobId === version.job_id || j.id === version.job_id,
  );
  if (job?.operation === "edit") return "edit";
  return "regenerate";
}

export function versionLineageLabel(
  version: SessionVersion,
  versions: SessionVersion[],
  jobs: Array<{
    jobId?: string;
    id?: string;
    operation?: string;
    result?: { versionId: string } | null;
  }>,
): string {
  return VERSION_LABELS[versionLineageKind(version, versions, jobs)];
}
