import { test } from "node:test";
import assert from "node:assert/strict";
import { signPlanToken, verifyPlanToken } from "../../src/lib/generation/plan-token.ts";
import { buildGenerationPlan } from "../../src/lib/generation/plan.ts";
import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";

const secret = "test-plan-secret";

test("round-trips a payload and rejects tampering", () => {
  const c = loadVnext1Cases().find((x) => x.id === "astrophotography")!;
  const plan = buildGenerationPlan(c.fixture_intent, c.prompt);
  const token = signPlanToken(
    {
      userId: "user-1",
      prompt: c.prompt,
      userInput: c.prompt,
      referenceAssetIds: [],
      sourceVersionId: null,
      intent: c.fixture_intent,
      plan,
      exp: Date.now() + 60_000,
    },
    secret,
  );
  const got = verifyPlanToken(token, secret, "user-1");
  assert.equal(got.plan.mode, "series");
  assert.throws(() => verifyPlanToken(token.slice(0, -2) + "ab", secret, "user-1"));
  assert.throws(() => verifyPlanToken(token, secret, "other-user"));
});

test("expired tokens fail", () => {
  const c = loadVnext1Cases()[0]!;
  const plan = buildGenerationPlan(c.fixture_intent, c.prompt);
  const token = signPlanToken(
    {
      userId: "user-1",
      prompt: c.prompt,
      userInput: c.prompt,
      referenceAssetIds: [],
      sourceVersionId: null,
      intent: c.fixture_intent,
      plan,
      exp: Date.now() - 1,
    },
    secret,
  );
  assert.throws(() => verifyPlanToken(token, secret, "user-1"));
});
