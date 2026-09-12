import { test } from "node:test";
import assert from "node:assert/strict";
import {
  THINKING_FIELD_TEMPO,
  computeDotStyle,
  resolveGrid,
} from "../../src/components/processing/thinking-field.ts";
import { resolveGenerationSize } from "../../src/lib/generation/aspect-ratio.ts";

test("ThinkingField tempo is fast enough to read as alive on long jobs", () => {
  assert.ok(THINKING_FIELD_TEMPO >= 2.2, `tempo ${THINKING_FIELD_TEMPO} still feels static`);
});

test("generate field style changes meaningfully within ~1s of logical time", () => {
  const p = { nx: 0.35, ny: 0.4 };
  const a = computeDotStyle("generate", p, 0);
  const b = computeDotStyle("generate", p, 1);
  const delta = Math.abs(a.radius - b.radius) + Math.abs(a.opacity - b.opacity);
  assert.ok(delta > 0.08, `motion too small over 1s: ${delta}`);
});

test("resolveGrid densifies with larger frames (aspect-aware lattice)", () => {
  const square = resolveGrid(400, 400);
  const portrait = resolveGrid(280, 500);
  const landscape = resolveGrid(700, 400);
  assert.ok(portrait.rows >= square.rows);
  assert.ok(landscape.cols >= square.cols);
});

test("unsupported explicit ratios snap to the nearest OpenAI bucket", () => {
  const wide = resolveGenerationSize({ promptText: "cinema still 21:9" });
  assert.equal(wide.source, "explicit_ratio");
  assert.equal(wide.ratioLabel, "16:9");

  const odd = resolveGenerationSize({ promptText: "poster 7:5" });
  assert.equal(odd.source, "explicit_ratio");
  assert.ok(["5:4", "4:3", "3:2"].includes(odd.ratioLabel));
});

test("structured aspect ratios outside the table also snap", () => {
  const r = resolveGenerationSize({
    promptText: "anything",
    structuredAspectRatio: "21:9",
  });
  assert.equal(r.source, "structured");
  assert.equal(r.ratioLabel, "16:9");
});
