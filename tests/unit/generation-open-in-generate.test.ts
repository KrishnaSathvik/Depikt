// "Open in Generate" from an existing creation (Account -> Creations):
// structural checks that it reuses the existing edit-source architecture
// (sourceVersionId fetched server-side by id, see
// generate-edit-source-image.test.ts) rather than re-uploading the image.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("GenerationHandoff carries an optional sourceVersion, no re-upload payload", () => {
  const src = read("src/lib/generation/handoff.ts");
  assert.match(src, /sourceVersion\?:/);
  assert.match(src, /id: string;/);
  assert.match(src, /previewUrl: string \| null;/);
});

test("useGeneration exposes hydrateVersion to seed the canvas without a job", () => {
  const src = read("src/lib/generation/use-generation.ts");
  assert.match(src, /function hydrateVersion\(version: SessionVersion\)/);
  assert.match(src, /setVersions\(\[version\]\)/);
  assert.match(src, /setActiveVersionId\(version\.id\)/);
  assert.match(src, /hydrateVersion,/);
});

test("GenerateWorkspace's handoff effect hydrates the source version and opens the edit composer", () => {
  const src = read("src/components/generate/GenerateWorkspace.tsx");
  assert.match(src, /handoff\.sourceVersion/);
  assert.match(src, /gen\.hydrateVersion\(/);
  assert.match(src, /setEditing\(true\)/);
});

test("Creations detail's Open in Generate builds the handoff from the creation, not a fresh upload", () => {
  const src = read("src/components/account/CreationDetailDialog.tsx");
  assert.match(src, /saveGenerationHandoff\(/);
  assert.match(src, /sourceVersion: \{/);
  assert.match(
    src,
    /references: \[\]/,
    "no reference images attached -- the source image transfers by id",
  );
});
