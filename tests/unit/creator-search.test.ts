import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePromptMode, validateCreatorSearch } from "../../src/lib/creator-search.ts";

test("home stays a clean URL while the default tool is Generate", () => {
  assert.equal(validateCreatorSearch({}).mode, undefined);
  assert.equal(parsePromptMode(undefined), "generate");
});

test("legacy links retain their mode, draft, template and reference context", () => {
  for (const mode of ["build", "critique", "generate"] as const) {
    const search = {
      mode,
      prefill: "a Kyoto travel poster",
      template: "poster-flyer",
      ref: "/gallery/example.webp",
      restore: "history-1",
      seed: "idea",
      remixRef: "reference note",
    };
    assert.deepEqual(validateCreatorSearch(search), search);
  }
});

test("untrusted or oversized search values cannot become creator inputs", () => {
  const parsed = validateCreatorSearch({
    mode: "bogus",
    prefill: "x".repeat(4001),
    seed: {},
    template: "../../file",
    ref: "https://outside.example/image",
    remixRef: "x".repeat(8001),
  });
  assert.equal(parsed.mode, "generate");
  for (const key of ["prefill", "seed", "template", "ref", "remixRef"] as const)
    assert.equal(parsed[key], undefined);
});
