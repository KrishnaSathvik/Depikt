/**
 * Turns a raw tool/API error into a sentence a person can act on. Server
 * messages such as "AI service not configured" or stack-ish text are never
 * shown as-is; plain, actionable messages pass through unchanged.
 */
export function friendlyToolError(raw?: string | null): string {
  const msg = (raw ?? "").trim();
  if (!msg) return "Something went wrong. Please try again.";
  if (/too many|rate.?limit|429/i.test(msg)) {
    return "You're going a little fast. Wait a moment, then try again.";
  }
  if (/network/i.test(msg)) {
    return "We couldn't reach Depikt. Check your connection and try again.";
  }
  if (
    /not configured|unavailable|internal|server error|timeout|timed out|5\d\d|upstream/i.test(msg)
  ) {
    return "The AI service isn't responding right now. Please try again in a moment.";
  }
  return msg;
}
