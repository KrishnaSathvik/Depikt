import assert from "node:assert/strict";
import test from "node:test";
import type { UntypedSupabaseClient } from "../../src/lib/generation/db-types.ts";
import { transitionJob, saveJobValidation } from "../../src/lib/generation/job-transition.ts";

function rpcClient(
  handler: (name: string, args: Record<string, unknown>) => { data: unknown; error: unknown },
): {
  client: UntypedSupabaseClient;
  calls: Array<{ name: string; args: Record<string, unknown> }>;
} {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return handler(name, args);
    },
  } as unknown as UntypedSupabaseClient;
  return { client, calls };
}

test("transitionJob names only the job, target status and allowlisted patch", async () => {
  const { client, calls } = rpcClient(() => ({ data: true, error: null }));

  const applied = await transitionJob(client, "job-1", "succeeded", {
    usage: { tokens: 1 },
    estimatedApiCostUsd: 0.04,
    openaiRequestId: "req_1",
  });

  assert.equal(applied, true);
  assert.deepEqual(calls, [
    {
      name: "transition_generation_job",
      args: {
        p_job_id: "job-1",
        p_to_status: "succeeded",
        p_patch: {
          usage_json: { tokens: 1 },
          estimated_api_cost_usd: 0.04,
          openai_request_id: "req_1",
        },
        p_execution_token: null,
      },
    },
  ]);
});

test("transitionJob passes the execution token through when given one", async () => {
  const { client, calls } = rpcClient(() => ({ data: true, error: null }));
  await transitionJob(client, "job-1", "failed", {
    errorCode: "provider_error",
    safeErrorMessage: "x",
  }, "token-abc");
  assert.equal(calls[0].args.p_execution_token, "token-abc");
});

test("transitionJob returns false when the database refuses the transition", async () => {
  const { client } = rpcClient(() => ({ data: false, error: null }));
  assert.equal(await transitionJob(client, "job-1", "running"), false);
});

test("transitionJob rethrows database refusals instead of falling back", async () => {
  const { client, calls } = rpcClient(() => ({
    data: null,
    error: { code: "P0001", message: "invalid transition" },
  }));
  await assert.rejects(() =>
    transitionJob(client, "job-1", "failed", {
      errorCode: "unknown",
      safeErrorMessage: "x",
    }),
  );
  assert.equal(calls.length, 1);
});

test("transitionJob falls back to the legacy conditional update only while the function is missing", async () => {
  const updates: Array<Record<string, unknown>> = [];
  const client = {
    rpc: async () => ({ data: null, error: { code: "PGRST202" } }),
    from: () => {
      const query: Record<string, unknown> = {};
      query.update = (patch: Record<string, unknown>) => {
        updates.push(patch);
        return query;
      };
      query.eq = () => query;
      query.in = () => query;
      query.select = () => query;
      query.maybeSingle = async () => ({ data: { id: "job-1" }, error: null });
      return query;
    },
  } as unknown as UntypedSupabaseClient;

  const applied = await transitionJob(client, "job-1", "failed", {
    errorCode: "timed_out",
    safeErrorMessage: "timeout",
  });

  assert.equal(applied, true);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].status, "failed");
  assert.equal(updates[0].error_code, "timed_out");
});

test("saveJobValidation writes through the RPC and refuses a false result", async () => {
  const { client, calls } = rpcClient(() => ({ data: false, error: null }));
  await assert.rejects(
    () => saveJobValidation(client, "job-1", "user-1", { snapshot: 1 }, { verdict: "pass" }),
    /Could not save validation result/,
  );
  assert.equal(calls[0].name, "save_generation_job_validation");
});

test("saveJobValidation falls back to the legacy update while the function is missing", async () => {
  const updates: Array<Record<string, unknown>> = [];
  const client = {
    rpc: async () => ({ data: null, error: { code: "42883" } }),
    from: () => {
      const query: Record<string, unknown> = {};
      query.update = (patch: Record<string, unknown>) => {
        updates.push(patch);
        return query;
      };
      query.eq = () => query;
      query.select = () => query;
      query.maybeSingle = async () => ({ data: { id: "job-1" }, error: null });
      return query;
    },
  } as unknown as UntypedSupabaseClient;

  await saveJobValidation(client, "job-1", "user-1", { snapshot: 1 }, { verdict: "pass" });

  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].validation_result, { snapshot: 1 });
});
