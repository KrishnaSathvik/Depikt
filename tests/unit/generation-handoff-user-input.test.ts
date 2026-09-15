import { test } from "node:test";
import assert from "node:assert/strict";
import { selectDecomposerInput } from "../../src/lib/generation/decompose-series.ts";

test("series decomposer uses original userInput, never writer PAGE blocks", () => {
  const userInput =
    "create highly realistic crisp milkyway or star trails/meteors/stars astrophotography images for instagram story";
  const writerPrompt = `PAGE 1: milky way collage\nPAGE 2: star trails\nPAGE 3: meteors\nPAGE 4: star field`;
  const input = selectDecomposerInput({ userInput, writerPrompt });
  assert.equal(input, userInput);
  assert.equal(input.includes("PAGE 1"), false);
});

test("direct Generate with no separate userInput uses the prompt", () => {
  const prompt = "a red bottle on wet stone";
  assert.equal(selectDecomposerInput({ userInput: null, writerPrompt: prompt }), prompt);
});
