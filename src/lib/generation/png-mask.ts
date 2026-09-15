export interface PngHeader {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
}

export type PngParseResult =
  | { ok: true; header: PngHeader }
  | { ok: false; error: string };

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const IHDR_MIN_BYTES = 33;
const STORED_BLOCK_MAX = 65535;

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let crc = i;
  for (let bit = 0; bit < 8; bit++) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  CRC_TABLE[i] = crc >>> 0;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a += byte;
    if (a >= 65521) a -= 65521;
    b += a;
    if (b >= 65521) b -= 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function hasPngSignature(bytes: Uint8Array): boolean {
  if (bytes.byteLength < PNG_SIGNATURE.length) return false;
  return PNG_SIGNATURE.every((value, i) => bytes[i] === value);
}

export function hasAlphaChannel(colorType: number): boolean {
  return colorType === 4 || colorType === 6;
}

export function parsePngHeader(bytes: Uint8Array): PngParseResult {
  if (bytes.byteLength < IHDR_MIN_BYTES) {
    return { ok: false, error: "PNG is empty or too short to have IHDR" };
  }
  if (!hasPngSignature(bytes)) {
    return { ok: false, error: "Not a PNG (wrong signature)" };
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunkLength = view.getUint32(8);
  const chunkType = String.fromCharCode(bytes[12]!, bytes[13]!, bytes[14]!, bytes[15]!);
  if (chunkType !== "IHDR" || chunkLength !== 13) {
    return { ok: false, error: "PNG is missing a valid IHDR chunk" };
  }
  return {
    ok: true,
    header: {
      width: view.getUint32(16),
      height: view.getUint32(20),
      bitDepth: bytes[24]!,
      colorType: bytes[25]!,
    },
  };
}

export function validateMaskPng(
  bytes: Uint8Array,
  expectedWidth: number,
  expectedHeight: number,
  maxBytes: number,
): { ok: true } | { ok: false; error: string } {
  if (bytes.byteLength > maxBytes) {
    return { ok: false, error: "PNG exceeds maxBytes" };
  }
  const parsed = parsePngHeader(bytes);
  if (!parsed.ok) return parsed;
  if (parsed.header.width !== expectedWidth || parsed.header.height !== expectedHeight) {
    return { ok: false, error: "PNG dimensions do not match expected size" };
  }
  if (!hasAlphaChannel(parsed.header.colorType)) {
    return { ok: false, error: "PNG has no alpha channel" };
  }
  return { ok: true };
}

function writeChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.byteLength);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.byteLength);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(data, 8);
  const crcInput = out.subarray(4, 8 + data.byteLength);
  view.setUint32(8 + data.byteLength, crc32(crcInput));
  return out;
}

function filterScanlines(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array {
  const stride = width * 4;
  const raw = new Uint8Array(height * (1 + stride));
  for (let y = 0; y < height; y++) {
    const dest = y * (1 + stride);
    raw[dest] = 0;
    raw.set(pixels.subarray(y * stride, y * stride + stride), dest + 1);
  }
  return raw;
}

function deflateStored(data: Uint8Array): Uint8Array {
  if (data.byteLength === 0) {
    return new Uint8Array([0x01, 0x00, 0x00, 0xff, 0xff]);
  }
  const blockCount = Math.ceil(data.byteLength / STORED_BLOCK_MAX);
  const out = new Uint8Array(data.byteLength + blockCount * 5);
  let src = 0;
  let dest = 0;
  while (src < data.byteLength) {
    const len = Math.min(STORED_BLOCK_MAX, data.byteLength - src);
    const final = src + len >= data.byteLength;
    out[dest] = final ? 0x01 : 0x00;
    out[dest + 1] = len & 0xff;
    out[dest + 2] = (len >>> 8) & 0xff;
    const nlen = (~len) & 0xffff;
    out[dest + 3] = nlen & 0xff;
    out[dest + 4] = (nlen >>> 8) & 0xff;
    out.set(data.subarray(src, src + len), dest + 5);
    src += len;
    dest += 5 + len;
  }
  return out;
}

function zlibStore(data: Uint8Array): Uint8Array {
  const deflated = deflateStored(data);
  const out = new Uint8Array(2 + deflated.byteLength + 4);
  out[0] = 0x78;
  out[1] = 0x01;
  out.set(deflated, 2);
  new DataView(out.buffer).setUint32(2 + deflated.byteLength, adler32(data));
  return out;
}

export function encodeRgbaPng(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array {
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlibStore(filterScanlines(pixels, width, height));
  const sig = new Uint8Array(PNG_SIGNATURE);
  const ihdrChunk = writeChunk("IHDR", ihdr);
  const idatChunk = writeChunk("IDAT", idat);
  const iendChunk = writeChunk("IEND", new Uint8Array(0));
  const out = new Uint8Array(
    sig.byteLength + ihdrChunk.byteLength + idatChunk.byteLength + iendChunk.byteLength,
  );
  let offset = 0;
  for (const part of [sig, ihdrChunk, idatChunk, iendChunk]) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}
