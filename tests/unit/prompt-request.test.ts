import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPromptRequest,
  detectCinematicForced,
  detectLockedRatio,
  getExamplesForCategory,
} from "../../src/lib/prompt-request.ts";

// v2.9 semantics are frozen in Phase 1. These tests pin the CURRENT behavior,
// including known false positives, so Phase 2 changes show up as diffs.

test("cinematic lock fires on explicit cinematic framing words", () => {
  assert.equal(detectCinematicForced("cinematic shot of a wedding"), true);
  assert.equal(detectCinematicForced("film still of a kitchen"), true);
  assert.equal(detectCinematicForced("cinematic lighting on a bottle"), true); // known v2.9 behavior
  assert.equal(detectCinematicForced("a cinematic feeling"), false);
  assert.equal(detectCinematicForced("cinematic shot of x", "POSTER/COVER"), false);
});

test("aspect lock: direct ratio wins, then keyword table in order", () => {
  assert.equal(detectLockedRatio("hero image 16:9 of a lake"), "16:9");
  assert.equal(detectLockedRatio("youtube thumbnail about x"), "16:9");
  assert.equal(detectLockedRatio("instagram story about coffee"), "9:16");
  assert.equal(detectLockedRatio("square album cover"), "1:1");
  assert.equal(detectLockedRatio("cinematic shot of rain"), "2.39:1");
  assert.equal(detectLockedRatio("a red chair"), null);
});

test("aspect lock: known v2.9 false positives are pinned", () => {
  assert.equal(detectLockedRatio("portrait of a woman"), "4:5");
  assert.equal(detectLockedRatio("a story about loneliness"), "9:16");
  assert.equal(detectLockedRatio("Times Square at night"), "1:1");
});

test("examples: seeded rng gives deterministic selection, 4 in auto mode", () => {
  const rng = () => 0.5;
  const a = getExamplesForCategory(null, 4, rng).map((e) => e.id);
  const b = getExamplesForCategory(null, 4, rng).map((e) => e.id);
  assert.equal(a.length, 4);
  assert.deepEqual(a, b);
  const posters = getExamplesForCategory("POSTER/COVER", 4, rng);
  assert.equal(posters.length, 4);
  assert.ok(posters.every((p) => p.category === "Posters"));
  assert.deepEqual(getExamplesForCategory("NOT A CATEGORY", 4, rng), []);
});

test("buildPromptRequest: message layout and locks (no image, no remix)", () => {
  const req = buildPromptRequest({ userInput: "  cinematic shot of a wedding  ", mode: "default", random: () => 0.1 });
  assert.equal(req.cinematicForced, true);
  assert.equal(req.effectiveCategory, "CINEMATIC SCENE");
  assert.equal(req.lockedRatio, "2.39:1");
  assert.equal(req.exampleIds.length, 4);
  assert.ok(req.userMessage.startsWith("REFERENCE EXAMPLES"));
  assert.ok(req.userMessage.includes("Category hint: CINEMATIC SCENE"));
  assert.ok(req.userMessage.includes("LOCKED CATEGORY:"));
  assert.ok(req.userMessage.includes('LOCKED ASPECT RATIO: 2.39:1 — The output prompt MUST include the exact phrase "2.39:1 aspect ratio"'));
  assert.ok(req.userMessage.endsWith("Mode: default\n\nUser idea: cinematic shot of a wedding"));
});

test("buildPromptRequest: remix suppresses examples; image adds the reference line first", () => {
  const req = buildPromptRequest({
    userInput: "a poster",
    mode: "default",
    remixRef: "REF PROMPT",
    referenceImageUrl: "data:image/jpeg;base64,xxx",
    random: () => 0.1,
  });
  assert.equal(req.remixUsed, true);
  assert.deepEqual(req.exampleIds, []);
  assert.ok(req.userMessage.startsWith("REFERENCE IMAGE: A reference image is attached."));
  assert.ok(req.userMessage.includes("REMIX REFERENCE —"));
  assert.ok(req.userMessage.includes("REFERENCE PROMPT:\nREF PROMPT"));
  assert.ok(!req.userMessage.includes("REFERENCE EXAMPLES"));
});

test("buildPromptRequest: over-long remixRef is ignored", () => {
  const req = buildPromptRequest({ userInput: "x", mode: "default", remixRef: "a".repeat(8001), random: () => 0.1 });
  assert.equal(req.remixUsed, false);
  assert.equal(req.exampleIds.length, 4);
});

test("buildPromptRequest: explicit category hint bypasses cinematic lock", () => {
  const req = buildPromptRequest({ userInput: "cinematic shot of x", mode: "CRITIQUE", category: "POSTER/COVER", random: () => 0.1 });
  assert.equal(req.cinematicForced, false);
  assert.equal(req.effectiveCategory, "POSTER/COVER");
  assert.ok(req.userMessage.includes("Mode: CRITIQUE"));
});
