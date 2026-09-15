import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  GENERATION_STAGE_LABELS,
  describeGenerationThinking,
  formatGenerationElapsed,
} from "../../src/lib/product.ts";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("queued jobs say starting; running jobs say creating — one line, no fake steps", () => {
  const queued = describeGenerationThinking(5_000, "queued");
  assert.equal(queued.headline, GENERATION_STAGE_LABELS.starting);
  assert.equal(queued.hint, GENERATION_STAGE_LABELS.expectation);

  const running = describeGenerationThinking(30_000, "running");
  assert.equal(running.headline, GENERATION_STAGE_LABELS.creating);

  const late = describeGenerationThinking(100_000, "running");
  assert.equal(late.headline, GENERATION_STAGE_LABELS.lingering);
  assert.equal(late.hint, GENERATION_STAGE_LABELS.keepOpen);
  assert.equal(/%/.test(late.headline), false);
});

test("elapsed formatting stays readable past a minute", () => {
  assert.equal(formatGenerationElapsed(0), "0s");
  assert.equal(formatGenerationElapsed(12_000), "12s");
  assert.equal(formatGenerationElapsed(60_000), "1m 00s");
  assert.equal(formatGenerationElapsed(102_000), "1m 42s");
});

test("a result without a signed URL is not the generation lingering spinner", () => {
  const canvas = read("src/components/generate/GenerationCanvas.tsx");
  assert.match(canvas, /if \(state === "result"\) \{/);
  assert.match(canvas, /GENERATION_STAGE_LABELS\.loadingImage/);
  assert.equal(/if \(state === "result" && imageUrl\)/.test(canvas), false);
});

test("GenerationCanvas shows one thinking headline, not a stacked fake pipeline", () => {
  const canvas = read("src/components/generate/GenerationCanvas.tsx");
  assert.match(canvas, /describeGenerationThinking/);
  assert.match(canvas, /view\.headline/);
  assert.equal(/view\.stages/.test(canvas), false);
  assert.equal(/Composing the scene/.test(canvas), false);
  assert.equal(/Rendering details/.test(canvas), false);
  assert.match(canvas, /jobStatus/);
  assert.match(read("src/components/processing/ThinkingField.tsx"), /thinking-sweep/);
});
