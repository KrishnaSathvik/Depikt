import { validateAndRepair, type ValidationRuntime } from "./validation/runtime.ts";
import { repairInstruction } from "./validation/repair.ts";
// Native image generation — job execution pipeline.
//
// Depends only on this narrow interface, never on the Supabase SDK
// directly, so the full success/failure/refund logic is unit-testable with
// an in-memory fake — no live database or storage needed to verify it.
// The real implementation (src/lib/generation/supabase-data-access.ts) is
// thin glue over this contract.

import {
  generateImage,
  editImage,
  estimateApiCostUsd,
  OpenAIImageError,
  type StoredImage,
} from "./openai-images.ts";
import type { ModelAlias } from "./models.ts";
import { raceWithTimeout, CREDIT_CHARGE_BUDGET_MS } from "./timeout.ts";

export { CREDIT_CHARGE_BUDGET_MS };
export type { StoredImage };

export interface GenerationJobRecord {
  id: string;
  userId: string;
  sessionId: string;
  operation: "generate" | "edit";
  model: ModelAlias;
  prompt: string;
  width: number;
  height: number;
  idempotencyKey: string;
  referenceImages: StoredImage[];
  editMask?: StoredImage | null;
  groundingCostUsd?: number | null;
}

export interface GenerationDataAccess {
  markJobRunning(jobId: string): Promise<boolean>;
  markJobSucceeded(
    jobId: string,
    patch: { usage: unknown; estimatedApiCostUsd: number | null; openaiRequestId?: string },
  ): Promise<boolean>;
  markJobFailed(
    jobId: string,
    patch: { errorCode: string; safeErrorMessage: string },
  ): Promise<void>;
  uploadImage(path: string, bytes: Uint8Array, mimeType: string): Promise<void>;
  insertImageVersion(row: {
    userId: string;
    sessionId: string;
    jobId: string;
    parentVersionId: string | null;
    storagePath: string;
    mimeType: string;
    width: number;
    height: number;
    prompt: string;
    model: ModelAlias;
  }): Promise<{ id: string }>;
  finalizeCredits(
    userId: string,
    amount: number,
    idempotencyKey: string,
    outcome: "charged" | "refunded",
    jobId: string,
  ): Promise<{ availableCredits: number }>;
  buildStoragePath(userId: string, sessionId: string, versionId: string): string;
  newVersionId(): string;
}

export interface RunJobDeps {
  data: GenerationDataAccess;
  validation?: ValidationRuntime;
  apiKey: string;
  fetchImpl?: typeof fetch;
  /** base64 -> bytes, injectable because atob/Buffer differ between the Workers and Node runtimes. */
  decodeBase64: (b64: string) => Uint8Array;
}

export type RunJobOutcome =
  | { outcome: "succeeded"; versionId: string }
  | { outcome: "failed"; errorCode: string };

function categorizeError(err: unknown): { errorCode: string; safeErrorMessage: string } {
  if (err instanceof OpenAIImageError) {
    if (err.status === 429) {
      return {
        errorCode: "rate_limited",
        safeErrorMessage: "Generation is temporarily unavailable.",
      };
    }
    if (err.status === 400 || err.status === 422) {
      return { errorCode: "rejected", safeErrorMessage: "The image request was rejected." };
    }
    return { errorCode: "provider_error", safeErrorMessage: "Generation failed." };
  }
  return { errorCode: "unknown", safeErrorMessage: "Generation failed." };
}

/**
 * Runs one queued job to completion. Always finalizes the credit reservation
 * exactly once, either as a charge (success) or a refund (failure) — never
 * both, never neither. Safe to be called from a background continuation:
 * every failure path is caught internally.
 */
export async function runGenerationJob(
  job: GenerationJobRecord,
  sourceVersionId: string | null,
  deps: RunJobDeps,
): Promise<RunJobOutcome> {
  const { data } = deps;
  let versionId: string;

  try {
    const running = await data.markJobRunning(job.id);
    if (!running) {
      return { outcome: "failed", errorCode: "timed_out" };
    }

    let result =
      job.operation === "generate"
        ? await generateImage({
            model: job.model,
            prompt: job.prompt,
            width: job.width,
            height: job.height,
            apiKey: deps.apiKey,
            fetchImpl: deps.fetchImpl,
          })
        : await editImage({
            model: job.model,
            prompt: job.prompt,
            width: job.width,
            height: job.height,
            apiKey: deps.apiKey,
            fetchImpl: deps.fetchImpl,
            referenceImages: job.referenceImages,
            mask: job.editMask ?? null,
          });

    let bytes = deps.decodeBase64(result.b64);
    const usages = [result.usage];
    let validationReport: unknown;
    if (deps.validation) {
      const validated = await validateAndRepair(
        { result, image: { bytes, filename: "result.png", mimeType: "image/png" } },
        deps.validation,
        async (repair, report, current) => {
          const next = await executeTargetedRepair(
            job,
            current.image,
            repair,
            report,
            deps.apiKey,
            deps.fetchImpl,
          );
          usages.push(next.usage);
          return {
            result: next,
            image: {
              bytes: deps.decodeBase64(next.b64),
              filename: "result.png",
              mimeType: "image/png",
            },
          };
        },
      );
      result = validated.output.result;
      bytes = validated.output.image.bytes;
      validationReport = {
        ...validated.result,
        repairAttempts: validated.attempts,
        repairOutcome: validated.repairOutcome,
        refinementPending: deps.validation.refinementPending ?? false,
        warning: validated.result.verdict !== "pass",
        providerTelemetry: deps.validation.providerTelemetry,
      };
    }
    versionId = data.newVersionId();
    const storagePath = data.buildStoragePath(job.userId, job.sessionId, versionId);

    await data.uploadImage(storagePath, bytes, "image/png");
    await data.insertImageVersion({
      userId: job.userId,
      sessionId: job.sessionId,
      jobId: job.id,
      parentVersionId: sourceVersionId,
      storagePath,
      mimeType: "image/png",
      width: job.width,
      height: job.height,
      prompt: job.prompt,
      model: job.model,
    });

    const succeeded = await data.markJobSucceeded(job.id, {
      usage: validationReport
        ? {
            imageAttempts: usages,
            validation: validationReport,
            economics: {
              policy: "launch-v1",
              initialProviderCostUsd: estimateApiCostUsd(usages[0]),
              validationCostUsd: deps.validation?.providerTelemetry?.estimatedCostUsd ?? null,
              groundingCostUsd: job.groundingCostUsd ?? null,
              repairCostUsd: usages.length > 1 ? estimateApiCostUsd(usages[1]) : 0,
              repairTriggered: usages.length > 1,
              userAccepted: null,
              userRegenerated: null,
            },
          }
        : job.groundingCostUsd !== undefined
          ? {
              ...result.usage,
              economics: {
                initialProviderCostUsd: estimateApiCostUsd(usages[0]),
                groundingCostUsd: job.groundingCostUsd,
                validationCostUsd: 0,
                repairCostUsd: 0,
                repairTriggered: false,
              },
            }
          : result.usage,
      estimatedApiCostUsd:
        job.groundingCostUsd === null ||
        deps.validation?.providerTelemetry?.estimatedCostUsd === null ||
        usages.some((u) => estimateApiCostUsd(u) === null)
          ? null
          : usages.reduce((sum, u) => sum + (estimateApiCostUsd(u) ?? 0), 0) +
            (deps.validation?.providerTelemetry?.estimatedCostUsd ?? 0) +
            (job.groundingCostUsd ?? 0),
    });
    if (!succeeded) {
      return { outcome: "failed", errorCode: "timed_out" };
    }
  } catch (err) {
    const { errorCode, safeErrorMessage } = categorizeError(err);
    // Never let a failure in the failure path leave the reservation stuck:
    // mark-failed and refund are independent, best-effort steps.
    await data.markJobFailed(job.id, { errorCode, safeErrorMessage }).catch(() => {});
    await data
      .finalizeCredits(job.userId, 1, job.idempotencyKey, "refunded", job.id)
      .catch(() => {});
    return { outcome: "failed", errorCode };
  }

  // The job is terminally succeeded. Charge is best-effort here — poll GET
  // also calls settleSucceededJobCredits. A hung RPC must not keep /run
  // open, because local workerd serializes poll behind that request.
  await raceWithTimeout(
    data.finalizeCredits(job.userId, 1, job.idempotencyKey, "charged", job.id),
    CREDIT_CHARGE_BUDGET_MS,
    { availableCredits: 0 },
  ).catch(() => {});

  return { outcome: "succeeded", versionId };
}

/** Reused by the server-owned session coordinator after the request-wide budget claim. */
export async function executeTargetedRepair(
  job: GenerationJobRecord,
  currentImage: StoredImage,
  repair: import("./validation/repair.ts").RepairPlan,
  report: import("./validation/contract.ts").ValidationResult,
  apiKey: string,
  fetchImpl?: typeof fetch,
) {
  const localized =
    (repair.action === "remove_unwanted_text" || repair.action === "rerender_exact_text") &&
    job.referenceImages.length < 8;
  const prompt = `${localized ? "Image 1 is the generated source to correct. Original numbered reference images below are shifted by one position for this repair.\n\n" : ""}${job.prompt}\n\nTARGETED REPAIR\n${repairInstruction(repair, report)}`;
  const next =
    localized || job.operation === "edit"
      ? await editImage({
          model: job.model,
          prompt,
          width: job.width,
          height: job.height,
          apiKey: apiKey,
          fetchImpl: fetchImpl,
          referenceImages: localized ? [currentImage, ...job.referenceImages] : job.referenceImages,
          mask: localized ? null : (job.editMask ?? null),
        })
      : await generateImage({
          model: job.model,
          prompt,
          width: job.width,
          height: job.height,
          apiKey: apiKey,
          fetchImpl: fetchImpl,
        });

  return next;
}
