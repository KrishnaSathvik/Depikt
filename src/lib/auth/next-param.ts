// Safe `?next=` handling for /sign-in and /sign-up.
//
// Only a same-origin internal path is ever honored. Anything else (absolute
// URLs, protocol-relative, backslash tricks, encoded double slashes, control
// characters, absurd lengths) falls back — never an open redirect.

const MAX_LENGTH = 512;

export function safeNextPath(input: unknown, fallback = "/"): string {
  if (typeof input !== "string") return fallback;
  if (input.length === 0 || input.length > MAX_LENGTH) return fallback;
  if (!input.startsWith("/")) return fallback;
  if (input.startsWith("//") || input.startsWith("/\\")) return fallback;
  // Whitespace and control characters (header/line injection, odd normalization).
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    if (c <= 0x1f || c === 0x7f) return fallback;
  }
  if (/\s/.test(input)) return fallback;
  if (input.includes("\\")) return fallback;
  // Encoded "//" or "\" that a browser might normalize back.
  if (/%2f%2f|%5c/i.test(input)) return fallback;
  try {
    const url = new URL(input, "https://depikt.invalid");
    if (url.origin !== "https://depikt.invalid") return fallback;
    if (!url.pathname.startsWith("/") || url.pathname.startsWith("//")) return fallback;
  } catch {
    return fallback;
  }
  return input;
}
