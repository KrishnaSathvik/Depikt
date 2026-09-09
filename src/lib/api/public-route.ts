// Shared plumbing for the public API routes: CORS headers, JSON errors,
// the in-memory per-IP rate limiter, and request-body validation helpers.

import { isReferenceIntent, type ReferenceIntent } from "../prompt-engine/reference.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export const sseHeaders = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
  ...corsHeaders,
};

// In-memory IP rate limiter (best-effort; per-instance). Shared by both
// public routes so a client cannot double its budget by alternating them.
// Limits: 10 requests / minute and 60 requests / hour per IP.
const RATE_WINDOW_MIN_MS = 60_000;
const RATE_WINDOW_HOUR_MS = 3_600_000;
const RATE_LIMIT_MIN = 10;
const RATE_LIMIT_HOUR = 60;
const ipHits = new Map<string, number[]>();

export function getClientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

export function rateLimitExceeded(ip: string, now = Date.now()): boolean {
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_HOUR_MS);
  const recentMin = hits.filter((t) => now - t < RATE_WINDOW_MIN_MS).length;
  if (recentMin >= RATE_LIMIT_MIN || hits.length >= RATE_LIMIT_HOUR) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) {
      const fresh = v.filter((t) => now - t < RATE_WINDOW_HOUR_MS);
      if (fresh.length === 0) ipHits.delete(k);
      else ipHits.set(k, fresh);
    }
  }
  return false;
}

/** Test hook. */
export function _resetRateLimiter(): void {
  ipHits.clear();
}

export const MAX_INPUT_CHARS = 4000;
export const MAX_IMAGE_DATA_URL_CHARS = 2 * 1024 * 1024;
export const MAX_REMIX_CHARS = 8000;

export function validateText(
  value: unknown,
  field: string,
  max = MAX_INPUT_CHARS,
): string | Response {
  if (!value || typeof value !== "string" || value.trim().length === 0)
    return jsonError(`${field} is required`, 400);
  if (value.length > max) return jsonError(`Input too long (max ${max} chars)`, 400);
  return value;
}

/** Optional base64 image data URL. Returns null when absent. */
export function validateImage(value: unknown): string | null | Response {
  if (value === undefined || value === null || value === "") return null;
  if (
    typeof value !== "string" ||
    !value.startsWith("data:image/") ||
    value.length > MAX_IMAGE_DATA_URL_CHARS
  ) {
    return jsonError("Invalid reference image (must be a data:image/ URL under 2MB)", 400);
  }
  return value;
}

/** Optional reference intent from the UI selector. */
export function validateReferenceIntent(value: unknown): ReferenceIntent | "auto" | Response {
  if (value === undefined || value === null || value === "" || value === "auto") return "auto";
  if (isReferenceIntent(value) && value !== "none") return value;
  return jsonError("Invalid referenceIntent", 400);
}

/** Optional remix reference; silently ignored when over-long (legacy behavior). */
export function validateRemixRef(value: unknown): string | null {
  return value && typeof value === "string" && value.length <= MAX_REMIX_CHARS ? value : null;
}
