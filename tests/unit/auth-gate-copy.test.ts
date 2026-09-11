import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generationGateHeadline,
  planGateHeadline,
  PACK_GATE_HEADLINE,
  promptExcerpt,
} from "../../src/lib/auth/gate-copy.ts";

test("generation gate headline matches the action the user already started, not a generic 'sign in required'", () => {
  assert.equal(generationGateHeadline("direct"), "Make this image");
  assert.equal(generationGateHeadline("prompt_build"), "Generate this image");
  assert.equal(generationGateHeadline("prompt_critique"), "Generate the improved version");
  // Library/gallery/template hand off into direct Generate; same continuation copy.
  assert.equal(generationGateHeadline("library"), "Make this image");
  assert.equal(generationGateHeadline("gallery"), "Make this image");
  assert.equal(generationGateHeadline("template"), "Make this image");
});

test("plan and pack gate headlines", () => {
  assert.equal(planGateHeadline("pro"), "Get Depikt Pro");
  assert.equal(planGateHeadline("max"), "Get Depikt Max");
  assert.equal(PACK_GATE_HEADLINE, "Get more image credits");
});

test("promptExcerpt trims to a short muted line and never shows the full prompt", () => {
  assert.equal(
    promptExcerpt("Editorial portrait of a violinist"),
    "Editorial portrait of a violinist",
  );
  const long = "A".repeat(200);
  const short = promptExcerpt(long, 80);
  assert.ok(short.length <= 80);
  assert.match(short, /…$/);
  assert.equal(promptExcerpt("  multiple   spaces  \n and lines  "), "multiple spaces and lines");
  assert.equal(promptExcerpt(""), "");
});
