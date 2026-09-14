import { test } from "node:test";
import assert from "node:assert/strict";
import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";
import { IntentSchema } from "../../src/lib/prompt-engine/intent.ts";

test("vnext-1 suite has 11 unique cases with valid fixture intents", () => {
  const cases = loadVnext1Cases();
  assert.equal(cases.length, 11);
  assert.equal(new Set(cases.map((c) => c.id)).size, 11);
  for (const c of cases) {
    assert.ok(c.prompt.trim().length > 0, c.id);
    assert.equal(IntentSchema.safeParse(c.fixture_intent).success, true, c.id);
    assert.ok(["single", "series", "collage", "contact_sheet", "edit"].includes(c.expected.mode));
    assert.ok(c.expected.desiredCount >= 1);
    assert.ok(c.expected.autoCount >= 1);
    assert.ok(c.expected.autoCount <= c.expected.desiredCount);
  }
});
