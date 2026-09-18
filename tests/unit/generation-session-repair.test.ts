import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { refineGenerationSession } from "../../src/lib/generation/validation/session-repair.ts";
import { signAssessment } from "../../src/lib/generation/validation/assessment.ts";
import {
  signValidationPlan,
  type ValidationResult,
} from "../../src/lib/generation/validation/contract.ts";
import { authorizeExecution } from "../../src/lib/generation/execution-auth.ts";
import { buildExecutionPlanJson } from "../../src/lib/generation/execution-plan.ts";
import { buildGenerationPlan } from "../../src/lib/generation/plan.ts";
import { encodeRgbaPng } from "../../src/lib/generation/png-mask.ts";
import type { UntypedSupabaseClient } from "../../src/lib/generation/db-types.ts";

// The in-memory query adapter deliberately mirrors the dynamic Supabase rows.
/* eslint-disable @typescript-eslint/no-explicit-any */
function fixture(providerFails = false) {
  const env = {
    VALIDATION_REPAIR_ENABLED: "true",
    AUTO_REPAIR_POLICY: "platform_absorbs_one_per_request",
    VALIDATION_PROVIDER_URL: "https://example.com/validate",
    VALIDATION_PROVIDER_TOKEN: "fixture",
  };
  const userId = "u",
    sessionId = "s",
    secret = "fixture-secret";
  const report = (kind: "exact_text" | "object_count"): ValidationResult => ({
    verdict: "repairable",
    checks: [
      {
        id: kind,
        kind,
        target: "subject",
        expectedText: kind === "exact_text" ? ["HELLO"] : undefined,
        expectedCount: kind === "object_count" ? 3 : undefined,
        status: "fail",
        confidence: 0.99,
        evidence: "fixture",
        method: kind === "exact_text" ? "ocr" : "visual_judge",
      },
    ],
  });
  const reports = [report("object_count"), report("exact_text")];
  const rows = reports.map((r, i) => ({
    id: `j${i}`,
    user_id: userId,
    session_id: sessionId,
    status: "succeeded",
    operation: "generate",
    model: "flare",
    width: 1,
    height: 1,
    prompt: "fixture",
    idempotency_key: `k${i}`,
    source_version_id: null,
    repair_attempts: 0,
    estimated_api_cost_usd: 0.01,
    usage_json: {
      validation: { refinementPending: true },
      economics: { initialProviderCostUsd: 0.01 },
    },
    validation_result: { snapshot: signAssessment(r, userId, sessionId, `j${i}`, secret) },
  }));
  const plan = buildExecutionPlanJson({
    plan: buildGenerationPlan(loadVnext1Cases()[0]!.fixture_intent, "fixture"),
    selectedCount: 2,
    referenceAssetIds: [],
    sourceVersionId: null,
    maskAssetId: null,
    maskPath: null,
    children: rows.map((r) => ({ label: null, prompt: r.prompt })),
    validation: Object.fromEntries(
      reports.map((r, i) => [
        `k${i}`,
        signValidationPlan(
          {
            expectedSeriesCount: 2,
            checks: r.checks.map(({ id, kind, target, expectedText, expectedCount }) => ({
              id,
              kind,
              target,
              expectedText,
              expectedCount,
            })),
          },
          userId,
          secret,
        ),
      ]),
    ),
  });
  const signedPlan = {
    ...plan,
    executionAuthorization: authorizeExecution(plan, {
      userId,
      secret,
      operation: "generate",
      width: 1,
      height: 1,
      children: rows.map((r) => ({ key: r.idempotency_key, prompt: r.prompt })),
    }),
  };
  const versions: any[] = rows.map((r) => ({
    id: `v-${r.id}`,
    job_id: r.id,
    user_id: userId,
    storage_path: `original-${r.id}`,
  }));
  const ledgers: any[] = [];
  const tables: Record<string, any[]> = {
    generation_jobs: rows,
    generation_sessions: [{ id: sessionId, user_id: userId, plan_json: signedPlan }],
    generation_request_repairs: ledgers,
    image_versions: versions,
  };
  const rpcCalls: string[] = [];
  let imageCalls = 0,
    validationCalls = 0,
    uploads = 0;
  const png = encodeRgbaPng(new Uint8Array([1, 2, 3, 255]), 1, 1);
  const db = {
    from(table: string) {
      const filters: Array<[string, unknown]> = [];
      let patch: any,
        inserted: any,
        single = false,
        limit = Infinity;
      const query = {
        select() {
          return query;
        },
        eq(k: string, v: unknown) {
          filters.push([k, v]);
          return query;
        },
        update(value: unknown) {
          patch = value;
          return query;
        },
        insert(value: unknown) {
          inserted = value;
          return query;
        },
        maybeSingle() {
          single = true;
          return query;
        },
        single() {
          single = true;
          return query;
        },
        order() {
          return query;
        },
        limit(n: number) {
          limit = n;
          return query;
        },
        then(resolve: (value: unknown) => unknown) {
          if (inserted) {
            const row = { id: "repaired-version", ...inserted };
            tables[table].push(row);
            return Promise.resolve(resolve({ data: row, error: null }));
          }
          const selected = tables[table]
            .filter((r) => filters.every(([k, v]) => r[k] === v))
            .slice(0, limit);
          if (patch) selected.forEach((r) => Object.assign(r, patch));
          return Promise.resolve(
            resolve({ data: single ? (selected[0] ?? null) : selected, error: null }),
          );
        },
      };
      return query;
    },
    async rpc(name: string, args: any) {
      rpcCalls.push(name);
      if (name === "claim_generation_request_repair") {
        if (ledgers.length) return { data: false, error: null };
        ledgers.push({
          session_id: sessionId,
          user_id: userId,
          job_id: args.p_job_id,
          state: args.p_job_id ? "running" : "complete",
          started_at: new Date().toISOString(),
        });
        if (args.p_job_id) rows.find((r) => r.id === args.p_job_id)!.repair_attempts = 1;
        return { data: true, error: null };
      }
      if (name === "finish_generation_request_repair") {
        Object.assign(ledgers[0], { state: "complete", outcome: args.p_outcome });
        return { error: null };
      }
      throw new Error(`Unexpected credit or other RPC: ${name}`);
    },
    storage: {
      from: () => ({
        download: async () => ({
          data: new Blob([new Uint8Array(png)], { type: "image/png" }),
          error: null,
        }),
        upload: async () => {
          uploads++;
          return { error: null };
        },
      }),
    },
  } as unknown as UntypedSupabaseClient;
  const fetchImpl: typeof fetch = async (url) => {
    if (String(url) === "https://example.com/validate") {
      validationCalls++;
      return new Response(JSON.stringify({ text: "HELLO", confidence: 0.99 }));
    }
    imageCalls++;
    return providerFails
      ? new Response("failed", { status: 500 })
      : new Response(
          JSON.stringify({
            data: [{ b64_json: Buffer.from(png).toString("base64") }],
            usage: { output_tokens: 10 },
          }),
        );
  };
  return {
    args: { db, userId, sessionId, secret, apiKey: "offline-fixture", env, fetchImpl },
    rows,
    ledgers,
    versions,
    rpcCalls,
    counts: () => ({ imageCalls, validationCalls, uploads }),
  };
}

test("coordinator waits for all initial children and disabled features spend nothing", async () => {
  const f = fixture();
  await refineGenerationSession({ ...f.args, env: {} });
  assert.deepEqual(f.rpcCalls, []);
  f.rows[0].status = "running";
  await refineGenerationSession(f.args);
  assert.deepEqual(f.rpcCalls, []);
  assert.equal(f.counts().imageCalls, 0);
});

test("concurrent coordinator calls repair only the higher-priority child, without credit RPCs", async () => {
  const f = fixture();
  await Promise.all([refineGenerationSession(f.args), refineGenerationSession(f.args)]);
  await refineGenerationSession(f.args);
  assert.deepEqual(f.counts(), { imageCalls: 1, validationCalls: 1, uploads: 1 });
  assert.equal(f.ledgers[0].job_id, "j1");
  assert.equal(f.ledgers[0].outcome, "improved");
  assert.equal(f.versions.length, 3);
  assert.ok(
    f.rows.every((r) => r.status === "succeeded" && !r.usage_json.validation.refinementPending),
  );
  assert.ok(
    f.rpcCalls.every((n) =>
      ["claim_generation_request_repair", "finish_generation_request_repair"].includes(n),
    ),
  );
});

test("failed free provider repair preserves original versions and never refunds or retries", async () => {
  const f = fixture(true);
  await refineGenerationSession(f.args);
  await refineGenerationSession(f.args);
  assert.deepEqual(f.counts(), { imageCalls: 1, validationCalls: 0, uploads: 0 });
  assert.equal(f.versions.length, 2);
  assert.equal(f.ledgers[0].outcome, "provider_failed");
  assert.ok(f.rows.every((r) => r.status === "succeeded"));
});

test("tampered assessment cannot spend the free repair budget", async () => {
  const f = fixture();
  for (const row of f.rows) row.validation_result.snapshot = "forged";
  await refineGenerationSession(f.args);
  assert.equal(f.counts().imageCalls, 0);
  assert.equal(f.ledgers[0].job_id, null);
});
