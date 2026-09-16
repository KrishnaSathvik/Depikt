import { test } from "node:test";
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import {
  bytesToPngDataUrl,
  clamp01,
  exportMaskPng,
  hasPaintCoverage,
  normalizedToSourcePixel,
  pointerToNormalized,
  rasterizeMask,
  type MaskStroke,
} from "../../src/lib/generation/edit-mask.ts";
import { parsePngHeader, validateMaskPng } from "../../src/lib/generation/png-mask.ts";

test("exported API mask edits painted pixels and protects unselected/erased pixels", () => {
  const strokes: MaskStroke[] = [
    { mode: "paint", points: [{ x: 0.5, y: 0.5 }], radius: 0.3 },
    { mode: "erase", points: [{ x: 0.5, y: 0.5 }], radius: 0.05 },
  ];
  const png = Buffer.from(exportMaskPng(strokes, 32, 24));
  const chunks: Buffer[] = [];
  for (let offset = 8; offset < png.length; ) {
    const len = png.readUInt32BE(offset);
    if (png.toString("ascii", offset + 4, offset + 8) === "IDAT") {
      chunks.push(png.subarray(offset + 8, offset + 8 + len));
    }
    offset += len + 12;
  }
  const scanlines = inflateSync(Buffer.concat(chunks));
  const alpha = (x: number, y: number) => scanlines[y * (32 * 4 + 1) + 1 + x * 4 + 3];
  assert.equal(alpha(20, 12), 0, "painted area must be transparent for editing");
  assert.equal(alpha(0, 0), 255, "outside the selection must be protected");
  assert.equal(alpha(16, 12), 255, "erased area must be protected again");
});

function alphaAt(pixels: Uint8ClampedArray, x: number, y: number, width: number): number {
  return pixels[(y * width + x) * 4 + 3]!;
}

function someOpaque(pixels: Uint8ClampedArray): boolean {
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] === 255) return true;
  }
  return false;
}

function allTransparent(pixels: Uint8ClampedArray): boolean {
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] !== 0) return false;
  }
  return true;
}

test("clamp01 clamps below 0 and above 1", () => {
  assert.equal(clamp01(-0.2), 0);
  assert.equal(clamp01(0), 0);
  assert.equal(clamp01(0.5), 0.5);
  assert.equal(clamp01(1), 1);
  assert.equal(clamp01(1.7), 1);
});

test("pointer (250, 100) on a 500×200 rendered image maps to (0.5, 0.5)", () => {
  assert.deepEqual(pointerToNormalized(250, 100, 500, 200), { x: 0.5, y: 0.5 });
});

test("resizing the rendered size keeps the same normalized point", () => {
  const original = pointerToNormalized(250, 100, 500, 200);
  const scaled = pointerToNormalized(500, 200, 1000, 400);
  assert.deepEqual(original, { x: 0.5, y: 0.5 });
  assert.deepEqual(scaled, original);
});

test("normalized (0.5, 0.5) on a 1024×1024 source maps to a pixel near center", () => {
  const pixel = normalizedToSourcePixel({ x: 0.5, y: 0.5 }, 1024, 1024);
  assert.ok(Math.abs(pixel.x - 512) <= 1);
  assert.ok(Math.abs(pixel.y - 512) <= 1);
  assert.equal(Number.isInteger(pixel.x), true);
  assert.equal(Number.isInteger(pixel.y), true);
});

test("empty strokes rasterize to all-transparent pixels", () => {
  const pixels = rasterizeMask([], 8, 8);
  assert.equal(pixels.length, 8 * 8 * 4);
  assert.equal(allTransparent(pixels), true);
});

test("one paint stroke writes some opaque white pixels", () => {
  const strokes: MaskStroke[] = [{ mode: "paint", points: [{ x: 0.5, y: 0.5 }], radius: 0.25 }];
  const pixels = rasterizeMask(strokes, 8, 8);
  assert.equal(someOpaque(pixels), true);
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 255) {
      assert.equal(pixels[i], 255);
      assert.equal(pixels[i + 1], 255);
      assert.equal(pixels[i + 2], 255);
    }
  }
});

test("erase over paint restores those pixels to alpha 0", () => {
  const paint: MaskStroke = {
    mode: "paint",
    points: [{ x: 0.5, y: 0.5 }],
    radius: 0.5,
  };
  const erase: MaskStroke = {
    mode: "erase",
    points: [{ x: 0.5, y: 0.5 }],
    radius: 0.5,
  };
  assert.equal(someOpaque(rasterizeMask([paint], 8, 8)), true);
  assert.equal(allTransparent(rasterizeMask([paint, erase], 8, 8)), true);
});

test("paint strokes interpolate along segments so fast strokes do not gap", () => {
  const strokes: MaskStroke[] = [
    {
      mode: "paint",
      points: [
        { x: 0, y: 0.5 },
        { x: 1, y: 0.5 },
      ],
      radius: 0.15,
    },
  ];
  const pixels = rasterizeMask(strokes, 8, 8);
  const midX = normalizedToSourcePixel({ x: 0.5, y: 0.5 }, 8, 8).x;
  const midY = normalizedToSourcePixel({ x: 0.5, y: 0.5 }, 8, 8).y;
  assert.equal(alphaAt(pixels, midX, midY, 8), 255);
});

test("exportMaskPng writes a same-size RGBA PNG that validates", () => {
  const strokes: MaskStroke[] = [{ mode: "paint", points: [{ x: 0.5, y: 0.5 }], radius: 0.25 }];
  const png = exportMaskPng(strokes, 8, 8);
  const header = parsePngHeader(png);
  assert.equal(header.ok, true);
  if (!header.ok) return;
  assert.equal(header.header.width, 8);
  assert.equal(header.header.height, 8);
  assert.equal(header.header.colorType, 6);
  assert.deepEqual(validateMaskPng(png, 8, 8, 10_000), { ok: true });
});

test("bytesToPngDataUrl prefixes PNG bytes as a data URL", () => {
  const png = exportMaskPng([{ mode: "paint", points: [{ x: 0.5, y: 0.5 }], radius: 0.25 }], 8, 8);
  const dataUrl = bytesToPngDataUrl(png);
  assert.match(dataUrl, /^data:image\/png;base64,/);
  const b64 = dataUrl.slice("data:image/png;base64,".length);
  assert.deepEqual(Uint8Array.from(Buffer.from(b64, "base64")), png);
});

test("hasPaintCoverage is false until a paint stroke leaves opaque pixels", () => {
  const paint: MaskStroke = {
    mode: "paint",
    points: [{ x: 0.5, y: 0.5 }],
    radius: 0.5,
  };
  const erase: MaskStroke = {
    mode: "erase",
    points: [{ x: 0.5, y: 0.5 }],
    radius: 0.5,
  };
  assert.equal(hasPaintCoverage([], 8, 8), false);
  assert.equal(hasPaintCoverage([paint], 8, 8), true);
  assert.equal(hasPaintCoverage([paint, erase], 8, 8), false);
});
