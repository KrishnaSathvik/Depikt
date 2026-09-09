import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CRITIC_DIMENSIONS,
  CRITIC_INSTRUCTIONS,
  buildCriticUserMessage,
  computeOverallScore,
  finalizeCriticResult,
  normalizeDimensions,
} from "../../src/lib/prompt-engine/critic.ts";
import {
  CRITIC_CONTRACT,
  CRITIC_DIMENSION_IDS,
  type CriticDimension,
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
  assert.equal(CRITIC_CONTRACT.name, "depikt_critic_v3");
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

test("critic strict schema: dimension ids are enumerated, nullable score, no extra fields", () => {
  const ok = {
    category: "poster",
    summary: "s",
    dimensions: [dim("intent_fidelity", 8), dim("text_layout", null)],
    weaknesses: ["w"],
    improvements: ["i"],
    rewritten_prompt: "r",
  };
  assert.equal(parseResult(CRITIC_CONTRACT, JSON.stringify(ok)).ok, true);
  assert.equal(parseResult(CRITIC_CONTRACT, JSON.stringify({ ...ok, score: 7 })).ok, false);
  assert.equal(
    parseResult(
      CRITIC_CONTRACT,
      JSON.stringify({ ...ok, dimensions: [{ ...dim("intent_fidelity", 8), id: "vibes" }] }),
    ).ok,
    false,
  );
  // Builder-shaped payload cannot masquerade as a critic result.
  assert.equal(
    parseResult(CRITIC_CONTRACT, JSON.stringify({ prompt: "p", why_it_works: "w" })).ok,
    false,
  );
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

test("finalizeCriticResult computes overall, keeps a rounded legacy score, maps category label, sanitizes rewrite", () => {
  const r = finalizeCriticResult({
    category: "image_edit",
    summary: "s",
    dimensions: [dim("intent_fidelity", 8), dim("edit_preservation", 5), dim("clarity", 7)],
    weaknesses: [],
    improvements: [],
    rewritten_prompt: "CHANGE ONLY: sky --ar 16:9",
  });
  assert.equal(r.overall_score, 6.6);
  assert.equal(r.score, 7);
  assert.equal(r.category, "IMAGE EDIT");
  assert.equal(r.rewritten_prompt, "CHANGE ONLY: sky");
  assert.equal(r.dimensions.length, 10);
  assert.equal(r.prompt_version, "depikt-v3.0.0-images-2.5");
});

test("critic user message states the reference usage when an image is attached", () => {
  assert.match(buildCriticUserMessage("p", true, "edit_source"), /used as: edit_source/);
  assert.match(buildCriticUserMessage("p", true, "auto"), /infer how it is meant to be used/);
  assert.equal(buildCriticUserMessage(" p ", false), "PROMPT TO CRITIQUE:\np");
});
