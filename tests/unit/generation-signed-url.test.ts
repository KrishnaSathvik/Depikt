import { test } from "node:test";
import assert from "node:assert/strict";
import { createSignedUrlWithTimeout } from "../../src/lib/generation/signed-url.ts";

test("createSignedUrlWithTimeout returns the signed URL when storage answers", async () => {
  const url = await createSignedUrlWithTimeout(
    async () => ({ data: { signedUrl: "https://example.test/img.png" } }),
    200,
  );
  assert.equal(url, "https://example.test/img.png");
});

test("createSignedUrlWithTimeout returns null when storage never answers", async () => {
  const started = Date.now();
  const url = await createSignedUrlWithTimeout(async () => new Promise(() => {}), 40);
  assert.equal(url, null);
  assert.ok(Date.now() - started < 500);
});
