import { test } from "node:test";
import assert from "node:assert/strict";
import { exportMaskPng } from "../../src/lib/generation/edit-mask.ts";
import {
  hasAlphaChannel,
  parsePngHeader,
  validateMaskPng,
} from "../../src/lib/generation/png-mask.ts";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Header-only PNG fixture. validateMaskPng reads IHDR, not pixel data. */
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

test("hasAlphaChannel is true for color types 4 and 6 only", () => {
  assert.equal(hasAlphaChannel(4), true);
  assert.equal(hasAlphaChannel(6), true);
  assert.equal(hasAlphaChannel(2), false);
  assert.equal(hasAlphaChannel(0), false);
  assert.equal(hasAlphaChannel(3), false);
});

test("parsePngHeader reads width, height, bit depth, and color type from IHDR", () => {
  const bytes = pngIhdrOnly(8, 4, 6);
  const result = parsePngHeader(bytes);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.header, {
    width: 8,
    height: 4,
    bitDepth: 8,
    colorType: 6,
  });
});

test("parsePngHeader rejects bytes that are not a PNG", () => {
  const result = parsePngHeader(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(typeof result.error, "string");
  assert.ok(result.error.length > 0);
});

test("validateMaskPng accepts an exported mask", () => {
  const png = exportMaskPng(
    [{ mode: "paint", points: [{ x: 0.5, y: 0.5 }], radius: 0.25 }],
    8,
    8,
  );
  assert.deepEqual(validateMaskPng(png, 8, 8, 10_000), { ok: true });
});

test("validateMaskPng rejects JPEG bytes", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const result = validateMaskPng(jpeg, 8, 8, 10_000);
  assert.equal(result.ok, false);
});

test("validateMaskPng rejects wrong dimensions", () => {
  const png = exportMaskPng([], 8, 8);
  const result = validateMaskPng(png, 16, 16, 10_000);
  assert.equal(result.ok, false);
});

test("validateMaskPng rejects a PNG without alpha (color type 2)", () => {
  const result = validateMaskPng(pngIhdrOnly(8, 8, 2), 8, 8, 10_000);
  assert.equal(result.ok, false);
});

test("validateMaskPng rejects oversized bytes", () => {
  const png = exportMaskPng([], 8, 8);
  const result = validateMaskPng(png, 8, 8, png.byteLength - 1);
  assert.equal(result.ok, false);
});

test("validateMaskPng rejects empty or too-short bytes", () => {
  assert.equal(validateMaskPng(new Uint8Array(0), 8, 8, 10_000).ok, false);
  assert.equal(validateMaskPng(new Uint8Array(12), 8, 8, 10_000).ok, false);
});
