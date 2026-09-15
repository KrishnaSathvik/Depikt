import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { exportMaskPng } from "../../src/lib/generation/edit-mask.ts";
import { validateMaskPng } from "../../src/lib/generation/png-mask.ts";
import {
  MAX_MASK_BYTES,
  assertMaskMatchesSource,
  validateMaskUploadRequest,
} from "../../src/lib/generation/mask-upload-request.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function pngIhdrOnly(width: number, height: number, colorType: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set(PNG_SIGNATURE, 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes[24] = 8;
  bytes[25] = colorType;
  bytes[26] = 0;
  bytes[27] = 0;
  bytes[28] = 0;
  return bytes;
}

function pngDataUrl(bytes: Uint8Array): string {
  return `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
}

function validMaskPng(): Uint8Array {
  return exportMaskPng([{ mode: "paint", points: [{ x: 0.5, y: 0.5 }], radius: 0.25 }], 8, 8);
}

test("accepts a valid PNG data URL with sourceVersionId", () => {
  const png = validMaskPng();
  const r = validateMaskUploadRequest({
    sourceVersionId: "version-1",
    dataUrl: pngDataUrl(png),
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.upload.sourceVersionId, "version-1");
    assert.equal(r.upload.mimeType, "image/png");
    assert.ok(r.upload.bytes.byteLength > 0);
  }
});

test("rejects a missing sourceVersionId", () => {
  const r = validateMaskUploadRequest({ dataUrl: pngDataUrl(validMaskPng()) });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /sourceVersionId/i);
});

test("rejects an empty sourceVersionId", () => {
  const r = validateMaskUploadRequest({
    sourceVersionId: "  ",
    dataUrl: pngDataUrl(validMaskPng()),
  });
  assert.equal(r.ok, false);
});

test("rejects a JPEG data URL", () => {
  const r = validateMaskUploadRequest({
    sourceVersionId: "version-1",
    dataUrl: `data:image/jpeg;base64,${Buffer.from(validMaskPng()).toString("base64")}`,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /png/i);
});

test("rejects a raw storage path as dataUrl", () => {
  const r = validateMaskUploadRequest({
    sourceVersionId: "version-1",
    dataUrl: "users/attacker/masks/x.png",
  });
  assert.equal(r.ok, false);
});

test("rejects a body that includes path", () => {
  const r = validateMaskUploadRequest({
    sourceVersionId: "version-1",
    dataUrl: pngDataUrl(validMaskPng()),
    path: "users/attacker/masks/x.png",
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /path/i);
});

test("rejects a body that includes maskPath", () => {
  const r = validateMaskUploadRequest({
    sourceVersionId: "version-1",
    dataUrl: pngDataUrl(validMaskPng()),
    maskPath: "users/attacker/masks/x.png",
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /path/i);
});

test("validateMaskPng rejects wrong dimensions", () => {
  const png = validMaskPng();
  const result = validateMaskPng(png, 16, 16, MAX_MASK_BYTES);
  assert.equal(result.ok, false);
  const matched = assertMaskMatchesSource(png, 16, 16);
  assert.equal(matched.ok, false);
});

test("validateMaskPng rejects a PNG without alpha", () => {
  const result = validateMaskPng(pngIhdrOnly(8, 8, 2), 8, 8, MAX_MASK_BYTES);
  assert.equal(result.ok, false);
});

test("rejects an oversized payload", () => {
  const big = "A".repeat(Math.ceil((MAX_MASK_BYTES + 1000) / 0.75));
  const r = validateMaskUploadRequest({
    sourceVersionId: "version-1",
    dataUrl: `data:image/png;base64,${big}`,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /too large/i);
});

test("validateMaskPng rejects oversized bytes", () => {
  const png = validMaskPng();
  const result = validateMaskPng(png, 8, 8, png.byteLength - 1);
  assert.equal(result.ok, false);
});

test("masks route authenticates, loads image_versions, and returns only assetId", () => {
  const src = read("src/routes/api/generation/masks.ts");
  assert.match(src, /authenticateGenerationRequest\(request\)/);
  assert.match(src, /\.from\("image_versions"\)/);
  assert.match(src, /maskAssetStoragePath\(userId, assetId\)/);
  assert.match(src, /JSON\.stringify\(\{\s*assetId\s*\}\)/);
  assert.doesNotMatch(src, /JSON\.stringify\(\{[^}]*\bpath\b/);
});

test("uploadEditMask posts sourceVersionId and dataUrl to /api/generation/masks", () => {
  const src = read("src/lib/generation/client.ts");
  const start = src.indexOf("export function uploadEditMask");
  assert.ok(start >= 0, "uploadEditMask is exported");
  const nextExport = src.indexOf("\nexport ", start + 1);
  const fn = nextExport === -1 ? src.slice(start) : src.slice(start, nextExport);
  assert.match(fn, /\/api\/generation\/masks/);
  assert.match(fn, /sourceVersionId/);
  assert.match(fn, /dataUrl/);
  assert.doesNotMatch(fn, /\bpath\b/);
});
