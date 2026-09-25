import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pendingGenerationMatchesSource } from "../../src/lib/generation/pending-generation.ts";
const read = (file: string) => readFileSync(resolve(import.meta.dirname, "../..", file), "utf8");

test("Home owns one draft, generation execution and auth dialog across all tools", () => {
  const owner = read("src/components/CreatorDraft.tsx");
  assert.equal((owner.match(/useGeneration\(/g) ?? []).length, 1);
  assert.equal((owner.match(/<AuthGateDialog/g) ?? []).length, 1);
  assert.match(owner, /resumeAllSources: true/);
  for (const tool of ["generate/GenerateWorkspace", "prompt/BuildMode", "prompt/CritiqueMode"]) {
    const source = read(`src/components/${tool}.tsx`);
    assert.match(source, /useCreatorDraft\(\)/);
    assert.doesNotMatch(
      source,
      /useState\(""\).*prompt|const \[input, setInput\]|const \[prompt, setPrompt\]|<AuthGateDialog/,
    );
  }
  const workspace = read("src/components/CreateWorkspace.tsx");
  assert.match(workspace, /CreatorDraftProvider/);
  assert.doesNotMatch(
    workspace,
    /mode !== "generate" &&|rounded-full|bg-\[color:var\(--accent\)\] text-white/,
  );
  assert.match(workspace, /ArrowRight/);
  assert.match(workspace, /tabIndex=\{selected \? 0 : -1\}/);
});

test("shared Home can resume every tool's OAuth submission; independent surfaces remain isolated", () => {
  for (const source of [
    "prompt_build",
    "prompt_critique",
    "direct",
    "library",
    "gallery",
    "template",
  ] as const) {
    assert.equal(pendingGenerationMatchesSource("direct", source, true), true);
  }
  assert.equal(pendingGenerationMatchesSource("direct", "prompt_build"), false);
  assert.equal(pendingGenerationMatchesSource("prompt_critique", "prompt_build"), false);
});

test("saved-reference reads enforce authenticated ownership and stale UI responses are discarded", () => {
  const api = read("src/lib/generation/entity-api.ts");
  assert.match(api, /authenticateGenerationRequest\(request\)/);
  assert.match(api, /\.eq\("user_id", userId\)/);
  assert.match(api, /a.user_id === userId/);
  const picker = read("src/components/generate/ReferencePackPicker.tsx");
  assert.match(picker, /entity.user_id === userId/);
  assert.match(picker, /if \(!cancelled\)/);
  assert.match(picker, /setEntities\(\[\]\)/);
  assert.match(picker, /No reference packs yet/);
  assert.doesNotMatch(picker, /QA Maya|QA Sofia|NEMORI|VELORA/);
});
