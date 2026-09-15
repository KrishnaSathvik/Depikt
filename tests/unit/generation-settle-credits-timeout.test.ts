import { test } from "node:test";
import assert from "node:assert/strict";
import { CREDIT_CHARGE_BUDGET_MS } from "../../src/lib/generation/timeout.ts";
import { settleSucceededJobCredits } from "../../src/lib/generation/stale-job.ts";
import type { UntypedSupabaseClient } from "../../src/lib/generation/db-types.ts";

test("settleSucceededJobCredits returns when the charge RPC hangs", async () => {
  const client = {
    rpc: () => new Promise(() => {}),
  } as unknown as UntypedSupabaseClient;

  const started = Date.now();
  await settleSucceededJobCredits(
    client,
    {
      id: "job-1",
      user_id: "user-1",
      idempotency_key: "idem-1",
      status: "succeeded",
    },
    40,
  );
  assert.ok(Date.now() - started < 500);
});

test("CREDIT_CHARGE_BUDGET_MS is the /run and poll charge ceiling", () => {
  assert.equal(CREDIT_CHARGE_BUDGET_MS, 2_000);
});
