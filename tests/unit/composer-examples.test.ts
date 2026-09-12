import { test } from "node:test";
import assert from "node:assert/strict";
import { BUILD_EXAMPLES, GENERATE_EXAMPLES } from "../../src/data/composer-examples.ts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("Generate and Build example sets are distinct, titled cards with real briefs", () => {
  assert.equal(GENERATE_EXAMPLES.length, 6);
  assert.equal(BUILD_EXAMPLES.length, 6);
  for (const set of [GENERATE_EXAMPLES, BUILD_EXAMPLES]) {
    const labels = set.map((c) => c.label);
    assert.equal(new Set(labels).size, labels.length, "labels must be unique");
    for (const c of set) {
      assert.ok(c.label.length >= 3 && c.label.length <= 24, c.label);
      assert.ok(c.hint.length >= 8 && c.hint.length <= 48, c.hint);
      assert.ok(c.text.length >= 40, c.label);
      assert.doesNotMatch(c.text, /midjourney|stable diffusion|--ar|--v/i);
    }
  }
  // Generate briefs should be more specific (ready to run) than Build rough ideas.
  const genAvg =
    GENERATE_EXAMPLES.reduce((n, c) => n + c.text.length, 0) / GENERATE_EXAMPLES.length;
  const buildAvg = BUILD_EXAMPLES.reduce((n, c) => n + c.text.length, 0) / BUILD_EXAMPLES.length;
  assert.ok(genAvg > buildAvg, "Generate starters should be denser than Build rough ideas");
});

test("ComposerChips is a horizontal card row, not filter pills", () => {
  const src = read("src/components/composer/CreationComposer.tsx");
  assert.match(src, /ScrollRow/);
  assert.match(src, /chip\.hint/);
  assert.doesNotMatch(src, /className="pill/);
  assert.match(src, /Try one of these/);
});

test("Generate and Build wire the shared example catalogues", () => {
  const gen = read("src/components/generate/GenerateWorkspace.tsx");
  const build = read("src/components/prompt/BuildMode.tsx");
  assert.match(gen, /GENERATE_EXAMPLES/);
  assert.match(build, /BUILD_EXAMPLES/);
  assert.doesNotMatch(gen, /GENERATE_CHIPS/);
  assert.doesNotMatch(build, /EXAMPLE_CHIPS/);
});
