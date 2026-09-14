import assert from "node:assert/strict";
import test from "node:test";
import type { UntypedSupabaseClient } from "../../src/lib/generation/db-types.ts";
import {
  failAndRefundStaleJob,
  settleSucceededJobCredits,
  type StaleJob,
} from "../../src/lib/generation/stale-job.ts";

interface FakeOptions {
  updateData: { id: string } | null;
  updateError?: Error;
  liveJob?: {
    status: string;
    error_code: string | null;
    safe_error_message: string | null;
  };
  refundError?: Error;
  refundReject?: Error;
}

function createFakeSupabase(options: FakeOptions): {
  client: UntypedSupabaseClient;
  refundCalls: () => number;
} {
  let refunds = 0;

  const client = {
    from: () => {
      let updating = false;
      const query = {
        update: () => {
          updating = true;
          return query;
        },
        select: () => query,
        eq: () => query,
        in: () => query,
        maybeSingle: async () =>
          updating
            ? { data: options.updateData, error: options.updateError ?? null }
            : {
                data: options.liveJob ?? null,
                error: null,
              },
      };
      return query;
    },
    rpc: async () => {
      refunds += 1;
      if (options.refundReject) throw options.refundReject;
      return { data: null, error: options.refundError ?? null };
    },
  } as unknown as UntypedSupabaseClient;

  return { client, refundCalls: () => refunds };
}

const staleJob: StaleJob = {
  id: "job-1",
  user_id: "user-1",
  idempotency_key: "series:0",
  status: "running",
  created_at: "2026-09-14T12:00:00.000Z",
  error_code: null,
  safe_error_message: null,
};
const now = new Date("2026-09-14T12:07:00.000Z");

test("settles a succeeded job as charged", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data: null, error: null };
    },
  } as unknown as UntypedSupabaseClient;

  await settleSucceededJobCredits(client, { ...staleJob, status: "succeeded" });

  assert.deepEqual(calls, [
    {
      name: "finalize_generation_credits",
      args: {
        p_user_id: "user-1",
        p_amount: 1,
        p_idempotency_key: "series:0",
        p_outcome: "charged",
        p_job_id: "job-1",
      },
    },
  ]);
});

test("swallows charge settlement RPC errors", async () => {
  const client = {
    rpc: async () => ({ data: null, error: new Error("charge unavailable") }),
  } as unknown as UntypedSupabaseClient;

  await assert.doesNotReject(() =>
    settleSucceededJobCredits(client, { ...staleJob, status: "succeeded" }),
  );
});

test("refunds once when the stale failure transition succeeds", async () => {
  const fake = createFakeSupabase({ updateData: { id: staleJob.id } });

  const result = await failAndRefundStaleJob(fake.client, staleJob, now);

  assert.deepEqual(result, {
    applied: true,
    status: "failed",
    safe_error_message: "Generation timed out. Your credit was returned.",
  });
  assert.equal(fake.refundCalls(), 1);
});

test("reports live success without refund when the stale failure loses the race", async () => {
  const fake = createFakeSupabase({
    updateData: null,
    liveJob: { status: "succeeded", error_code: null, safe_error_message: null },
  });

  const result = await failAndRefundStaleJob(fake.client, staleJob, now);

  assert.deepEqual(result, {
    applied: false,
    status: "succeeded",
    safe_error_message: null,
  });
  assert.equal(fake.refundCalls(), 0);
});

test("retries refund when another poll already stale-failed the job", async () => {
  const fake = createFakeSupabase({
    updateData: null,
    liveJob: {
      status: "failed",
      error_code: "timed_out",
      safe_error_message: "Generation timed out. Your credit was returned.",
    },
  });

  const result = await failAndRefundStaleJob(fake.client, staleJob, now);

  assert.equal(result.status, "failed");
  assert.equal(result.safe_error_message, "Generation timed out. Your credit was returned.");
  assert.equal(fake.refundCalls(), 1);
});

test("retries refund from an already terminal timed-out snapshot", async () => {
  const fake = createFakeSupabase({ updateData: null });
  const result = await failAndRefundStaleJob(fake.client, {
    ...staleJob,
    status: "failed",
    error_code: "timed_out",
    safe_error_message: "timeout copy",
  });

  assert.deepEqual(result, {
    applied: false,
    status: "failed",
    safe_error_message: "timeout copy",
  });
  assert.equal(fake.refundCalls(), 1);
});

test("still reports an applied timeout when refund RPC returns an error", async () => {
  const fake = createFakeSupabase({
    updateData: { id: staleJob.id },
    refundError: new Error("refund unavailable"),
  });

  const result = await failAndRefundStaleJob(fake.client, staleJob, now);

  assert.equal(result.applied, true);
  assert.equal(result.status, "failed");
  assert.equal(fake.refundCalls(), 1);
});

test("still reports an applied timeout when refund RPC rejects", async () => {
  const fake = createFakeSupabase({
    updateData: { id: staleJob.id },
    refundReject: new Error("network unavailable"),
  });

  const result = await failAndRefundStaleJob(fake.client, staleJob, now);

  assert.equal(result.applied, true);
  assert.equal(result.status, "failed");
  assert.equal(fake.refundCalls(), 1);
});

test("does not refund or report failure when the conditional update errors", async () => {
  const fake = createFakeSupabase({
    updateData: null,
    updateError: new Error("database unavailable"),
  });

  const result = await failAndRefundStaleJob(fake.client, staleJob, now);

  assert.deepEqual(result, {
    applied: false,
    status: "running",
    safe_error_message: null,
  });
  assert.equal(fake.refundCalls(), 0);
});
