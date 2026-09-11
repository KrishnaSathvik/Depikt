// Fix order item 2: one shared composer shell for Generate, Prompt Build,
// and Prompt Critique instead of three unrelated-looking input stacks.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

const SURFACES = [
  "src/components/generate/GenerateWorkspace.tsx",
  "src/components/prompt/BuildMode.tsx",
  "src/components/prompt/CritiqueMode.tsx",
] as const;

test("Generate, Build, and Critique all use the shared CreationComposer shell", () => {
  for (const f of SURFACES) {
    const src = read(f);
    assert.match(src, /from "@\/components\/composer\/CreationComposer"/, f);
    assert.match(src, /<CreationComposer/, f);
  }
});

test("the submit button lives inside the composer's footer (submit prop), not a separate full-width button", () => {
  const gen = read("src/components/generate/GenerateWorkspace.tsx");
  // The old pattern: a standalone `<Button className="w-full" ...>Generate image` below the composer.
  assert.doesNotMatch(gen, /className="w-full"[^]*?Generate image/);
  assert.match(gen, /submit=\{/, "CreationComposer's submit prop must be used");

  for (const f of [
    "src/components/prompt/BuildMode.tsx",
    "src/components/prompt/CritiqueMode.tsx",
  ]) {
    const src = read(f);
    assert.match(src, /submit=\{/, f);
  }
});

test("CreationComposer never re-implements its own textarea — callers keep their own ref/onKeyDown/onPaste", () => {
  const shell = read("src/components/composer/CreationComposer.tsx");
  assert.doesNotMatch(shell, /<Textarea/);
  assert.doesNotMatch(shell, /<textarea/);
});

test("example chips (ComposerChips) render outside the composer, not inside its footer", () => {
  const gen = read("src/components/generate/GenerateWorkspace.tsx");
  const build = read("src/components/prompt/BuildMode.tsx");
  assert.match(gen, /<ComposerChips/);
  assert.match(build, /<ComposerChips/);
  // ComposerChips must never appear textually inside a <CreationComposer>...
  // </CreationComposer> span (file order otherwise doesn't guarantee
  // anything, since GenerateWorkspace's composer is a helper function
  // defined after the JSX that uses it).
  for (const src of [gen, build]) {
    const open = src.indexOf("<CreationComposer");
    const close = src.indexOf("</CreationComposer>", open);
    assert.ok(open > 0 && close > open, "could not find a CreationComposer span");
    const inside = src.slice(open, close);
    assert.doesNotMatch(inside, /<ComposerChips/);
  }
});

test("reference attachment lives inside the composer's referencesSlot, not a separate block above the footer", () => {
  for (const f of SURFACES) {
    assert.match(read(f), /referencesSlot=\{/, f);
  }
});

// ---------- Generate matches Prompt's visual chrome (header + reference control) ----------

test("Generate's idle header uses the same chrome as Prompt: eyebrow, display heading, subtitle, 1040px left-aligned container", () => {
  const gen = read("src/components/generate/GenerateWorkspace.tsx");
  const prompt = read("src/routes/prompt.tsx");
  assert.match(gen, /max-w-\[1040px\]/);
  assert.match(prompt, /max-w-\[1040px\]/);
  assert.match(gen, /text-display-md sm:text-display-lg/);
  assert.doesNotMatch(gen, /text-heading-lg/, "must not keep the old smaller centered heading");
  assert.doesNotMatch(
    gen,
    /text-center/,
    "the idle composer is left-aligned like Prompt, not centered",
  );
  assert.match(gen, /<p className="eyebrow">\{TOOL\.generate\}<\/p>/);
});

test("Generate's reference control matches ReferenceImagePicker's visual language (dashed pill, mono 12px, bg-subtle thumbnail pill)", () => {
  const gen = read("src/components/generate/GenerateWorkspace.tsx");
  const picker = read("src/components/ReferenceImagePicker.tsx");
  for (const cls of [
    "border-dashed",
    "font-mono",
    "text-[12px]",
    "bg-[color:var(--bg-subtle)]",
    "rounded-md",
  ]) {
    assert.ok(gen.includes(cls), `GenerateWorkspace missing "${cls}"`);
    assert.ok(picker.includes(cls), `ReferenceImagePicker missing "${cls}" (drifted)`);
  }
  assert.match(gen, /ImagePlus/, "same add-reference icon as ReferenceImagePicker, not Plus");
});
