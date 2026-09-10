// Visual-QA follow-up: a static "ready" dot field before generation started
// read as a premature loading state, not an empty canvas — on mobile it
// pushed real controls off-screen for no reason. ThinkingField (and
// GenerationCanvas generally) must be mounted only once an image operation
// is actually running: /generate's idle composer, and Build/Critique before
// "Generate image"/"Generate rewrite" is pressed, render no generation
// visual at all.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("GenerationCanvas has no ready/idle state — only generating, result, error", () => {
  const canvas = read("src/components/generate/GenerationCanvas.tsx");
  assert.match(canvas, /export type GenerationCanvasState = "generating" \| "result" \| "error"/);
  assert.equal(/state === "ready"/.test(canvas), false);
  assert.equal(/Your image will appear here/.test(canvas), false);
});

test("/generate renders a single-column composer while idle, with no GenerationCanvas mounted", () => {
  const g = read("src/components/generate/GenerateWorkspace.tsx");
  assert.match(
    g,
    /const isIdle = gen\.phase === "idle" \|\| \(gen\.phase === "error" && !gen\.job\)/,
  );
  const idleBranch = g.slice(g.indexOf("if (isIdle) {"), g.indexOf("// ---------- generating"));
  assert.equal(/<GenerationCanvas/.test(idleBranch), false);
  assert.equal(/ThinkingField/.test(idleBranch), false);
  // The idle composer integrates reference controls and the ratio caption
  // into one surface rather than a detached dashed square.
  assert.match(idleBranch, /<ComposerSurface/);
});

test("the two-pane workspace (and its GenerationCanvas) only renders once generation is underway", () => {
  const g = read("src/components/generate/GenerateWorkspace.tsx");
  const afterIdle = g.slice(g.indexOf("// ---------- generating"));
  assert.match(afterIdle, /<GenerationCanvas/);
  assert.match(afterIdle, /lg:grid-cols-\[minmax\(0,2fr\)_minmax\(0,3fr\)\]/);
});

test("InlineGenerationPanel (Build/Critique) never mounts ThinkingField before phase leaves idle", () => {
  const panel = read("src/components/generate/InlineGenerationPanel.tsx");
  assert.match(panel, /if \(gen\.phase === "idle"\) return null;/);
});
