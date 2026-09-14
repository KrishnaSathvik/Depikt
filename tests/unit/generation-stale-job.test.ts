import assert from "node:assert/strict";
import test from "node:test";
import type { UntypedSupabaseClient } from "../../src/lib/generation/db-types.ts";
import { failAndRefundStaleJob, type StaleJob } from "../../src/lib/generation/stale-job.ts";

interface FakeOptions {
  updateData: { id: string } | null;
  updateError?: Error;
  liveStatus?: string;
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
                data: options.liveStatus ? { status: options.liveStatus } : null,
                error: null,
              },
      };
      return query;
    },
    rpc: async () => {
      refunds += 1;
      return { data: null, error: null };
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
};
const now = new Date("2026-09-14T12:07:00.000Z");

test("refunds once when the stale failure transition succeeds", async () => {
  const fake = createFakeSupabase({ updateData: { id: staleJob.id } });

  const result = await failAndRefundStaleJob(fake.client, staleJob, now);

  assert.deepEqual(result, { applied: true, status: "failed" });
  assert.equal(fake.refundCalls(), 1);
});

test("reports live success without refund when the stale failure loses the race", async () => {
  const fake = createFakeSupabase({ updateData: null, liveStatus: "succeeded" });

  const result = await failAndRefundStaleJob(fake.client, staleJob, now);

  assert.deepEqual(result, { applied: false, status: "succeeded" });
  assert.equal(fake.refundCalls(), 0);
});

test("does not refund or report failure when the conditional update errors", async () => {
  const fake = createFakeSupabase({
    updateData: null,
    updateError: new Error("database unavailable"),
  });

  const result = await failAndRefundStaleJob(fake.client, staleJob, now);

  assert.deepEqual(result, { applied: false, status: "running" });
  assert.equal(fake.refundCalls(), 0);
});
