import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stripCliFlags,
  fixLensUnits,
  sanitizePrompt,
  sanitizeResultFields,
} from "../../src/lib/sanitize.ts";

test("stripCliFlags removes Midjourney/SD flags", () => {
  const input =
    "cyberpunk alley at night --ar 16:9 --v 6 --style raw --s 250 --chaos 10 --seed 42 --no people --tile";
  assert.equal(stripCliFlags(input), "cyberpunk alley at night");
});

test("stripCliFlags leaves ordinary text alone", () => {
  const input = 'A poster titled "NO WAY" with a 16:9 ratio and a -- dash in the copy';
  assert.equal(stripCliFlags(input), input);
});

test("fixLensUnits converts px lens vocabulary to mm", () => {
  assert.equal(fixLensUnits("shot on a 85px lens at f/1.8"), "shot on a 85mm lens at f/1.8");
  assert.equal(fixLensUnits("50px prime, 35px wide"), "50mm prime, 35mm wide");
  assert.equal(fixLensUnits("40mm pixel"), "40mm");
});

test("fixLensUnits leaves legitimate px usage alone", () => {
  const input = "16px body text, 4px stroke, 1080px wide canvas";
  assert.equal(fixLensUnits(input), input);
});

test("sanitizeResultFields touches prompt, prompts[], rewritten_prompt only", () => {
  const r = sanitizeResultFields({
    prompt: "a --ar 1:1",
    prompts: ["b --v 5", 7],
    rewritten_prompt: "c 35px lens",
    why_it_works: "keeps --ar untouched",
    score: 5,
  });
  assert.equal(r.prompt, "a");
  assert.deepEqual(r.prompts, ["b", 7]);
  assert.equal(r.rewritten_prompt, "c 35mm lens");
  assert.equal(r.why_it_works, "keeps --ar untouched");
  assert.equal(r.score, 5);
  assert.equal(sanitizePrompt(" x --q 2 "), "x");
});
