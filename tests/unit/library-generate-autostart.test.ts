// Product rule: a button labeled "Generate" must start generation, not just
// arrive at a pre-filled /generate composer requiring a second click.
// Library already has a complete prompt, so its handoff auto-submits on
// arrival. Gallery only has a reference image — the user still has to
// supply what they want made — so it must stay pre-filled-only.
// See docs/plans/2026-09-10-inline-generation-workspace.md.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("Library's handoff still saves prompt + navigates to /generate", () => {
  const lib = read("src/routes/library.tsx");
  assert.match(lib, /sourceType: "library"/);
  assert.match(lib, /navigate\(\{ to: ROUTES\.legacyBuilder \}\)/);
});

test("GenerateWorkspace auto-submits only a library-sourced handoff with a real prompt", () => {
  const g = read("src/components/generate/GenerateWorkspace.tsx");
  const handoffEffect = g.slice(
    g.indexOf("useEffect(() => {\n    const handoff = consumeGenerationHandoff();"),
    g.indexOf("}, []);"),
  );
  assert.match(handoffEffect, /handoff\.sourceType === "library" && handoff\.prompt\.trim\(\)/);
  assert.match(handoffEffect, /gen\.submit\(\{/);
});

test("Gallery's handoff carries no prompt, so it can never auto-submit", () => {
  const gallery = read("src/routes/gallery.tsx");
  assert.match(gallery, /sourceType: "gallery"/);
  const handoffCall = gallery.slice(
    gallery.indexOf("saveGenerationHandoff({"),
    gallery.indexOf("void navigate({ to: ROUTES.legacyBuilder });"),
  );
  assert.match(handoffCall, /prompt: ""/);
});
