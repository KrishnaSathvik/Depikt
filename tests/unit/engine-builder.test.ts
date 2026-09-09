import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CORE_RULES,
  PROMPT_VERSION,
  assembleWriterRequest,
} from "../../src/lib/prompt-engine/builder.ts";
import { PLAYBOOKS, selectPlaybook } from "../../src/lib/prompt-engine/playbooks/index.ts";
import { CATEGORY_IDS } from "../../src/lib/prompt-engine/categories.ts";
import { WRITER_CONTRACTS } from "../../src/lib/prompt-engine/schemas.ts";
import {
  LEGACY_PROMPT_VERSION,
  LEGACY_SYSTEM_PROMPT,
} from "../../src/lib/prompt-engine/legacy-v2.9.ts";
import { parseResult } from "../../src/lib/openai/schemas.ts";
import type { Intent } from "../../src/lib/prompt-engine/intent.ts";

function intent(over: Partial<Intent> = {}): Intent {
  return {
    task: "create",
    category: "poster",
    reference_intent: "none",
    aspect_ratio: { source: "explicit", value: "2:3", evidence: null },
    exact_text: [{ role: "headline", text: "FUTURE STACK 2026" }],
    requested_changes: [],
    must_preserve: [],
    transparent_background: false,
    creative_freedom: "low",
    series: {
      enabled: false,
      continuation: false,
      count: null,
      unit: null,
      consistency_requirements: [],
    },
    factual_requirements: {
      user_supplied_facts: [],
      missing_facts: ["date"],
      placeholders_required: true,
    },
    ambiguity: { blocking: false, reason: null },
    ...over,
  };
}

test("versions: production is v3, legacy stays v2.9 and frozen", () => {
  assert.equal(PROMPT_VERSION, "depikt-v3.0.0-images-2.5");
  assert.equal(LEGACY_PROMPT_VERSION, "depikt-v2.9.0");
  assert.match(LEGACY_SYSTEM_PROMPT, /GPT Image 2 model/);
  assert.ok(LEGACY_SYSTEM_PROMPT.length > 15000);
});

test("every category has a playbook and only the selected one is sent", () => {
  for (const id of CATEGORY_IDS) {
    assert.equal(selectPlaybook(id).id, id);
    assert.ok(PLAYBOOKS[id].guidance.length > 200, id);
  }
  const a = assembleWriterRequest({
    intent: intent({ category: "infographic" }),
    userInput: "x",
    mode: "default",
    hasImage: false,
  });
  assert.match(a.instructions, /CATEGORY PLAYBOOK — Infographic/);
  assert.equal(a.instructions.includes(PLAYBOOKS.poster.guidance), false);
  assert.equal(a.instructions.includes(PLAYBOOKS.storyboard.guidance), false);
  assert.equal(a.playbookId, "infographic");
  // The writer prompt is far smaller than the legacy universal prompt.
  assert.ok(a.instructions.split(/\s+/).length < LEGACY_SYSTEM_PROMPT.split(/\s+/).length / 2);
});

test("writer request: no legacy library examples, intent is authoritative, remix only when explicit", () => {
  const a = assembleWriterRequest({
    intent: intent(),
    userInput: "poster idea",
    mode: "default",
    hasImage: false,
  });
  assert.equal(a.userMessage.includes("REFERENCE EXAMPLES"), false);
  assert.equal(a.instructions.includes("REMIX"), false);
  assert.match(a.userMessage, /INTENT \(authoritative\)/);
  assert.match(a.userMessage, /"FUTURE STACK 2026"/);
  assert.ok(a.userMessage.endsWith("USER REQUEST:\nposter idea"));

  const r = assembleWriterRequest({
    intent: intent({ task: "remix" }),
    userInput: "poster idea",
    mode: "default",
    hasImage: false,
    remixRef: "OLD PROMPT",
  });
  assert.match(r.instructions, /# REMIX/);
  assert.match(r.userMessage, /REMIX REFERENCE PROMPT:\nOLD PROMPT/);
  assert.match(r.instructions, /do not carry over model-specific boilerplate/);
});

test("writer request: reference guidance block and image detail follow reference_intent", () => {
  const s = assembleWriterRequest({
    intent: intent({ reference_intent: "style" }),
    userInput: "x",
    mode: "default",
    hasImage: true,
  });
  assert.match(s.instructions, /REFERENCE IMAGE = STYLE ONLY/);
  assert.match(s.instructions, /Use the attached reference image as the style reference only/);
  assert.match(CORE_RULES, /attach the same reference image/);
  assert.equal(s.imageDetail, "low");
  const i = assembleWriterRequest({
    intent: intent({ reference_intent: "subject_identity" }),
    userInput: "x",
    mode: "default",
    hasImage: true,
  });
  assert.match(i.instructions, /SUBJECT \/ IDENTITY/);
  assert.equal(i.imageDetail, "high");
  const e = assembleWriterRequest({
    intent: intent({ reference_intent: "edit_source", category: "image_edit" }),
    userInput: "x",
    mode: "default",
    hasImage: true,
  });
  assert.match(e.instructions, /CHANGE ONLY/);
  assert.match(e.instructions, /Build on the current edited image/);
  assert.equal(e.imageDetail, "high");
  // No image → no reference block even if the intent says otherwise
  const n = assembleWriterRequest({
    intent: intent({ reference_intent: "style" }),
    userInput: "x",
    mode: "default",
    hasImage: false,
  });
  assert.equal(n.instructions.includes("REFERENCE IMAGE ="), false);
});

test("core rules carry the Images 2.5 philosophy and drop v2.9 folklore", () => {
  assert.match(CORE_RULES, /minimum precise description/);
  assert.match(CORE_RULES, /Camera and lens specifications are optional/);
  assert.match(CORE_RULES, /never invent numbers, dates/i);
  assert.match(CORE_RULES, /CHANGE ONLY \/ PRESERVE \/ MATCH/);
  assert.match(CORE_RULES, /no fake checkerboard/);
  assert.match(CORE_RULES, /Never use Midjourney/);
  assert.equal(/editorial.*professional/i.test(CORE_RULES), false);
  assert.equal(/Stack 5-8/.test(CORE_RULES), false);
  assert.equal(/letter by letter/.test(CORE_RULES), false);
});

test("writer contracts have no category field; results validate per mode", () => {
  for (const c of Object.values(WRITER_CONTRACTS)) {
    const js = c.jsonSchema as { properties: Record<string, unknown> };
    assert.equal("category" in js.properties, false, c.name);
  }
  assert.equal(
    parseResult(WRITER_CONTRACTS.default, JSON.stringify({ prompt: "p", why_it_works: "w" })).ok,
    true,
  );
  assert.equal(
    parseResult(
      WRITER_CONTRACTS.default,
      JSON.stringify({ prompt: "p", category: "x", why_it_works: "w" }),
    ).ok,
    false,
  );
  assert.equal(
    parseResult(
      WRITER_CONTRACTS.BATCH,
      JSON.stringify({ prompts: ["a", "b", "c"], why_it_works: "w" }),
    ).ok,
    true,
  );
  assert.equal(
    parseResult(
      WRITER_CONTRACTS.JSON,
      JSON.stringify({
        prompt: "p",
        size: "s",
        quality: "q",
        aspect_ratio: "1:1",
        why_it_works: "w",
      }),
    ).ok,
    true,
  );
});
