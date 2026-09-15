// VNext 2K/2L — edit chaining + mask security invariants that span slices.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveGenerationModel } from "../../src/lib/generation/model-router.ts";
import { loadVnext2Cases } from "../image-evals/vnext-2/load-cases.ts";
import { validateCreatePlanBody } from "../../src/lib/generation/job-request.ts";
import { IntentSchema } from "../../src/lib/prompt-engine/intent.ts";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("precision edits parent the new version on sourceVersionId", () => {
  const pipeline = read("src/lib/generation/job-pipeline.ts");
  assert.match(pipeline, /parentVersionId:\s*sourceVersionId/);
  const hook = read("src/lib/generation/use-generation.ts");
  const apply = hook.slice(hook.indexOf("async function applyEdit("), hook.indexOf("function download()"));
  assert.match(apply, /sourceVersionId/);
  assert.match(apply, /activeVersionId/);
});

test("masked vnext-2 cases route to sunburst via hasMask, not case ids", () => {
  const src = read("src/lib/generation/model-router.ts");
  for (const c of loadVnext2Cases()) {
    assert.equal(src.includes(c.id), false, c.id);
    if (!c.has_mask) continue;
    assert.equal(
      resolveGenerationModel({
        operation: "edit",
        promptText: "make it warmer",
        referenceCount: 1,
        hasMask: true,
      }),
      "sunburst",
    );
  }
  assert.equal(
    resolveGenerationModel({
      operation: "edit",
      promptText: "make it warmer",
      referenceCount: 1,
      hasMask: false,
    }),
    "flare",
  );
});

test("plan body rejects a raw mask path and requires sourceVersionId with maskAssetId", () => {
  assert.equal(
    validateCreatePlanBody({
      prompt: "make the notebook green",
      maskPath: "users/x/masks/y.png",
      sourceVersionId: "version-1",
    }).ok,
    false,
  );
  assert.equal(
    validateCreatePlanBody({
      prompt: "make the notebook green",
      maskAssetId: "asset-1",
    }).ok,
    false,
  );
  const ok = validateCreatePlanBody({
    prompt: "make the notebook green",
    maskAssetId: "asset-1",
    sourceVersionId: "version-1",
  });
  assert.equal(ok.ok, true);
});

test("IntentSchema still has no mask field", () => {
  assert.equal("mask" in IntentSchema.shape, false);
});

test("/run never reads a mask path from the request body", () => {
  const run = read("src/routes/api/generation/jobs.$id.run.ts");
  assert.match(run, /extractStoredMaskPath\(session/);
  assert.doesNotMatch(run, /await request\.json/);
  assert.doesNotMatch(run, /const body = await request/);
});
