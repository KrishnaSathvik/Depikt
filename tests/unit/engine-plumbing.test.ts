import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseOutputFormat, detectAlpha, fitWithin } from "../../src/lib/image-utils.ts";
import { normalizeHistoryRecord, type HistoryRecord } from "../../src/lib/db.ts";
import { MAX_STORED_IMAGE_CHARS, prepareHistoryRecord } from "../../src/lib/history-db.ts";
import {
  _resetRateLimiter,
  rateLimitExceeded,
  validateImage,
  validateReferenceIntent,
  validateRemixRef,
  validateText,
} from "../../src/lib/api/public-route.ts";

test("image processing: output format selection", () => {
  assert.equal(
    chooseOutputFormat({ sourceMime: "image/jpeg", hasAlpha: false, preferLossless: false }),
    "image/jpeg",
  );
  assert.equal(
    chooseOutputFormat({ sourceMime: "image/png", hasAlpha: true, preferLossless: false }),
    "image/png",
  );
  assert.equal(
    chooseOutputFormat({ sourceMime: "image/png", hasAlpha: false, preferLossless: false }),
    "image/png",
  );
  assert.equal(
    chooseOutputFormat({ sourceMime: "image/jpeg", hasAlpha: false, preferLossless: true }),
    "image/png",
  );
  assert.equal(
    chooseOutputFormat({ sourceMime: "image/webp", hasAlpha: false, preferLossless: false }),
    "image/jpeg",
  );
});

test("image processing: fit and alpha detection", () => {
  assert.deepEqual(fitWithin(4000, 3000, 1024), { width: 1024, height: 768 });
  assert.deepEqual(fitWithin(800, 600, 1024), { width: 800, height: 600 });
  assert.deepEqual(fitWithin(600, 4000, 1024), { width: 154, height: 1024 });
  const opaque = new Uint8ClampedArray([0, 0, 0, 255, 1, 1, 1, 255]);
  assert.equal(detectAlpha(opaque, 1), false);
  const translucent = new Uint8ClampedArray([0, 0, 0, 255, 1, 1, 1, 128]);
  assert.equal(detectAlpha(translucent, 1), true);
});

test("history v2: old records normalize without loss; images are bounded; intent derived", () => {
  const old: HistoryRecord = {
    id: "a",
    kind: "generate",
    roughIdea: "x",
    result: { prompt: "p", prompt_version: "depikt-v2.9.0" },
    createdAt: 1,
  };
  const n = normalizeHistoryRecord(old);
  assert.equal(n.promptVersion, "depikt-v2.9.0");
  assert.equal(n.referenceImage, undefined);
  assert.equal(n.intent, undefined);
  assert.deepEqual(n.result, old.result);

  const small = prepareHistoryRecord(
    {
      kind: "generate",
      roughIdea: "x",
      result: {
        prompt: "p",
        prompt_version: "depikt-v3.0.0-images-2.5",
        intent: { category: "poster" },
      },
      referenceImage: "data:image/png;base64,AAAA",
      referenceIntent: "style",
    },
    "id1",
    5,
  );
  assert.equal(small.referenceImage, "data:image/png;base64,AAAA");
  assert.equal(small.referenceIntent, "style");
  assert.deepEqual(small.intent, { category: "poster" });
  assert.equal(small.promptVersion, "depikt-v3.0.0-images-2.5");

  const big = prepareHistoryRecord(
    {
      kind: "generate",
      roughIdea: "x",
      result: {},
      referenceImage: "d".repeat(MAX_STORED_IMAGE_CHARS + 1),
    },
    "id2",
    5,
  );
  assert.equal(big.referenceImage, undefined);
  assert.equal(big.referenceImageOmitted, true);
});

test("public route validation helpers", () => {
  assert.equal(validateText("hi", "x"), "hi");
  assert.ok(validateText("", "prompt") instanceof Response);
  assert.ok(validateText("a".repeat(4001), "x") instanceof Response);
  assert.equal(validateImage(undefined), null);
  assert.equal(validateImage("data:image/png;base64,AAA"), "data:image/png;base64,AAA");
  assert.ok(validateImage("http://x/y.png") instanceof Response);
  assert.equal(validateReferenceIntent(undefined), "auto");
  assert.equal(validateReferenceIntent("sketch_layout"), "sketch_layout");
  assert.ok(validateReferenceIntent("none") instanceof Response);
  assert.ok(validateReferenceIntent("hack") instanceof Response);
  assert.equal(validateRemixRef("r"), "r");
  assert.equal(validateRemixRef("r".repeat(8001)), null);
});

test("shared rate limiter: 10/min and 60/hour per IP", () => {
  _resetRateLimiter();
  const t0 = 1_000_000;
  for (let i = 0; i < 10; i++) assert.equal(rateLimitExceeded("1.1.1.1", t0 + i), false);
  assert.equal(rateLimitExceeded("1.1.1.1", t0 + 11), true);
  assert.equal(rateLimitExceeded("2.2.2.2", t0 + 11), false);
  // a minute later the per-minute window is clear
  assert.equal(rateLimitExceeded("1.1.1.1", t0 + 61_000), false);
});
