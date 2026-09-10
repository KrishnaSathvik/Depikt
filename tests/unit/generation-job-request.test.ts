import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateGenerationRequest,
  MAX_PROMPT_CHARS,
} from "../../src/lib/generation/job-request.ts";

test("accepts a minimal valid generate request", () => {
  const r = validateGenerationRequest({
    operation: "generate",
    model: "flare",
    prompt: "a poster of a mountain at dawn",
    idempotencyKey: "abc123",
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.request.model, "flare");
    assert.equal(r.request.operation, "generate");
    assert.deepEqual(r.request.referenceAssetIds, []);
    assert.equal(r.request.sourceContextType, "direct");
  }
});

test("rejects a non-object body", () => {
  assert.equal(validateGenerationRequest(null).ok, false);
  assert.equal(validateGenerationRequest("nope").ok, false);
  assert.equal(validateGenerationRequest(42).ok, false);
});

test("rejects an unknown operation", () => {
  const r = validateGenerationRequest({
    operation: "delete",
    model: "flare",
    prompt: "x",
    idempotencyKey: "k",
  });
  assert.equal(r.ok, false);
});

test("rejects a client-submitted raw OpenAI model id instead of an alias", () => {
  const r = validateGenerationRequest({
    operation: "generate",
    model: "gpt-image-2.5-flare",
    prompt: "x",
    idempotencyKey: "k",
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /model/i);
});

test("rejects a client-submitted quality field silently by ignoring it (not part of the schema)", () => {
  // quality isn't part of ValidatedGenerationRequest at all — passing one must not
  // leak through or change server-side behavior.
  const r = validateGenerationRequest({
    operation: "generate",
    model: "flare",
    prompt: "x",
    idempotencyKey: "k",
    quality: "low",
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal("quality" in r.request, false);
});

test("rejects an empty prompt", () => {
  const r = validateGenerationRequest({
    operation: "generate",
    model: "flare",
    prompt: "  ",
    idempotencyKey: "k",
  });
  assert.equal(r.ok, false);
});

test("rejects an over-long prompt", () => {
  const r = validateGenerationRequest({
    operation: "generate",
    model: "flare",
    prompt: "a".repeat(MAX_PROMPT_CHARS + 1),
    idempotencyKey: "k",
  });
  assert.equal(r.ok, false);
});

test("rejects more than the V1 reference-image limit", () => {
  const r = validateGenerationRequest({
    operation: "edit",
    model: "sunburst",
    prompt: "x",
    idempotencyKey: "k",
    referenceAssetIds: ["a", "b", "c", "d", "e"],
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /4/);
});

test("accepts exactly the V1 reference-image limit", () => {
  const r = validateGenerationRequest({
    operation: "edit",
    model: "sunburst",
    prompt: "x",
    idempotencyKey: "k",
    referenceAssetIds: ["a", "b", "c", "d"],
  });
  assert.equal(r.ok, true);
});

test("edit requires either a sourceVersionId or a reference image", () => {
  const r = validateGenerationRequest({
    operation: "edit",
    model: "flare",
    prompt: "x",
    idempotencyKey: "k",
  });
  assert.equal(r.ok, false);
});

test("edit with only a sourceVersionId is valid", () => {
  const r = validateGenerationRequest({
    operation: "edit",
    model: "flare",
    prompt: "x",
    idempotencyKey: "k",
    sourceVersionId: "11111111-1111-1111-1111-111111111111",
  });
  assert.equal(r.ok, true);
});

test("missing idempotencyKey is rejected", () => {
  const r = validateGenerationRequest({ operation: "generate", model: "flare", prompt: "x" });
  assert.equal(r.ok, false);
});

test("rejects an invalid sourceContext.type", () => {
  const r = validateGenerationRequest({
    operation: "generate",
    model: "flare",
    prompt: "x",
    idempotencyKey: "k",
    sourceContext: { type: "chat" },
  });
  assert.equal(r.ok, false);
});

test("accepts a known sourceContext and carries its id through", () => {
  const r = validateGenerationRequest({
    operation: "generate",
    model: "flare",
    prompt: "x",
    idempotencyKey: "k",
    sourceContext: { type: "library", id: "curated-42" },
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.request.sourceContextType, "library");
    assert.equal(r.request.sourceContextId, "curated-42");
  }
});

test("structuredAspectRatio from the caller feeds the size resolver", () => {
  const r = validateGenerationRequest({
    operation: "generate",
    model: "flare",
    prompt: "a square icon", // text says square, structured intent should win
    idempotencyKey: "k",
    structuredAspectRatio: "4:5",
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.request.size.source, "structured");
    assert.deepEqual([r.request.size.width, r.request.size.height], [1024, 1280]);
  }
});
