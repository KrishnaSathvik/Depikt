import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateGenerationRequest,
  MAX_PROMPT_CHARS,
} from "../../src/lib/generation/job-request.ts";

test("accepts a minimal valid generate request", () => {
  const r = validateGenerationRequest({
    operation: "generate",
    prompt: "a poster of a mountain at dawn",
    idempotencyKey: "abc123",
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.request.operation, "generate");
    assert.deepEqual(r.request.referenceAssetIds, []);
    assert.equal(r.request.sourceContextType, "direct");
    assert.equal("model" in r.request, false); // model is never a client-submitted field
  }
});

test("rejects a non-object body", () => {
  assert.equal(validateGenerationRequest(null).ok, false);
  assert.equal(validateGenerationRequest("nope").ok, false);
  assert.equal(validateGenerationRequest(42).ok, false);
});

test("rejects an unknown operation", () => {
  const r = validateGenerationRequest({ operation: "delete", prompt: "x", idempotencyKey: "k" });
  assert.equal(r.ok, false);
});

test("a client-submitted model field is simply ignored, never trusted", () => {
  // There is no user-facing model choice; a client sending one (an old
  // client, a crafted request) must not influence anything.
  const r = validateGenerationRequest({
    operation: "generate",
    model: "sunburst",
    prompt: "x",
    idempotencyKey: "k",
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal("model" in r.request, false);
});

test("a client-submitted quality field is silently ignored (not part of the schema)", () => {
  const r = validateGenerationRequest({
    operation: "generate",
    prompt: "x",
    idempotencyKey: "k",
    quality: "low",
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal("quality" in r.request, false);
});

test("rejects an empty prompt", () => {
  const r = validateGenerationRequest({ operation: "generate", prompt: "  ", idempotencyKey: "k" });
  assert.equal(r.ok, false);
});

test("rejects an over-long prompt", () => {
  const r = validateGenerationRequest({
    operation: "generate",
    prompt: "a".repeat(MAX_PROMPT_CHARS + 1),
    idempotencyKey: "k",
  });
  assert.equal(r.ok, false);
});

test("rejects more than the V1 reference-image limit", () => {
  const r = validateGenerationRequest({
    operation: "edit",
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
    prompt: "x",
    idempotencyKey: "k",
    referenceAssetIds: ["a", "b", "c", "d"],
  });
  assert.equal(r.ok, true);
});

test("edit requires either a sourceVersionId or a reference image", () => {
  const r = validateGenerationRequest({ operation: "edit", prompt: "x", idempotencyKey: "k" });
  assert.equal(r.ok, false);
});

test("edit with only a sourceVersionId is valid", () => {
  const r = validateGenerationRequest({
    operation: "edit",
    prompt: "x",
    idempotencyKey: "k",
    sourceVersionId: "11111111-1111-1111-1111-111111111111",
  });
  assert.equal(r.ok, true);
});

test("missing idempotencyKey is rejected", () => {
  const r = validateGenerationRequest({ operation: "generate", prompt: "x" });
  assert.equal(r.ok, false);
});

test("rejects an invalid sourceContext.type", () => {
  const r = validateGenerationRequest({
    operation: "generate",
    prompt: "x",
    idempotencyKey: "k",
    sourceContext: { type: "chat" },
  });
  assert.equal(r.ok, false);
});

test("accepts a known sourceContext and carries its id through", () => {
  const r = validateGenerationRequest({
    operation: "generate",
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

test("no routingHints submitted -> routingHints is null", () => {
  const r = validateGenerationRequest({ operation: "generate", prompt: "x", idempotencyKey: "k" });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.request.routingHints, null);
});

test("routingHints are parsed through for the model router to consume", () => {
  const r = validateGenerationRequest({
    operation: "generate",
    prompt: "x",
    idempotencyKey: "k",
    routingHints: {
      category: "infographic",
      exactTextCount: 3,
      referenceIntent: "subject_identity",
    },
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.deepEqual(r.request.routingHints, {
      category: "infographic",
      exactTextCount: 3,
      referenceIntent: "subject_identity",
    });
  }
});

test("malformed routingHints (wrong types) are dropped rather than trusted as-is", () => {
  const r = validateGenerationRequest({
    operation: "generate",
    prompt: "x",
    idempotencyKey: "k",
    routingHints: { category: 42, exactTextCount: "three" },
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.request.routingHints, null);
});
