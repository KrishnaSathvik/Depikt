// Source-inspection for the precision-edit overlay: the editor draws
// locally over the source <img>, never uploads a mask, and never exposes
// mask/alpha/inpainting copy. Whole-image Apply stays gen.applyEdit(prompt).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

function visibleCopy(src: string): string {
  const withoutComments = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const parts: string[] = [];
  for (const m of withoutComments.matchAll(/>([^<>{}]+)</g)) {
    const text = m[1].trim();
    if (text) parts.push(text);
  }
  for (const m of withoutComments.matchAll(
    /(?:aria-label|placeholder|title|alt)=\{?"([^"]+)"\}?/g,
  )) {
    parts.push(m[1]);
  }
  return parts.join("\n");
}

test("GenerationMaskEditor overlays a canvas on an img and maps pointers with pointerToNormalized", () => {
  const editor = read("src/components/generate/GenerationMaskEditor.tsx");
  assert.match(editor, /<img/);
  assert.match(editor, /<canvas/);
  assert.match(editor, /pointerToNormalized/);
  assert.match(editor, /getBoundingClientRect/);
  assert.match(editor, /onPointerDown/);
  assert.match(editor, /onPointerMove/);
  assert.match(editor, /onPointerUp/);
});

test("GenerationMaskEditor does not paint the source image into the canvas", () => {
  const editor = read("src/components/generate/GenerationMaskEditor.tsx");
  assert.doesNotMatch(editor, /drawImage/);
});

test("GenerationMaskEditor has Brush, Erase, Undo, Clear, and a Brush size slider", () => {
  const editor = read("src/components/generate/GenerationMaskEditor.tsx");
  const copy = visibleCopy(editor);
  assert.match(copy, /Brush size/);
  assert.match(copy, /Brush/);
  assert.match(copy, /Erase/);
  assert.match(copy, /Undo/);
  assert.match(copy, /Clear/);
  assert.match(editor, /type="range"/);
});

test("the edit form offers Select area and Edit whole image with the required copy", () => {
  const form = read("src/components/generate/GenerationEditForm.tsx");
  const copy = visibleCopy(form);
  assert.match(copy, /Edit image/);
  assert.match(copy, /Select area/);
  assert.match(copy, /Edit whole image/);
  assert.match(copy, /Select what you want to change\./);
  assert.match(copy, /What should change\?/);
  assert.match(copy, /Apply edit → · 1 credit/);
  assert.match(copy, /Cancel/);
  assert.match(form, /GenerationMaskEditor/);
});

test("edit UI copy does not say mask, alpha, or inpainting", () => {
  const files = [
    "src/components/generate/GenerationMaskEditor.tsx",
    "src/components/generate/GenerationEditForm.tsx",
    "src/components/generate/GenerateWorkspace.tsx",
    "src/components/generate/InlineGenerationPanel.tsx",
  ];
  for (const rel of files) {
    const copy = visibleCopy(read(rel)).toLowerCase();
    for (const banned of ["mask", "alpha", "inpainting"]) {
      assert.equal(
        copy.includes(banned),
        false,
        `${rel} visible copy must not contain "${banned}"`,
      );
    }
  }
});

test("GenerateWorkspace and InlineGenerationPanel still render GenerationEditForm and applyEdit", () => {
  const workspace = read("src/components/generate/GenerateWorkspace.tsx");
  const panel = read("src/components/generate/InlineGenerationPanel.tsx");
  assert.match(workspace, /<GenerationEditForm\s/);
  assert.match(panel, /<GenerationEditForm\s/);
  assert.match(workspace, /gen\.applyEdit\(editPrompt\)/);
  assert.match(panel, /gen\.applyEdit\(editPrompt\)/);
});

test("parents pass the result image and active version dimensions into the edit form", () => {
  const workspace = read("src/components/generate/GenerateWorkspace.tsx");
  const panel = read("src/components/generate/InlineGenerationPanel.tsx");
  for (const src of [workspace, panel]) {
    assert.match(src, /gen\.versions\.find\(\s*\(?v\)?\s*=>\s*v\.id === gen\.activeVersionId/);
    assert.match(src, /imageUrl=\{gen\.resultUrl\}/);
    assert.match(src, /sourceWidth=\{active\?\.width\}/);
    assert.match(src, /sourceHeight=\{active\?\.height\}/);
  }
});

test("the overlay never uploads a mask or changes applyEdit", () => {
  const editor = read("src/components/generate/GenerationMaskEditor.tsx");
  const form = read("src/components/generate/GenerationEditForm.tsx");
  for (const src of [editor, form]) {
    assert.doesNotMatch(src, /POST\s*\/masks|\/api\/.*masks/);
    assert.doesNotMatch(src, /applyEdit\s*\(/);
  }
  const hook = read("src/lib/generation/use-generation.ts");
  assert.match(hook, /function applyEdit\(editPrompt: string\)/);
});
