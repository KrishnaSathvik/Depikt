import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadVnext2Cases } from "../image-evals/vnext-2/load-cases.ts";

const FROZEN_PROMPTS: Record<string, string> = {
  "notebook-color":
    "Change the red notebook to dark green. Keep everything else exactly the same.",
  "tulips-color": "Change only the yellow tulips to white tulips.",
  "juice-replacement": "Replace only the orange juice with a glass of milk.",
  "jacket-color": "Change only the jacket to dark blue.",
  "remove-object": "Remove the sunglasses and naturally fill the space.",
  "local-replacement": "Replace only the watch with a silver bracelet.",
  "whole-image-edit-regression": "Make the entire scene warmer and more cinematic.",
};

const CASE_IDS = Object.keys(FROZEN_PROMPTS);

function walkSrcFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walkSrcFiles(path, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

test("vnext-2 suite has 7 unique precision-edit cases", () => {
  const cases = loadVnext2Cases();
  assert.equal(cases.length, 7);
  assert.equal(new Set(cases.map((c) => c.id)).size, 7);
  for (const id of CASE_IDS) {
    assert.ok(cases.some((c) => c.id === id), `missing case ${id}`);
  }
});

test("vnext-2 prompts match frozen strings", () => {
  const cases = loadVnext2Cases();
  for (const c of cases) {
    assert.ok(c.prompt.trim().length > 0, c.id);
    assert.equal(c.prompt, FROZEN_PROMPTS[c.id], c.id);
  }
});

test("vnext-2 masked cases expect sunburst routing", () => {
  const cases = loadVnext2Cases().filter((c) => c.id !== "whole-image-edit-regression");
  assert.equal(cases.length, 6);
  for (const c of cases) {
    assert.equal(c.has_mask, true, c.id);
    assert.equal(c.expected.hasMask, true, c.id);
    assert.equal(c.expected.model, "sunburst", c.id);
    assert.equal(c.expected.operation, "edit", c.id);
    assert.equal(c.expected.sourceImageIndex, 0, c.id);
    assert.equal(c.expected.creditCost, 1, c.id);
  }
});

test("vnext-2 whole-image-edit-regression uses unmasked router", () => {
  const c = loadVnext2Cases().find((x) => x.id === "whole-image-edit-regression");
  assert.ok(c);
  assert.equal(c.has_mask, false);
  assert.equal(c.expected.hasMask, false);
  assert.equal(c.expected.model, "unmasked_edit");
  assert.equal(c.expected.operation, "edit");
  assert.equal(c.expected.sourceImageIndex, 0);
  assert.equal(c.expected.creditCost, 1);
});

test("production src must not reference vnext-2 case ids", () => {
  const srcRoot = new URL("../../src", import.meta.url).pathname;
  const files = walkSrcFiles(srcRoot);
  for (const id of CASE_IDS) {
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      assert.ok(
        !content.includes(id),
        `case id "${id}" must not appear in production source (${file})`,
      );
    }
  }
});
