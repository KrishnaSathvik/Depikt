import { inflateSync } from "node:zlib";
import { parsePngHeader } from "../png-mask.ts";
export interface Pixels {
  width: number;
  height: number;
  rgba: Uint8Array;
}
/** Bounded RGB/RGBA 8-bit PNG decoder. Unsupported formats are unavailable, never a pass. */
export function decodePng(bytes: Uint8Array): Pixels {
  const h = parsePngHeader(bytes);
  if (!h.ok || h.header.bitDepth !== 8 || ![2, 6].includes(h.header.colorType) || bytes[28] !== 0)
    throw new Error("Unsupported preservation image format");
  const { width, height } = h.header;
  if (width * height > 16_000_000) throw new Error("Image too large");
  const channels = h.header.colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const chunks: Uint8Array[] = [];
  let compressed = 0;
  for (let p = 8; p + 12 <= bytes.length; ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + p, bytes.length - p);
    const size = view.getUint32(0);
    if (p + size + 12 > bytes.length) throw new Error("Truncated PNG");
    const type = String.fromCharCode(...bytes.slice(p + 4, p + 8));
    if (type === "IDAT") {
      const part = bytes.slice(p + 8, p + 8 + size);
      chunks.push(part);
      compressed += size;
    }
    p += size + 12;
  }
  if (compressed > 20_000_000) throw new Error("PNG too large");
  const joined = new Uint8Array(compressed);
  let offset = 0;
  for (const part of chunks) {
    joined.set(part, offset);
    offset += part.length;
  }
  const raw = inflateSync(joined, { maxOutputLength: (stride + 1) * height });
  if (raw.length !== (stride + 1) * height) throw new Error("Invalid PNG pixels");
  const decoded = new Uint8Array(stride * height);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const pa = Math.abs(p - a),
      pb = Math.abs(p - b),
      pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    if (filter > 4) throw new Error("Invalid PNG filter");
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x,
        a = x >= channels ? decoded[i - channels] : 0,
        b = y ? decoded[i - stride] : 0,
        c = y && x >= channels ? decoded[i - stride - channels] : 0;
      decoded[i] =
        (raw[y * (stride + 1) + 1 + x] +
          (filter === 0
            ? 0
            : filter === 1
              ? a
              : filter === 2
                ? b
                : filter === 3
                  ? Math.floor((a + b) / 2)
                  : paeth(a, b, c))) &
        255;
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba.set(decoded.subarray(i * channels, i * channels + 3), i * 4);
    rgba[i * 4 + 3] = channels === 4 ? decoded[i * 4 + 3] : 255;
  }
  return { width, height, rgba };
}
export function outsideMaskDifference(source: Pixels, result: Pixels, mask: Pixels): number {
  if (
    source.width !== result.width ||
    source.height !== result.height ||
    source.width !== mask.width ||
    source.height !== mask.height
  )
    throw new Error("Preservation dimensions differ");
  let delta = 0,
    count = 0;
  for (let i = 0; i < source.rgba.length; i += 4) {
    // Transparent pixels are editable. Ignore partially transparent boundary pixels.
    if (mask.rgba[i + 3] !== 255) continue;
    for (let c = 0; c < 4; c++) {
      delta += Math.abs(source.rgba[i + c] - result.rgba[i + c]);
      count++;
    }
  }
  if (!count) throw new Error("Mask has no preserved area");
  return delta / (count * 255);
}
