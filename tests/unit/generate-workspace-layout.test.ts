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

test("the Generate result stays below the composer on every viewport", () => {
  // GenerateWorkspace no longer owns its own page-width container — it's
  // embedded as one mode of /prompt's tablist (src/routes/prompt.tsx) and
  // relies on that shared 1040px container, same as Build/Critique.
  const g = read("src/components/generate/GenerateWorkspace.tsx");
  assert.match(g, /className="space-y-8"/);
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

test("awaiting a signed URL renders as the result canvas, not the generating spinner", () => {
  const g = read("src/components/generate/GenerateWorkspace.tsx");
  assert.match(g, /gen\.phase === "result" \|\| gen\.phase === "awaiting_result_url"/);
  const inline = read("src/components/generate/InlineGenerationPanel.tsx");
  assert.match(inline, /gen\.phase === "result" \|\| gen\.phase === "awaiting_result_url"/);
});

test("Versions render only when there is more than one", () => {
  const g = read("src/components/generate/GenerateWorkspace.tsx");
  assert.match(g, /gen\.versions\.length > 1/);
  assert.equal(/gen\.versions\.length >= 0/.test(g), false);
});

test("GenerationActions renders exactly Download, Edit, Regenerate, then optionally New, in that order", () => {
  const a = read("src/components/generate/GenerationActions.tsx");
  const order = ["Download", "Edit", "Regenerate", "New"];
  let lastIndex = -1;
  for (const label of order) {
    const idx = a.indexOf(label);
    assert.notEqual(idx, -1, `missing action label "${label}"`);
    assert.ok(idx > lastIndex, `"${label}" out of order`);
    lastIndex = idx;
  }
  // New is opt-in (Build/Critique's inline result has no composer to
  // return to) -- only rendered when the caller passes onNew.
  assert.match(a, /onNew\?: \(\) => void/);
  assert.match(a, /\{onNew && \(/);
});

// Regression: once a result existed on /generate there was no way back to
// a blank composer to start a different image -- Download/Edit/Regenerate
// all act on the current result, none of them clear it. GenerateWorkspace
// is the only GenerationActions caller with a composer to return to, so
// it's the only one that passes onNew.
test("GenerateWorkspace wires a 'New' action that blanks the composer, not just gen.reset()", () => {
  const g = read("src/components/generate/GenerateWorkspace.tsx");
  assert.match(g, /onNew=\{startNew\}/);
  const startNewFn = g.slice(g.indexOf("function startNew"), g.indexOf("// No generation visual"));
  assert.match(startNewFn, /gen\.reset\(\)/);
  assert.match(startNewFn, /gen\.clearReferences\(\)/);
  assert.match(startNewFn, /setPrompt\(""\)/);
  assert.doesNotMatch(
    startNewFn,
    /setSelectedEntities\(\[\]\)/,
    "New clears the prompt and one-off images, not a selected saved pack",
  );

  const panel = read("src/components/generate/InlineGenerationPanel.tsx");
  assert.doesNotMatch(
    panel,
    /onNew=/,
    "Build/Critique's inline result has no composer to return to -- must not pass onNew",
  );
});
