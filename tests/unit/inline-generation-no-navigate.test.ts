// A button labeled "Generate" must generate — Prompt Build's "Generate
// image" and Prompt Critique's "Generate rewrite" must start the job
// inline, in place, on /prompt. Neither may navigate to /generate or save
// the old cross-page handoff (that handoff is still used by Library/
// Gallery/Prompt->Build prefill, just not by this path anymore).
// See docs/plans/2026-09-10-inline-generation-workspace.md.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("Build's Generate image handler does not navigate or save a cross-page handoff", () => {
  const b = read("src/components/prompt/BuildMode.tsx");
  assert.equal(/saveGenerationHandoff/.test(b), false);
  assert.equal(/navigate\(\{ to: "\/generate" \}\)/.test(b), false);
  assert.match(b, /const gen = useGeneration\(\{ sourceContext: \{ type: "prompt_build" \} \}\)/);
  const handler = b.slice(
    b.indexOf("const handleGenerateImage"),
    b.indexOf("const [input, setInput]"),
  );
  assert.match(handler, /await gen\.submit\(\{/);
});

test("Critique's Generate rewrite handler does not navigate or save a cross-page handoff", () => {
  const c = read("src/components/prompt/CritiqueMode.tsx");
  assert.equal(/saveGenerationHandoff/.test(c), false);
  assert.equal(/navigate\(\{ to: "\/generate" \}\)/.test(c), false);
  assert.match(
    c,
    /const gen = useGeneration\(\{ sourceContext: \{ type: "prompt_critique" \} \}\)/,
  );
  const handler = c.slice(
    c.indexOf("const handleGenerateRewrite"),
    c.indexOf("const [input, setInput]"),
  );
  assert.match(handler, /await gen\.submit\(\{/);
});

test("both modes render InlineGenerationPanel, not a second Generate confirmation", () => {
  const b = read("src/components/prompt/BuildMode.tsx");
  const c = read("src/components/prompt/CritiqueMode.tsx");
  assert.match(b, /<InlineGenerationPanel/);
  assert.match(c, /<InlineGenerationPanel/);
  // InlineGenerationPanel itself renders nothing (no button) while idle —
  // it only appears once submit() has already moved phase off "idle".
  const panel = read("src/components/generate/InlineGenerationPanel.tsx");
  assert.match(panel, /if \(gen\.phase === "idle"\) return null;/);
});

test("Build's own prompt-building spinner is untouched — no ThinkingField for text generation", () => {
  const b = read("src/components/prompt/BuildMode.tsx");
  assert.match(b, /function LoadingState\(\{ intent \}/);
  assert.equal(/ThinkingField/.test(b), false);
});

test("Critique's own critiquing spinner is untouched — no ThinkingField for text generation", () => {
  const c = read("src/components/prompt/CritiqueMode.tsx");
  assert.match(c, /Reviewing your prompt…/);
  assert.equal(/ThinkingField/.test(c), false);
});

test('ThinkingField is used only by GenerationCanvas, with variant="generate"', () => {
  const canvas = read("src/components/generate/GenerationCanvas.tsx");
  assert.match(canvas, /variant="generate"/);
  assert.equal(/variant="build"|variant="critique"/.test(canvas), false);
});
