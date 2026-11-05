import { decode } from "fast-png";
import { parsePngHeader } from "./png-mask.ts";

export const MAX_MARKUP_BYTES = 50 * 1024 * 1024;
export const MAX_MARKUP_PIXELS = 16_777_216;
export function validateMarkupPng(bytes: Uint8Array, width: number, height: number): void {
  const header = parsePngHeader(bytes);
  if (
    !header.ok ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width * height > MAX_MARKUP_PIXELS ||
    bytes.length > MAX_MARKUP_BYTES
  )
    throw new Error("Invalid markup image size");
  if (
    header.header.width !== width ||
    header.header.height !== height ||
    header.header.colorType !== 6 ||
    header.header.bitDepth !== 8
  )
    throw new Error("Markup must be aligned RGBA PNG");
  const png = decode(bytes, { checkCrc: true });
  let transparent = false,
    annotated = false;
  for (let i = 3; i < png.data.length; i += 4) {
    const alpha = png.data[i];
    transparent ||= alpha === 0;
    annotated ||= alpha > 0;
  }
  if (!transparent || !annotated)
    throw new Error("Markup requires transparent pixels and annotations");
}
