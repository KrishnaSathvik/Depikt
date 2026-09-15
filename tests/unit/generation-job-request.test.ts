import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  validateCreatePlanBody,
  validateCreateJobsFromPlanBody,
  MAX_PROMPT_CHARS,
} from "../../src/lib/generation/job-request.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

// ---------- POST /api/generation/plans ----------

test("plans: accepts a minimal valid request", () => {
  const r = validateCreatePlanBody({
    prompt: "a poster of a mountain at dawn",
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.request.prompt, "a poster of a mountain at dawn");
    assert.equal(r.request.userInput, null);
    assert.equal(r.request.intent, null);
    assert.deepEqual(r.request.referenceAssetIds, []);
    assert.equal(r.request.sourceContextType, "direct");
    assert.equal(r.request.sourceContextId, null);
    assert.equal(r.request.sourceVersionId, null);
    assert.equal(r.request.structuredAspectRatio, null);
  }
});

test("plans: rejects a non-object body", () => {
  assert.equal(validateCreatePlanBody(null).ok, false);
  assert.equal(validateCreatePlanBody("nope").ok, false);
  assert.equal(validateCreatePlanBody(42).ok, false);
});

test("plans: rejects a missing prompt", () => {
  assert.equal(validateCreatePlanBody({}).ok, false);
  assert.equal(validateCreatePlanBody({ prompt: "  " }).ok, false);
});

test("plans: rejects an over-long prompt", () => {
  const r = validateCreatePlanBody({ prompt: "a".repeat(MAX_PROMPT_CHARS + 1) });
  assert.equal(r.ok, false);
});

test("plans: carries an explicit userInput separate from the final prompt", () => {
  const r = validateCreatePlanBody({
    prompt: "PAGE 1: a red bottle\nPAGE 2: a blue bottle",
    userInput: "make a series of colored bottles",
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.request.userInput, "make a series of colored bottles");
});

test("plans: accepts a pre-computed intent object, unvalidated at this layer", () => {
  const r = validateCreatePlanBody({ prompt: "x", intent: { task: "create" } });
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.request.intent, { task: "create" });
});

test("plans: rejects a non-object intent", () => {
  const r = validateCreatePlanBody({ prompt: "x", intent: "create" });
  assert.equal(r.ok, false);
});

test("plans: rejects more than the V1 reference-image limit", () => {
  const r = validateCreatePlanBody({
    prompt: "x",
    referenceAssetIds: ["a", "b", "c", "d", "e"],
  });
  assert.equal(r.ok, false);
});

test("plans: accepts a known sourceContext and carries its id through", () => {
  const r = validateCreatePlanBody({
    prompt: "x",
    sourceContext: { type: "library", id: "curated-42" },
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.request.sourceContextType, "library");
    assert.equal(r.request.sourceContextId, "curated-42");
  }
});

test("plans: rejects an invalid sourceContext.type", () => {
  const r = validateCreatePlanBody({ prompt: "x", sourceContext: { type: "chat" } });
  assert.equal(r.ok, false);
});

test("plans: structuredAspectRatio passes through unvalidated (resolved later, at job-creation size time)", () => {
  const r = validateCreatePlanBody({ prompt: "x", structuredAspectRatio: "4:5" });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.request.structuredAspectRatio, "4:5");
});

test("plans: defaults maskAssetId to null when omitted", () => {
  const r = validateCreatePlanBody({ prompt: "x" });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.request.maskAssetId, null);
});

test("plans: rejects maskAssetId without sourceVersionId", () => {
  const r = validateCreatePlanBody({ prompt: "x", maskAssetId: "mask-1" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /sourceVersionId/);
});

test("plans: rejects a client-supplied maskPath", () => {
  const r = validateCreatePlanBody({
    prompt: "x",
    sourceVersionId: "version-1",
    maskAssetId: "mask-1",
    maskPath: "users/attacker/masks/x.png",
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /path/i);
});

test("plans: rejects a client-supplied mask raw path", () => {
  const r = validateCreatePlanBody({
    prompt: "x",
    sourceVersionId: "version-1",
    mask: "users/attacker/masks/x.png",
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /path/i);
});

test("plans: accepts maskAssetId together with sourceVersionId", () => {
  const r = validateCreatePlanBody({
    prompt: "x",
    sourceVersionId: "version-1",
    maskAssetId: "mask-1",
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.request.maskAssetId, "mask-1");
    assert.equal(r.request.sourceVersionId, "version-1");
  }
});

// ---------- POST /api/generation/jobs ----------

test("jobs: accepts only planToken + idempotencyKey", () => {
  const r = validateCreateJobsFromPlanBody({
    planToken: "abc.def",
    idempotencyKey: "idem-1",
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.request.planToken, "abc.def");
    assert.equal(r.request.idempotencyKey, "idem-1");
    assert.equal(r.request.selectedCount, null);
    assert.equal(r.request.sourceContextType, "direct");
  }
});

test("jobs: rejects a non-object body", () => {
  assert.equal(validateCreateJobsFromPlanBody(null).ok, false);
  assert.equal(validateCreateJobsFromPlanBody("nope").ok, false);
});

test("jobs: rejects a missing or empty planToken", () => {
  assert.equal(validateCreateJobsFromPlanBody({ idempotencyKey: "k" }).ok, false);
  assert.equal(validateCreateJobsFromPlanBody({ planToken: "  ", idempotencyKey: "k" }).ok, false);
});

test("jobs: rejects a missing idempotencyKey", () => {
  assert.equal(validateCreateJobsFromPlanBody({ planToken: "abc.def" }).ok, false);
});

test("jobs: rejects a raw plan object -- the browser must never assemble an executable plan", () => {
  const r = validateCreateJobsFromPlanBody({
    planToken: "abc.def",
    idempotencyKey: "k",
    plan: { mode: "series", desiredCount: 4 },
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /plan/);
});

test("jobs: rejects a client-supplied count", () => {
  const r = validateCreateJobsFromPlanBody({
    planToken: "abc.def",
    idempotencyKey: "k",
    count: 4,
  });
  assert.equal(r.ok, false);
});

test("jobs: rejects client-supplied children (per-image briefs)", () => {
  const r = validateCreateJobsFromPlanBody({
    planToken: "abc.def",
    idempotencyKey: "k",
    children: [{ prompt: "a" }, { prompt: "b" }],
  });
  assert.equal(r.ok, false);
});

test("jobs: rejects a leftover prompt field", () => {
  const r = validateCreateJobsFromPlanBody({
    planToken: "abc.def",
    idempotencyKey: "k",
    prompt: "a poster of a mountain",
  });
  assert.equal(r.ok, false);
});

test("jobs: rejects a client-supplied operation or mode", () => {
  assert.equal(
    validateCreateJobsFromPlanBody({
      planToken: "abc.def",
      idempotencyKey: "k",
      operation: "edit",
    }).ok,
    false,
  );
  assert.equal(
    validateCreateJobsFromPlanBody({ planToken: "abc.def", idempotencyKey: "k", mode: "series" })
      .ok,
    false,
  );
});

test("jobs: accepts a numeric selectedCount (series-count confirmation)", () => {
  const r = validateCreateJobsFromPlanBody({
    planToken: "abc.def",
    idempotencyKey: "k",
    selectedCount: 4,
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.request.selectedCount, 4);
});

test("jobs: rejects a non-numeric selectedCount", () => {
  const r = validateCreateJobsFromPlanBody({
    planToken: "abc.def",
    idempotencyKey: "k",
    selectedCount: "4",
  });
  assert.equal(r.ok, false);
});

test("jobs: carries structuredAspectRatio and sourceContext through, same shape as before", () => {
  const r = validateCreateJobsFromPlanBody({
    planToken: "abc.def",
    idempotencyKey: "k",
    structuredAspectRatio: "16:9",
    sourceContext: { type: "prompt_build", id: "history-9" },
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.request.structuredAspectRatio, "16:9");
    assert.equal(r.request.sourceContextType, "prompt_build");
    assert.equal(r.request.sourceContextId, "history-9");
  }
});

test("jobs: rejects an invalid sourceContext.type", () => {
  const r = validateCreateJobsFromPlanBody({
    planToken: "abc.def",
    idempotencyKey: "k",
    sourceContext: { type: "chat" },
  });
  assert.equal(r.ok, false);
});

test("plans.ts derives maskPath from maskAssetStoragePath and never reads maskPath from the body", () => {
  const src = read("src/routes/api/generation/plans.ts");
  assert.match(src, /maskAssetStoragePath\(userId,/);
  assert.match(src, /validateMaskPng\(/);
  assert.match(src, /\.from\("image_versions"\)/);
  assert.doesNotMatch(src, /req\.maskPath|body\.maskPath/);
  assert.doesNotMatch(src, /maskPath:\s*req\./);
});

test("IntentSchema has no mask field", () => {
  const src = read("src/lib/prompt-engine/intent.ts");
  const start = src.indexOf("export const IntentSchema");
  assert.ok(start >= 0, "IntentSchema is exported");
  const typeStart = src.indexOf("export type Intent", start);
  const schema = typeStart === -1 ? src.slice(start) : src.slice(start, typeStart);
  assert.doesNotMatch(schema, /mask/i);
});
