// Native image generation — server-side validation for reference uploads.
// POST /api/generation/references accepts a data: URL (the client already
// processes files through fileToReferenceState/processReferenceImage, the
// same pipeline Prompt's reference picker uses), never a storage path.

import { MAX_REFERENCE_IMAGES_V1 } from "./models.ts";

export const MAX_REFERENCE_BYTES = 10 * 1024 * 1024; // matches src/lib/reference-image.ts MAX_UPLOAD_BYTES
const ALLOWED_MIME: Record<string, "png" | "jpg" | "webp"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const DATA_URL_RE = /^data:([a-z0-9.+/-]+);base64,([a-zA-Z0-9+/=]+)$/i;

export interface ValidatedReferenceUpload {
  bytes: Uint8Array;
  mimeType: string;
  extension: "png" | "jpg" | "webp";
}

export type ReferenceUploadValidation =
  | { ok: true; upload: ValidatedReferenceUpload }
  | { ok: false; error: string };

function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function validateReferenceUploadRequest(body: unknown): ReferenceUploadValidation {
  if (typeof body !== "object" || body === null)
    return { ok: false, error: "Invalid request body" };
  const b = body as Record<string, unknown>;

  if (typeof b.dataUrl !== "string") return { ok: false, error: "dataUrl is required" };

  const match = b.dataUrl.match(DATA_URL_RE);
  if (!match) return { ok: false, error: "dataUrl must be a base64 data: URL" };

  const mimeType = match[1].toLowerCase();
  const extension = ALLOWED_MIME[mimeType];
  if (!extension) {
    return { ok: false, error: "Unsupported image format (use PNG, JPEG, or WEBP)" };
  }

  // Reject before the (comparatively expensive) base64 decode: a
  // base64-encoded size check first, then the exact byte count.
  if (match[2].length > MAX_REFERENCE_BYTES * 1.4) {
    return { ok: false, error: "Reference image is too large (max 10MB)" };
  }
  const bytes = decodeBase64(match[2]);
  if (bytes.byteLength > MAX_REFERENCE_BYTES) {
    return { ok: false, error: "Reference image is too large (max 10MB)" };
  }
  if (bytes.byteLength === 0) {
    return { ok: false, error: "Reference image is empty" };
  }

  return { ok: true, upload: { bytes, mimeType, extension } };
}

/** V1 cap on references attached to a single generation request. */
export function exceedsReferenceLimit(count: number): boolean {
  return count > MAX_REFERENCE_IMAGES_V1;
}
