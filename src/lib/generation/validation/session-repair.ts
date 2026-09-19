import type { UntypedSupabaseClient } from "../db-types.ts";
import { automaticRepairEnabled, INCLUDED_REPAIR_POLICY } from "../economic-policy.ts";
import { executeTargetedRepair, type GenerationJobRecord } from "../job-pipeline.ts";
import { createSupabaseDataAccess } from "../supabase-data-access.ts";
import { verifyAssessment } from "./assessment.ts";
import { selectRepairCandidate, type RepairCandidate } from "./repair.ts";
import { verifyValidationPlan } from "./contract.ts";
import { loadRepairInputs } from "./execution-inputs.ts";
import { createValidationProviders } from "./providers.ts";
import { validateAndRepair } from "./runtime.ts";
import { estimateApiCostUsd, type OpenAIImageUsage } from "../openai-images.ts";

/** Runs only after every initial child is terminal; a durable session claim chooses exactly one. */
export async function refineGenerationSession(args: {
  db: UntypedSupabaseClient;
  userId: string;
  sessionId: string;
  apiKey: string;
  secret: string;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  if (!automaticRepairEnabled(args.env)) return;
  const { db, userId, sessionId, secret } = args;
  const [{ data: session, error: sessionError }, { data: rows, error: jobsError }] =
    await Promise.all([
      db
        .from("generation_sessions")
        .select("plan_json")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .maybeSingle(),
      db.from("generation_jobs").select("*").eq("session_id", sessionId).eq("user_id", userId),
    ]);
  if (
    sessionError ||
    jobsError ||
    !session ||
    !rows?.length ||
    rows.some((j) => !["succeeded", "failed", "cancelled"].includes(j.status))
  )
    return;
  if (!session.plan_json?.validation) return;
  const pending = rows.some((j) => j.usage_json?.validation?.refinementPending === true);
  if (!pending) return;
  const clearPending = async () => {
    // Reload to preserve the selected job's completed repair telemetry.
    const { data: fresh, error } = await db
      .from("generation_jobs")
      .select("id,usage_json")
      .eq("session_id", sessionId)
      .eq("user_id", userId);
    if (error) throw error;
    for (const row of fresh ?? [])
      if (row.usage_json?.validation?.refinementPending) {
        const { error: writeError } = await db
          .from("generation_jobs")
          .update({
            usage_json: {
              ...row.usage_json,
              validation: { ...row.usage_json.validation, refinementPending: false },
            },
          })
          .eq("id", row.id)
          .eq("user_id", userId);
        if (writeError) throw writeError;
      }
  };
  const { data: existing, error: budgetError } = await db
    .from("generation_request_repairs")
    .select("state,started_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (budgetError) throw budgetError;
  if (existing) {
    if (
      existing.state === "running" &&
      Date.now() - Date.parse(existing.started_at) > 6 * 60 * 1000
    ) {
      const { error } = await db.rpc("finish_generation_request_repair", {
        p_session_id: sessionId,
        p_outcome: "interrupted",
      });
      if (error) throw error;
      await clearPending();
    } else if (existing.state === "complete") await clearPending();
    return;
  }
  const candidates: RepairCandidate[] = [];
  for (const row of rows) {
    if (row.status !== "succeeded") continue;
    try {
      const result = verifyAssessment(
        row.validation_result?.snapshot,
        userId,
        sessionId,
        row.id,
        secret,
      );
      candidates.push({
        jobId: row.id,
        result,
        hasMask: !!session.plan_json.maskPath,
        hasReferences: !!(
          session.plan_json.referenceAssetIds?.length ||
          session.plan_json.entities?.length ||
          session.plan_json.sourceVersionId ||
          session.plan_json.grounding?.bundle.visualReferences.length
        ),
      });
    } catch {
      /* Missing or tampered evidence cannot spend the included allowance. */
    }
  }
  const chosen = selectRepairCandidate(candidates);
  const { data: claimed, error: claimError } = await db.rpc("claim_generation_request_repair", {
    p_session_id: sessionId,
    p_job_id: chosen?.jobId ?? null,
  });
  if (claimError) throw claimError;
  if (!claimed) return;
  if (!chosen) {
    await clearPending();
    return;
  }
  const row = rows.find((j) => j.id === chosen.jobId)!;
  let outcome = "provider_failed";
  let repairUsage: OpenAIImageUsage | undefined;
  let repairAttempted = false;
  const providers = createValidationProviders(args.env, args.fetchImpl);
  let report = chosen.result;
  let selected = "original";
  try {
    const job: GenerationJobRecord = {
      id: row.id,
      userId,
      sessionId,
      operation: row.operation,
      model: row.model,
      prompt: row.prompt,
      width: row.width,
      height: row.height,
      idempotencyKey: row.idempotency_key,
      referenceImages: [],
    };
    const inputs = await loadRepairInputs(
      db,
      job,
      row.source_version_id ?? null,
      session.plan_json,
      secret,
      args.env,
      args.fetchImpl,
    );
    job.referenceImages = inputs.referenceImages;
    job.editMask = inputs.editMask;
    const { data: versions, error: versionError } = await db
      .from("image_versions")
      .select("id,storage_path")
      .eq("job_id", job.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (versionError || !versions?.[0]) throw new Error("Original output unavailable");
    const original = await inputs.download(versions[0].storage_path);
    if (!original) throw new Error("Original output unavailable");
    const plan = verifyValidationPlan(
      session.plan_json.validation[job.idempotencyKey],
      userId,
      secret,
    );
    const result = await validateAndRepair(
      { image: original },
      {
        plan,
        initialResult: chosen.result,
        providerTelemetry: providers.telemetry,
        context: {
          width: job.width,
          height: job.height,
          seriesCount: rows.length,
          references: inputs.referenceImages,
          source: inputs.source,
          mask: inputs.editMask,
          entityIds: inputs.entityIds,
          referenceBindings: inputs.referenceBindings,
          ...providers,
        },
        repairPolicy: INCLUDED_REPAIR_POLICY,
        claimRepair: async () => true,
        save: async () => {},
      },
      async (repair, validation, current) => {
        repairAttempted = true;
        const generated = await executeTargetedRepair(
          job,
          current.image,
          repair,
          validation,
          args.apiKey,
          args.fetchImpl,
        );
        repairUsage = generated.usage;
        return {
          image: {
            bytes: Uint8Array.from(atob(generated.b64), (c) => c.charCodeAt(0)),
            mimeType: "image/png",
            filename: "repair.png",
          },
        };
      },
    );
    outcome = result.repairOutcome === "not_attempted" ? "not_improved" : result.repairOutcome;
    report = result.result;
    selected = result.selected;
    if (result.selected === "repair") {
      const data = createSupabaseDataAccess(db);
      const versionId = data.newVersionId();
      const path = data.buildStoragePath(userId, sessionId, versionId);
      await data.uploadImage(path, result.output.image.bytes, "image/png");
      await data.insertImageVersion({
        userId,
        sessionId,
        jobId: job.id,
        parentVersionId: versions[0].id,
        storagePath: path,
        mimeType: "image/png",
        width: job.width,
        height: job.height,
        prompt: job.prompt,
        model: job.model,
      });
    }
  } catch {
    outcome = "provider_failed";
    selected = "original";
    report = chosen.result;
  }
  // No reserve/refund/finalize-credit call occurs on this path. The initial image remains charged once.
  let telemetryError: unknown;
  try {
    const economics = {
      ...row.usage_json?.economics,
      repairTriggered: true,
      repairSucceeded: outcome === "improved",
      repairOutcome: outcome,
      repairCostUsd: repairAttempted ? estimateApiCostUsd(repairUsage) : 0,
      repairValidationCostUsd: providers.telemetry.estimatedCostUsd,
    };
    const { error } = await db
      .from("generation_jobs")
      .update({
        estimated_api_cost_usd:
          row.estimated_api_cost_usd == null ||
          economics.repairCostUsd == null ||
          economics.repairValidationCostUsd == null
            ? null
            : Number(row.estimated_api_cost_usd) +
              economics.repairCostUsd +
              economics.repairValidationCostUsd,
        usage_json: {
          ...row.usage_json,
          economics,
          repairUsage: repairUsage ?? null,
          validation: {
            ...report,
            repairAttempts: 1,
            repairOutcome: outcome,
            selected,
            warning: report.verdict !== "pass",
            refinementPending: false,
          },
        },
      })
      .eq("id", row.id)
      .eq("user_id", userId)
      .eq("status", "succeeded");
    if (error) throw error;
  } catch (error) {
    telemetryError = error;
  }
  const { error } = await db.rpc("finish_generation_request_repair", {
    p_session_id: sessionId,
    p_outcome: outcome,
  });
  if (error) throw error;
  await clearPending();
  if (telemetryError) throw telemetryError;
}
