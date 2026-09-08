// Error classification for OpenAI calls. Pure functions, unit-tested.

export type FailureKind =
  | "timeout" // our AbortSignal fired
  | "network" // fetch threw (DNS, reset, etc.)
  | "rate_limited" // HTTP 429
  | "server" // HTTP 5xx
  | "auth" // HTTP 401 / 403
  | "billing" // HTTP 402
  | "bad_request" // HTTP 400 / 404 / 422 — our request is wrong, do not retry
  | "malformed_output" // response arrived but did not parse/validate
  | "refusal" // model returned a refusal item
  | "incomplete" // response.status === "incomplete" (e.g. max tokens)
  | "unknown";

export class OpenAIRequestError extends Error {
  kind: FailureKind;
  status?: number;
  retryable: boolean;
  requestId?: string;
  detail?: string;

  constructor(
    kind: FailureKind,
    message: string,
    opts: { status?: number; requestId?: string; detail?: string } = {},
  ) {
    super(message);
    this.name = "OpenAIRequestError";
    this.kind = kind;
    this.status = opts.status;
    this.requestId = opts.requestId;
    this.detail = opts.detail;
    this.retryable = isRetryableKind(kind);
  }
}

export function isRetryableKind(kind: FailureKind): boolean {
  switch (kind) {
    case "timeout":
    case "network":
    case "rate_limited":
    case "server":
    case "malformed_output":
      return true;
    default:
      return false;
  }
}

export function classifyHttpStatus(status: number): FailureKind {
  if (status === 429) return "rate_limited";
  if (status === 401 || status === 403) return "auth";
  if (status === 402) return "billing";
  if (status >= 500) return "server";
  if (status >= 400) return "bad_request";
  return "unknown";
}

/** Classify a thrown value from fetch()/reader.read(). */
export function classifyThrown(err: unknown, timedOut: boolean): FailureKind {
  if (timedOut) return "timeout";
  if (err && typeof err === "object" && (err as { name?: string }).name === "AbortError")
    return "timeout";
  return "network";
}

/** Message safe to show to end users. Never includes upstream detail. */
export function clientMessageFor(kind: FailureKind): string {
  switch (kind) {
    case "rate_limited":
      return "Rate limit reached. Please wait a moment and try again.";
    case "billing":
      return "AI service is temporarily unavailable. Please try again later.";
    case "timeout":
      return "The request took too long. Please try again.";
    case "malformed_output":
      return "Invalid AI response format";
    case "refusal":
      return "The AI declined this request. Try rephrasing your idea.";
    default:
      return "AI service error";
  }
}
