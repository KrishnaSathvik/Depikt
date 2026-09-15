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
      maskAssetId: null,
      maskPath: null,
      intent: c.fixture_intent,
      plan,
      exp: Date.now() + 60_000,
    },
    secret,
  );
  const got = verifyPlanToken(token, secret, "user-1");
  assert.equal(got.plan.mode, "series");
  assert.equal(got.maskAssetId, null);
  assert.equal(got.maskPath, null);
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
      maskAssetId: null,
      maskPath: null,
      intent: c.fixture_intent,
      plan,
      exp: Date.now() - 1,
    },
    secret,
  );
  assert.throws(() => verifyPlanToken(token, secret, "user-1"));
});

test("round-trips maskAssetId and maskPath on the signed plan token", () => {
  const c = loadVnext1Cases()[0]!;
  const plan = buildGenerationPlan(c.fixture_intent, c.prompt);
  const token = signPlanToken(
    {
      userId: "user-1",
      prompt: c.prompt,
      userInput: c.prompt,
      referenceAssetIds: [],
      sourceVersionId: "version-1",
      maskAssetId: "mask-1",
      maskPath: "users/user-1/masks/mask-1.png",
      intent: c.fixture_intent,
      plan,
      exp: Date.now() + 60_000,
    },
    secret,
  );
  const got = verifyPlanToken(token, secret, "user-1");
  assert.equal(got.maskAssetId, "mask-1");
  assert.equal(got.maskPath, "users/user-1/masks/mask-1.png");
  assert.equal(got.sourceVersionId, "version-1");
});

test("tampering with maskPath in the token fails verify", () => {
  const c = loadVnext1Cases()[0]!;
  const plan = buildGenerationPlan(c.fixture_intent, c.prompt);
  const token = signPlanToken(
    {
      userId: "user-1",
      prompt: c.prompt,
      userInput: c.prompt,
      referenceAssetIds: [],
      sourceVersionId: "version-1",
      maskAssetId: "mask-1",
      maskPath: "users/user-1/masks/mask-1.png",
      intent: c.fixture_intent,
      plan,
      exp: Date.now() + 60_000,
    },
    secret,
  );
  const dot = token.lastIndexOf(".");
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  payload.maskPath = "users/attacker/masks/evil.png";
  const tampered = `${Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")}.${mac}`;
  assert.throws(() => verifyPlanToken(tampered, secret, "user-1"));
});

test("another userId cannot verify a token that carries a mask", () => {
  const c = loadVnext1Cases()[0]!;
  const plan = buildGenerationPlan(c.fixture_intent, c.prompt);
  const token = signPlanToken(
    {
      userId: "user-1",
      prompt: c.prompt,
      userInput: c.prompt,
      referenceAssetIds: [],
      sourceVersionId: "version-1",
      maskAssetId: "mask-1",
      maskPath: "users/user-1/masks/mask-1.png",
      intent: c.fixture_intent,
      plan,
      exp: Date.now() + 60_000,
    },
    secret,
  );
  assert.throws(() => verifyPlanToken(token, secret, "user-2"));
});
