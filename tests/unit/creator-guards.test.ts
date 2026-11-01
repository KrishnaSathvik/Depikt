import { test } from "node:test";
import assert from "node:assert/strict";
import { findPromptPlaceholders } from "../../src/lib/prompt-placeholders.ts";
import { friendlyToolError } from "../../src/lib/friendly-error.ts";

test("Library template slots are detected so Generate never spends a credit on them", () => {
  assert.deepEqual(
    findPromptPlaceholders("[SUBJECT] in vibrant [COLOR1] and [COLOR2], then [COLOR1] again"),
    ["[SUBJECT]", "[COLOR1]", "[COLOR2]"],
  );
  assert.deepEqual(findPromptPlaceholders("{character_name} from {franchise}"), [
    "{character_name}",
    "{franchise}",
  ]);
  // Ordinary prompts, exact text and lowercase brackets are left alone.
  assert.deepEqual(findPromptPlaceholders('A poster titled "NIGHT SESSIONS", 3:4'), []);
  assert.deepEqual(findPromptPlaceholders("a cat [optional: on a sofa]"), []);
});

test("tool errors are rewritten into plain, actionable sentences", () => {
  assert.match(friendlyToolError("AI service not configured"), /isn't responding/);
  assert.match(friendlyToolError("Too many requests"), /going a little fast/);
  assert.match(friendlyToolError("Network error. Try again."), /couldn't reach Depikt/);
  assert.equal(friendlyToolError(""), "Something went wrong. Please try again.");
  // Already-actionable messages pass through unchanged.
  assert.equal(
    friendlyToolError("Describe what you want to make first"),
    "Describe what you want to make first",
  );
});
