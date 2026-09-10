import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateReferenceUploadRequest,
  exceedsReferenceLimit,
  MAX_REFERENCE_BYTES,
} from "../../src/lib/generation/reference-upload-request.ts";

const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("accepts a valid PNG data URL", () => {
  const r = validateReferenceUploadRequest({ dataUrl: `data:image/png;base64,${TINY_PNG_B64}` });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.upload.mimeType, "image/png");
    assert.equal(r.upload.extension, "png");
    assert.ok(r.upload.bytes.byteLength > 0);
  }
});

test("accepts jpeg and webp", () => {
  assert.equal(
    validateReferenceUploadRequest({ dataUrl: `data:image/jpeg;base64,${TINY_PNG_B64}` }).ok,
    true,
  );
  assert.equal(
    validateReferenceUploadRequest({ dataUrl: `data:image/webp;base64,${TINY_PNG_B64}` }).ok,
    true,
  );
});

test("rejects a non-object body", () => {
  assert.equal(validateReferenceUploadRequest(null).ok, false);
  assert.equal(validateReferenceUploadRequest("x").ok, false);
});

test("rejects a missing dataUrl", () => {
  assert.equal(validateReferenceUploadRequest({}).ok, false);
});

test("rejects a non-data: URL (e.g. a client-supplied storage path or http URL)", () => {
  const r = validateReferenceUploadRequest({ dataUrl: "https://evil.example/x.png" });
  assert.equal(r.ok, false);
});

test("rejects an unsupported MIME type", () => {
  const r = validateReferenceUploadRequest({ dataUrl: `data:image/gif;base64,${TINY_PNG_B64}` });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /format/i);
});

test("rejects malformed base64", () => {
  const r = validateReferenceUploadRequest({
    dataUrl: "data:image/png;base64,not-valid-base64!!!",
  });
  assert.equal(r.ok, false);
});

test("rejects an oversized payload", () => {
  // Fake a base64 string long enough to exceed MAX_REFERENCE_BYTES once decoded.
  const big = "A".repeat(Math.ceil((MAX_REFERENCE_BYTES + 1000) / 0.75));
  const r = validateReferenceUploadRequest({ dataUrl: `data:image/png;base64,${big}` });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /too large/i);
});

test("exceedsReferenceLimit enforces the V1 cap of 4", () => {
  assert.equal(exceedsReferenceLimit(4), false);
  assert.equal(exceedsReferenceLimit(5), true);
  assert.equal(exceedsReferenceLimit(0), false);
});
