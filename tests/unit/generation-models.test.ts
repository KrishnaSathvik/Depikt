import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MODEL_ALIASES,
  DEFAULT_MODEL_ALIAS,
  GENERATION_QUALITY,
  isModelAlias,
  resolveModelId,
  creditCostFor,
  MAX_REFERENCE_IMAGES_V1,
  MODEL_COPY,
} from "../../src/lib/generation/models.ts";

test("exactly two model aliases, flare and sunburst", () => {
  assert.deepEqual([...MODEL_ALIASES].sort(), ["flare", "sunburst"]);
});

test("flare is the default", () => {
  assert.equal(DEFAULT_MODEL_ALIAS, "flare");
});

test("quality is always max", () => {
  assert.equal(GENERATION_QUALITY, "max");
});

test("isModelAlias accepts only the two known aliases", () => {
  assert.equal(isModelAlias("flare"), true);
  assert.equal(isModelAlias("sunburst"), true);
  assert.equal(isModelAlias("gpt-image-2.5-flare"), false);
  assert.equal(isModelAlias("gpt-image-2"), false);
  assert.equal(isModelAlias("low"), false);
  assert.equal(isModelAlias(undefined), false);
  assert.equal(isModelAlias(null), false);
  assert.equal(isModelAlias(42), false);
});

test("resolveModelId maps aliases to real OpenAI model ids", () => {
  assert.equal(resolveModelId("flare"), "gpt-image-2.5-flare");
  assert.equal(resolveModelId("sunburst"), "gpt-image-2.5-sunburst");
});

test("resolveModelId throws on an unknown alias rather than passing it through", () => {
  // @ts-expect-error deliberate bad input
  assert.throws(() => resolveModelId("gpt-image-2.5-flare"));
});

test("credit cost is flat: 1 credit regardless of model or operation", () => {
  assert.equal(creditCostFor("generate", "flare"), 1);
  assert.equal(creditCostFor("generate", "sunburst"), 1);
  assert.equal(creditCostFor("edit", "flare"), 1);
  assert.equal(creditCostFor("edit", "sunburst"), 1);
});

test("V1 reference image limit is 4", () => {
  assert.equal(MAX_REFERENCE_IMAGES_V1, 4);
});

test("model copy never mentions a credit premium for Sunburst", () => {
  assert.equal(/credit|cost|expensive/i.test(MODEL_COPY.sunburst.tagline), false);
  assert.equal(MODEL_COPY.flare.tagline, "Faster");
  assert.equal(MODEL_COPY.sunburst.tagline, "More precise");
});
