// Native image generation — server-side validation for precision-edit mask
// uploads. POST /api/generation/masks accepts a PNG data: URL plus the
// source version id; the browser never supplies a storage path.

import { hasAlphaChannel, parsePngHeader, validateMaskPng } from "./png-mask.ts";
import { MAX_REFERENCE_BYTES } from "./reference-upload-request.ts";

export const MAX_MASK_BYTES = MAX_REFERENCE_BYTES;
const DATA_URL_RE = /^data:([a-z0-9.+/-]+);base64,([a-zA-Z0-9+/=]+)$/i;

export interface ValidatedMaskUpload {
  sourceVersionId: string;
  bytes: Uint8Array;
  mimeType: "image/png";
}

export type MaskUploadValidation =
  | { ok: true; upload: ValidatedMaskUpload }
  | { ok: false; error: string };

function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function validateMaskUploadRequest(body: unknown): MaskUploadValidation {
  if (typeof body !== "object" || body === null)
    return { ok: false, error: "Invalid request body" };
  const b = body as Record<string, unknown>;

  if ("path" in b || "maskPath" in b) {
    return { ok: false, error: "Do not send a storage path; the server assigns mask storage" };
  }

  if (typeof b.sourceVersionId !== "string" || b.sourceVersionId.trim().length === 0) {
    return { ok: false, error: "sourceVersionId is required" };
  }

  if (typeof b.dataUrl !== "string") return { ok: false, error: "dataUrl is required" };

  const match = b.dataUrl.match(DATA_URL_RE);
  if (!match) return { ok: false, error: "dataUrl must be a base64 data: URL" };

  const mimeType = match[1].toLowerCase();
  if (mimeType !== "image/png") {
    return { ok: false, error: "Mask must be a PNG data URL" };
  }

  if (match[2].length > MAX_MASK_BYTES * 1.4) {
    return { ok: false, error: "Mask image is too large (max 25MB)" };
  }
  const bytes = decodeBase64(match[2]);
  if (bytes.byteLength > MAX_MASK_BYTES) {
    return { ok: false, error: "Mask image is too large (max 25MB)" };
  }
  if (bytes.byteLength === 0) {
    return { ok: false, error: "Mask image is empty" };
  }

  const parsed = parsePngHeader(bytes);
  if (!parsed.ok) return parsed;
  if (!hasAlphaChannel(parsed.header.colorType)) {
    return { ok: false, error: "PNG has no alpha channel" };
  }

  return {
    ok: true,
    upload: { sourceVersionId: b.sourceVersionId.trim(), bytes, mimeType: "image/png" },
  };
}

export function assertMaskMatchesSource(
  bytes: Uint8Array,
  width: number,
  height: number,
): { ok: true } | { ok: false; error: string } {
  return validateMaskPng(bytes, width, height, MAX_MASK_BYTES);
}
