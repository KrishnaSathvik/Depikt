import { TemporalSupportSchema } from "../generation/grounding/temporal.ts";
import { resultStatusLines, type ResultStatusLine } from "../generation/result-status.ts";
import { VERSION_LABELS } from "../product.ts";
import type { JobStatusResponse } from "../generation/client.ts";
import type { CreationItem } from "./client.ts";

export interface SavedVersion extends CreationItem {
  statusLines: ResultStatusLine[];
  sources: { title: string; url: string }[];
  lineage: string | null;
}
export interface CreationDetail {
  versions: SavedVersion[];
}
export interface SavedJob {
  id: string;
  operation: "generate" | "edit";
  usage_json?: { validation?: JobStatusResponse["validation"] } | null;
}
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

/** Whitelist display metadata only; never return tokens, seals, storage paths or diagnostics. */
export function savedCreationDetails(
  items: CreationItem[],
  jobs: SavedJob[],
  plan: unknown,
): CreationDetail {
  const bundle = record(record(record(plan).grounding).bundle);
  const temporal = TemporalSupportSchema.safeParse(bundle.temporalSupport);
  const sources = (Array.isArray(bundle.sources) ? bundle.sources : []).flatMap(
    (source: unknown) => {
      const { title, url } = record(source);
      if (typeof title !== "string" || typeof url !== "string") return [];
      try {
        if (new URL(url).protocol !== "https:") return [];
      } catch {
        return [];
      }
      return [{ title, url }];
    },
  );
  const selected = new Map<string | null, string>();
  for (const item of items) {
    const keepOriginal =
      jobs.find((job) => job.id === item.jobId)?.usage_json?.validation?.selected === "original";
    if (!keepOriginal || !selected.has(item.jobId)) selected.set(item.jobId, item.id);
  }
  return {
    versions: items.map((item) => {
      const job = jobs.find((j) => j.id === item.jobId);
      const parent = items.find((v) => v.id === item.parentVersionId);
      const lineage = item.parentVersionId
        ? parent?.jobId && parent.jobId === item.jobId
          ? VERSION_LABELS.refinement
          : job?.operation === "edit"
            ? VERSION_LABELS.edit
            : job
              ? VERSION_LABELS.regenerate
              : null
        : job?.operation === "edit"
          ? VERSION_LABELS.edit
          : job
            ? VERSION_LABELS.original
            : null;
      return {
        ...item,
        sources,
        lineage,
        statusLines: resultStatusLines({
          sourceCount: sources.length,
          temporalSupport: temporal.success ? temporal.data : null,
          validation: selected.get(item.jobId) === item.id ? job?.usage_json?.validation : null,
        }),
      };
    }),
  };
}
