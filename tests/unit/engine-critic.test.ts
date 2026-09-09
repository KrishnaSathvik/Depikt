import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CRITIC_DIMENSIONS,
  CRITIC_INSTRUCTIONS,
  buildCriticUserMessage,
  computeOverallScore,
  essentialCap,
  finalizeCriticResult,
  flattenDimensions,
  normalizeDimensions,
} from "../../src/lib/prompt-engine/critic.ts";
import {
  CRITIC_CONTRACT,
  CRITIC_CORE_IDS,
  CRITIC_DIMENSION_IDS,
  type CriticDimension,
  type CriticModelResult,
} from "../../src/lib/prompt-engine/schemas.ts";
import { parseResult } from "../../src/lib/openai/schemas.ts";
import { MODEL_ROLES } from "../../src/lib/openai/models.ts";

const dim = (
  id: CriticDimension["id"],
  score: number | null,
  applicable = score !== null,
): CriticDimension => ({
  id,
  applicable,
  score,
  reason: "r",
});

test("critic and builder are separate: own contract, own model role, own instructions", () => {
  assert.equal(CRITIC_CONTRACT.pipeline, "critic");
  assert.equal(CRITIC_CONTRACT.name, "depikt_critic_v3_1");
  assert.equal(MODEL_ROLES.CRITIC.model, "gpt-5.6-terra");
  assert.equal(MODEL_ROLES.CRITIC.reasoningEffort, "medium");
  assert.equal(MODEL_ROLES.CRITIC.temperature, undefined);
  assert.equal(MODEL_ROLES.BUILDER_DEFAULT.model, "gpt-5.6-luna");
  assert.equal(MODEL_ROLES.INTENT.model, "gpt-5.6-luna");
  assert.match(CRITIC_INSTRUCTIONS, /how effective this prompt will be/);
  assert.equal(/cap at \d/i.test(CRITIC_INSTRUCTIONS), false, "no legacy hard caps");
  assert.match(CRITIC_INSTRUCTIONS, /must become shorter when the original is overprompted/);
  assert.match(CRITIC_INSTRUCTIONS, /Never lower a score for something the prompt does not need/);
});

const core = (n: number): CriticModelResult["core"] => ({
  intent_fidelity: { score: n, reason: "r" },
  clarity: { score: n, reason: "r" },
  contradictions: { score: n, reason: "r" },
  efficiency: { score: n, reason: "r" },
});

test("critic strict schema (2.1): core dimensions are structurally required; conditional carry applicability", () => {
  const ok = {
    category: "poster",
    summary: "s",
    core: core(8),
    conditional: [{ id: "text_layout", applicable: false, score: null, reason: "none" }],
    weaknesses: ["w"],
    improvements: ["i"],
    rewritten_prompt: "r",
  };
  assert.equal(parseResult(CRITIC_CONTRACT, JSON.stringify(ok)).ok, true);
  // core cannot be skipped or marked n/a
  assert.equal(
    parseResult(
      CRITIC_CONTRACT,
      JSON.stringify({ ...ok, core: { ...core(8), efficiency: undefined } }),
    ).ok,
    false,
  );
  assert.equal(
    parseResult(
      CRITIC_CONTRACT,
      JSON.stringify({ ...ok, core: { ...core(8), efficiency: { score: null, reason: "x" } } }),
    ).ok,
    false,
  );
  // a core id is not allowed in conditional
  assert.equal(
    parseResult(
      CRITIC_CONTRACT,
      JSON.stringify({
        ...ok,
        conditional: [{ id: "efficiency", applicable: false, score: null, reason: "x" }],
      }),
    ).ok,
    false,
  );
  assert.equal(parseResult(CRITIC_CONTRACT, JSON.stringify({ ...ok, score: 7 })).ok, false);
  assert.equal(
    parseResult(CRITIC_CONTRACT, JSON.stringify({ prompt: "p", why_it_works: "w" })).ok,
    false,
  );
  const flat = flattenDimensions(ok as CriticModelResult);
  assert.deepEqual(
    flat
      .filter((d) => (CRITIC_CORE_IDS as readonly string[]).includes(d.id))
      .map((d) => d.applicable),
    [true, true, true, true],
  );
  assert.equal(flat.find((d) => d.id === "text_layout")?.applicable, false);
});

test("overall score: weighted mean of applicable dimensions only; non-applicable never lower it", () => {
  const all10 = CRITIC_DIMENSION_IDS.map((id) => dim(id, 10));
  assert.equal(computeOverallScore(all10).overall, 10);

  const simple = [
    dim("intent_fidelity", 9),
    dim("clarity", 9),
    dim("contradictions", 10),
    dim("efficiency", 9),
    dim("text_layout", null),
    dim("edit_preservation", null),
    dim("factual_integrity", null),
  ];
  const s = computeOverallScore(simple);
  assert.equal(s.overall, 9.2);
  assert.deepEqual(s.skipped, ["text_layout", "edit_preservation", "factual_integrity"]);

  // Intent fidelity (w3) matters more than style coherence (w1)
  const a = computeOverallScore([dim("intent_fidelity", 2), dim("style_coherence", 10)]).overall!;
  const b = computeOverallScore([dim("intent_fidelity", 10), dim("style_coherence", 2)]).overall!;
  assert.ok(a < 5 && b > 7, `${a} ${b}`);

  // Edit preservation weighs as much as intent fidelity
  const w = Object.fromEntries(CRITIC_DIMENSIONS.map((d) => [d.id, d.weight]));
  assert.equal(w.edit_preservation, w.intent_fidelity);
  assert.ok(w.intent_fidelity > w.composition_control);

  // Scores are clamped and duplicates ignored; nothing applicable → null
  assert.equal(computeOverallScore([dim("clarity", 14), dim("clarity", 0)]).overall, 10);
  assert.equal(computeOverallScore([dim("clarity", null)]).overall, null);
  assert.equal(computeOverallScore([]).overall, null);
});

test("normalizeDimensions lists all ten, filling omitted ones as non-applicable", () => {
  const dims = normalizeDimensions([dim("clarity", 7)]);
  assert.equal(dims.length, CRITIC_DIMENSION_IDS.length);
  assert.equal(dims.find((d) => d.id === "clarity")?.score, 7);
  assert.equal(dims.find((d) => d.id === "edit_preservation")?.applicable, false);
});

test("essential-dimension cap (2.1): a failed job cannot be rescued by decorative strengths", () => {
  assert.equal(essentialCap(2), 4);
  assert.equal(essentialCap(4), 6);
  assert.equal(essentialCap(6), 8);
  assert.equal(essentialCap(7), null);
  // "make the sky purple": clarity/contradictions/efficiency 9-10, edit_preservation 3
  const r = computeOverallScore([
    dim("intent_fidelity", 9),
    dim("clarity", 10),
    dim("contradictions", 10),
    dim("efficiency", 10),
    dim("edit_preservation", 3),
  ]);
  assert.ok(r.weightedMean! > 7.5, String(r.weightedMean));
  assert.equal(r.overall, 6);
  assert.deepEqual(r.cap, { dimension: "edit_preservation", score: 3, cap: 6 });
  // non-essential low scores do not cap
  const n = computeOverallScore([
    dim("intent_fidelity", 9),
    dim("clarity", 9),
    dim("style_coherence", 1),
  ]);
  assert.equal(n.cap, null);
  // non-applicable essential dimension does not cap
  const na = computeOverallScore([dim("intent_fidelity", 9), dim("edit_preservation", null)]);
  assert.equal(na.cap, null);
  assert.equal(na.overall, 9);
  // lowest cap wins
  const two = computeOverallScore([
    dim("intent_fidelity", 2),
    dim("text_layout", 5),
    dim("clarity", 10),
  ]);
  assert.equal(two.overall, 4);
});

test("finalizeCriticResult computes overall with cap, keeps a rounded legacy score, maps category, sanitizes rewrite", () => {
  const r = finalizeCriticResult({
    category: "image_edit",
    summary: "s",
    core: {
      intent_fidelity: { score: 8, reason: "r" },
      clarity: { score: 7, reason: "r" },
      contradictions: { score: 10, reason: "r" },
      efficiency: { score: 9, reason: "r" },
    },
    conditional: [{ id: "edit_preservation", applicable: true, score: 5, reason: "weak" }],
    weaknesses: [],
    improvements: [],
    rewritten_prompt: "CHANGE ONLY: sky --ar 16:9",
  });
  assert.equal(r.weighted_mean, 7.5);
  assert.deepEqual(r.score_cap, { dimension: "edit_preservation", score: 5, cap: 8 });
  assert.equal(r.overall_score, 7.5);
  assert.equal(r.score, 8);
  assert.equal(r.category, "IMAGE EDIT");
  assert.equal(r.rewritten_prompt, "CHANGE ONLY: sky");
  assert.equal(r.dimensions.length, 10);
  assert.equal(r.prompt_version, "depikt-v3.0.0-images-2.5");
  const withImage = finalizeCriticResult(
    {
      category: "poster",
      summary: "s",
      core: core(9),
      conditional: [{ id: "reference_handling", applicable: false, score: null, reason: "n/a" }],
      weaknesses: [],
      improvements: [],
      rewritten_prompt: "p",
    },
    { hasImage: true },
  );
  assert.match(
    withImage.dimensions.find((d) => d.id === "reference_handling")!.reason,
    /Not scored by the model although a reference image was attached/,
  );
});

test("critic user message states the reference usage when an image is attached", () => {
  assert.match(buildCriticUserMessage("p", true, "edit_source"), /used as: edit_source/);
  assert.match(buildCriticUserMessage("p", true, "auto"), /infer how it is meant to be used/);
  assert.equal(buildCriticUserMessage(" p ", false), "PROMPT TO CRITIQUE:\np");
});

// ---------- Phase 3 carryover B: bare edit rule ----------

test("bare edit rule (3.B): the source image is not preservation language", () => {
  assert.match(CRITIC_INSTRUCTIONS, /Bare edits:/);
  assert.match(CRITIC_INSTRUCTIONS, /image never substitutes for preservation language/);
  assert.match(CRITIC_INSTRUCTIONS, /"Make the beanie red\."/);
  assert.match(CRITIC_INSTRUCTIONS, /Change only the beanie to red\. Preserve the person's face/);
  assert.match(CRITIC_INSTRUCTIONS, /weak band \(3-4\) for a bare change request/);
  const ep = CRITIC_DIMENSIONS.find((d) => d.id === "edit_preservation")!;
  assert.match(ep.question, /source image does not count as preservation/);
  assert.equal(ep.essential, true);
  // No new generic cap: the existing essential-dimension cap does the work.
  // A bare edit scored 4 on edit_preservation lands at most at 6 even when
  // the image-backed reference handling and the core dimensions are strong.
  const r = computeOverallScore([
    dim("intent_fidelity", 9),
    dim("clarity", 8),
    dim("contradictions", 10),
    dim("efficiency", 9),
    dim("reference_handling", 7),
    dim("edit_preservation", 4),
    dim("composition_control", null),
    dim("text_layout", null),
    dim("style_coherence", null),
    dim("factual_integrity", null),
  ]);
  assert.equal(r.cap?.dimension, "edit_preservation");
  assert.equal(r.cap?.cap, 6);
  assert.ok(r.overall !== null && r.overall <= 6);
  assert.equal(essentialCap(7), null);
});
