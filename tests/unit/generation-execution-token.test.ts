import { test } from "node:test";
import assert from "node:assert/strict";
import {
  encryptExecutionToken,
  decryptExecutionToken,
  encryptExecutionTokenMap,
  extractExecutionToken,
} from "../../src/lib/generation/execution-token.ts";

const SECRET = "test-plan-secret";

test("encrypt/decrypt round-trips a token", () => {
  const token = "5f9ebf9e73900410a8446efaf5a961678e0dcc8cb956b914";
  const blob = encryptExecutionToken(token, SECRET);
  assert.notEqual(blob, token);
  assert.equal(decryptExecutionToken(blob, SECRET), token);
});

test("each encryption is unique (random IV)", () => {
  const a = encryptExecutionToken("same-token", SECRET);
  const b = encryptExecutionToken("same-token", SECRET);
  assert.notEqual(a, b);
  assert.equal(decryptExecutionToken(a, SECRET), decryptExecutionToken(b, SECRET));
});

test("decryption rejects a wrong secret and tampered blobs", () => {
  const blob = encryptExecutionToken("token", SECRET);
  assert.throws(() => decryptExecutionToken(blob, "other-secret"));
  const tampered = blob.slice(0, -4) + (blob.endsWith("AAAA") ? "BBBB" : "AAAA");
  assert.throws(() => decryptExecutionToken(tampered, SECRET));
  assert.throws(() => decryptExecutionToken("too-short", SECRET));
});

test("extractExecutionToken reads one job's token from a stored plan_json", () => {
  const map = encryptExecutionTokenMap({ "key-1": "token-1", "key-1:2": "token-2" }, SECRET);
  const planJson = { mode: "series", executionTokensEnc: map };
  assert.equal(extractExecutionToken(planJson, "key-1", SECRET), "token-1");
  assert.equal(extractExecutionToken(planJson, "key-1:2", SECRET), "token-2");
});

test("extractExecutionToken degrades to null on missing or undecryptable data", () => {
  assert.equal(extractExecutionToken(null, "k", SECRET), null);
  assert.equal(extractExecutionToken({}, "k", SECRET), null);
  assert.equal(extractExecutionToken({ executionTokensEnc: {} }, "k", SECRET), null);
  assert.equal(
    extractExecutionToken({ executionTokensEnc: { k: "not-a-real-blob" } }, "k", SECRET),
    null,
  );
  // Encrypted with a different secret: unreadable, not an error.
  const foreign = encryptExecutionTokenMap({ k: "t" }, "other-secret");
  assert.equal(extractExecutionToken({ executionTokensEnc: foreign }, "k", SECRET), null);
});
