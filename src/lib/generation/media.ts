import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { parseGIF } from "gifuct-js";
import { assertGifStructure } from "./gif-structure.ts";
import type { ImageOutputFormat, ImageModelFamily } from "./provider-capabilities.ts";

export interface MediaOptions {
  outputFormat: ImageOutputFormat;
  family: ImageModelFamily;
  gif?: { frameCount: number; frameDurationMs: number };
}
export interface MediaMetadata {
  format: ImageOutputFormat;
  byteLength: number;
  width: number;
  height: number;
  frameCount?: number;
  frameDurationsMs?: number[];
  durationMs?: number;
  loopCount?: number | null;
}
export const MEDIA_MIME: Record<ImageOutputFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  gif: "image/gif",
};
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const SVG_ELEMENTS = new Set([
  "svg",
  "g",
  "defs",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "title",
  "desc",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
]);
const SVG_ATTRIBUTES = new Set([
  "xmlns",
  "viewBox",
  "width",
  "height",
  "id",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "d",
  "points",
  "transform",
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-dashoffset",
  "opacity",
  "clip-path",
  "clip-rule",
  "mask",
  "gradientUnits",
  "gradientTransform",
  "offset",
  "stop-color",
  "stop-opacity",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "preserveAspectRatio",
  "text-anchor",
  "dominant-baseline",
  "dx",
  "dy",
  "href",
]);

/** Parse XML, reject active/external content, and serialize only the static-vector allowlist. */
export function sanitizeSvg(bytes: Uint8Array): {
  bytes: Uint8Array;
  width: number;
  height: number;
} {
  if (!bytes.length || bytes.length > MAX_MEDIA_BYTES) throw new Error("Invalid SVG size");
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (/<!DOCTYPE|<!ENTITY|<\?/i.test(text.replace(/^\s*<\?xml[^?]*\?>/, "")))
    throw new Error("Unsafe SVG declaration");
  const doc = new DOMParser({
    onError: () => {
      throw new Error("Malformed SVG");
    },
  }).parseFromString(text, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.tagName !== "svg" || root.namespaceURI !== "http://www.w3.org/2000/svg")
    throw new Error("Expected SVG document");
  let count = 0;
  const visit = (node: typeof root, depth: number) => {
    if (++count > 20000 || depth > 64) throw new Error("SVG complexity limit");
    if (!SVG_ELEMENTS.has(node.tagName) || node.namespaceURI !== root.namespaceURI)
      throw new Error("Unsafe SVG element");
    for (let i = node.attributes.length - 1; i >= 0; i--) {
      const attr = node.attributes.item(i);
      if (!attr) continue;
      if (!SVG_ATTRIBUTES.has(attr.name)) throw new Error("Unsafe SVG attribute");
      if (attr.name === "href" && !/^#[A-Za-z_][\w.-]*$/.test(attr.value))
        throw new Error("External SVG resource");
      if (/url\s*\(/i.test(attr.value) && !/^url\(#[A-Za-z_][\w.-]*\)$/.test(attr.value))
        throw new Error("External SVG resource");
      if (/javascript:|data:|https?:|expression\s*\(/i.test(attr.value) && attr.name !== "xmlns")
        throw new Error("Unsafe SVG value");
    }
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1) visit(child as typeof root, depth + 1);
      else if (![3, 4, 8].includes(child.nodeType)) throw new Error("Unsafe SVG node");
    }
  };
  visit(root, 0);
  const vb = (root.getAttribute("viewBox") ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const dim = (name: string, fallback: number) => {
    const raw = root.getAttribute(name);
    const value = raw && /^\d+(?:\.\d+)?(?:px)?$/.test(raw) ? parseFloat(raw) : fallback;
    if (!Number.isFinite(value) || value <= 0 || value > 3840)
      throw new Error("Invalid SVG dimensions");
    return value;
  };
  return {
    bytes: new TextEncoder().encode(new XMLSerializer().serializeToString(root)),
    width: dim("width", vb[2] ?? NaN),
    height: dim("height", vb[3] ?? NaN),
  };
}

/** Parse actual GIF bytes, not requested animation settings. No frame decompression in preview. */
export function gifMetadata(bytes: Uint8Array): MediaMetadata {
  if (
    bytes.length < 14 ||
    bytes.length > MAX_MEDIA_BYTES ||
    !/^GIF8[79]a$/.test(new TextDecoder().decode(bytes.subarray(0, 6))) ||
    bytes[bytes.length - 1] !== 0x3b
  )
    throw new Error("Malformed GIF");
  assertGifStructure(bytes);
  const gif = parseGIF(bytes.slice().buffer);
  const width = gif.lsd.width,
    height = gif.lsd.height;
  const frames = gif.frames.filter((frame) => "image" in frame);
  if (
    !width ||
    !height ||
    width > 3840 ||
    height > 3840 ||
    frames.length < 2 ||
    frames.length > 64 ||
    width * height * frames.length > 64 * 8_294_400
  )
    throw new Error("GIF dimensions or frame count exceed limits");
  const durations = frames.map((frame) => {
    const delay = (frame.gce?.delay ?? 0) * 10;
    if (delay < 20 || delay > 2000) throw new Error("Invalid GIF frame duration");
    const dims = frame.image?.descriptor;
    if (!dims || dims.left + dims.width > width || dims.top + dims.height > height)
      throw new Error("GIF frame outside canvas");
    return delay;
  });
  const application = gif.frames.find(
    (f) => "application" in f && f.application.id === "NETSCAPE2.0",
  );
  const app = application && "application" in application ? application.application : undefined;
  const loop = app?.blocks;
  return {
    format: "gif",
    byteLength: bytes.length,
    width,
    height,
    frameCount: frames.length,
    frameDurationsMs: durations,
    durationMs: durations.reduce((a, b) => a + b, 0),
    loopCount: loop && loop.length >= 3 ? loop[1] + loop[2] * 256 : null,
  };
}

export function validateGeneratedMedia(
  bytes: Uint8Array,
  format: ImageOutputFormat,
  width: number,
  height: number,
) {
  if (!bytes.length || bytes.length > MAX_MEDIA_BYTES)
    throw new Error("Invalid generated media size");
  if (format === "svg") {
    const svg = sanitizeSvg(bytes);
    return {
      bytes: svg.bytes,
      mimeType: MEDIA_MIME.svg,
      metadata: {
        format,
        width: svg.width,
        height: svg.height,
        byteLength: svg.bytes.length,
      } as MediaMetadata,
    };
  }
  if (format === "gif") return { bytes, mimeType: MEDIA_MIME.gif, metadata: gifMetadata(bytes) };
  return {
    bytes,
    mimeType: MEDIA_MIME[format],
    metadata: { format, width, height, byteLength: bytes.length } as MediaMetadata,
  };
}
