// /generate is a two-pane desktop creation workspace (composer left,
// GenerationCanvas right) at the `lg` breakpoint — chosen over `md` because
// two proper creation panes need more room than a tablet-width split gives
// (the repo already uses `md` for tablet-scale changes and `lg` for larger
// composition changes elsewhere). Below `lg` it stacks to one column.
// Versions are hidden entirely when there's only one (no backend
// version-thread work in this pass — see the design doc).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("/generate splits into two panes at lg, one column below it", () => {
  const g = read("src/components/generate/GenerateWorkspace.tsx");
  assert.match(g, /lg:grid-cols-\[minmax\(0,2fr\)_minmax\(0,3fr\)\]/);
  assert.match(g, /max-w-\[1240px\]/);
});

test("no model/quality/seed/style-preset controls in the composer", () => {
  const g = read("src/components/generate/GenerateWorkspace.tsx").toLowerCase();
  for (const banned of ["seed", "style preset", "quality selector"]) {
    assert.equal(g.includes(banned), false, `composer must not expose "${banned}"`);
  }
});

test("the right pane is the shared GenerationCanvas, not bespoke markup", () => {
  const g = read("src/components/generate/GenerateWorkspace.tsx");
  assert.match(g, /import \{ GenerationCanvas \} from "@\/components\/generate\/GenerationCanvas"/);
  assert.match(g, /<GenerationCanvas\s/);
  assert.match(g, /state=\{canvasState\}/);
});

test("Versions render only when there is more than one", () => {
  const g = read("src/components/generate/GenerateWorkspace.tsx");
  assert.match(g, /gen\.versions\.length > 1/);
  assert.equal(/gen\.versions\.length >= 0/.test(g), false);
});

test("GenerationActions renders exactly Download, Edit, Regenerate in that order", () => {
  const a = read("src/components/generate/GenerationActions.tsx");
  const order = ["Download", "Edit", "Regenerate"];
  let lastIndex = -1;
  for (const label of order) {
    const idx = a.indexOf(label);
    assert.notEqual(idx, -1, `missing action label "${label}"`);
    assert.ok(idx > lastIndex, `"${label}" out of order`);
    lastIndex = idx;
  }
});
