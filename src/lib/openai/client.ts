// Responses API client for structured outputs.
//
// One small module, no SDK: the app runs on Cloudflare Workers and the
// benchmark harness runs on Node, and both only need `fetch`. Handles:
//   - request shaping (instructions, input items, text.format, reasoning, temperature)
//   - per-attempt timeout via AbortSignal
//   - bounded retry for transport/server failures and malformed output
//   - usage + request-id telemetry
//   - non-streaming and streaming (text deltas) modes
//
// Verified against the Responses API reference on 2026-09-08.

import {
  estimateCostUsd,
  resolveRequestParams,
  type ModelConfig,
  type TokenUsage,
} from "./models.ts";
import { parseResult, textFormatFor, type ResultContract } from "./schemas.ts";
import {
  OpenAIRequestError,
  classifyHttpStatus,
  classifyThrown,
  type FailureKind,
} from "./errors.ts";
import { SseParser } from "./sse.ts";

export const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

export type ImageDetail = "low" | "high" | "auto" | "original";

export interface InputText {
  type: "input_text";
  text: string;
}
export interface InputImage {
  type: "input_image";
  image_url: string;
  detail: ImageDetail;
}
export interface InputMessage {
  role: "user" | "developer" | "system";
  content: string | Array<InputText | InputImage>;
}

export interface StructuredCall<T> {
  apiKey: string;
  config: ModelConfig;
  /** System-level guidance (Responses `instructions`). */
  instructions: string;
  input: InputMessage[];
  contract: ResultContract<T>;
  /** External cancel (e.g. client disconnected). */
  signal?: AbortSignal;
  /** Persist on OpenAI's side. Defaults to false (public product, no need). */
  store?: boolean;
  /** Override for tests. */
  fetchImpl?: typeof fetch;
  /** Max attempts including the first. Default 2. */
  maxAttempts?: number;
  /** Sleep override for tests. */
  sleep?: (ms: number) => Promise<void>;
}

export interface StructuredOutcome<T> {
  parsed: T;
  rawText: string;
  usage: TokenUsage;
  estimatedCostUsd: number;
  model: string;
  latencyMs: number;
  attempts: number;
  requestId?: string;
  /** Present when the API reports a non-"completed" status but text still parsed. */
  status: string;
}

export type StreamEvent<T> =
  | { type: "delta"; accumulated: string }
  | { type: "done"; outcome: StructuredOutcome<T> }
  | { type: "error"; kind: FailureKind; message: string };

const EMPTY_USAGE: TokenUsage = {
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
};

function buildBody<T>(call: StructuredCall<T>, stream: boolean): Record<string, unknown> {
  const params = resolveRequestParams(call.config);
  return {
    model: call.config.model,
    instructions: call.instructions,
    input: call.input,
    text: { format: textFormatFor(call.contract) },
    ...params,
    store: call.store ?? false,
    stream,
  };
}

function mapUsage(u: unknown): TokenUsage {
  if (!u || typeof u !== "object") return { ...EMPTY_USAGE };
  const usage = u as {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
    output_tokens_details?: { reasoning_tokens?: number };
  };
  return {
    inputTokens: usage.input_tokens ?? 0,
    cachedInputTokens: usage.input_tokens_details?.cached_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    reasoningTokens: usage.output_tokens_details?.reasoning_tokens ?? 0,
  };
}

/** Extract output text / refusal from a full Response object. */
export function extractOutputText(response: unknown): { text: string; refusal: string | null } {
  const r = response as {
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string; refusal?: string }>;
    }>;
  };
  let text = "";
  let refusal: string | null = null;
  for (const item of r.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && typeof part.text === "string") text += part.text;
      if (part.type === "refusal" && typeof part.refusal === "string") refusal = part.refusal;
    }
  }
  return { text, refusal };
}

/** Combine the per-attempt timeout with an optional external signal. */
function attemptSignal(
  timeoutMs: number,
  external?: AbortSignal,
): { signal: AbortSignal; clear: () => void; timedOut: () => boolean } {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onExternal = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", onExternal, { once: true });
  }
  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", onExternal);
    },
    timedOut: () => timedOut,
  };
}

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const txt = await res.text();
    try {
      const j = JSON.parse(txt) as { error?: { message?: string; code?: string; type?: string } };
      if (j?.error?.message)
        return `${j.error.code ?? j.error.type ?? "error"}: ${j.error.message}`;
    } catch {
      /* not json */
    }
    return txt.slice(0, 500);
  } catch {
    return "";
  }
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function backoffMs(kind: FailureKind, attempt: number): number {
  if (kind === "rate_limited") return 1500 * attempt;
  return 400 * attempt;
}

/**
 * Non-streaming structured call with bounded retry.
 * Retries once on timeout/network/429/5xx/malformed output. Never retries
 * auth, billing, bad_request, refusal, or incomplete.
 */
export async function createStructuredResponse<T>(
  call: StructuredCall<T>,
): Promise<StructuredOutcome<T>> {
  const maxAttempts = call.maxAttempts ?? 2;
  const sleep = call.sleep ?? defaultSleep;
  const fetchImpl = call.fetchImpl ?? fetch;
  const body = JSON.stringify(buildBody(call, false));
  let lastErr: OpenAIRequestError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (call.signal?.aborted) throw new OpenAIRequestError("network", "request cancelled");
    const started = Date.now();
    const { signal, clear, timedOut } = attemptSignal(call.config.timeoutMs, call.signal);
    let res: Response;
    try {
      res = await fetchImpl(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${call.apiKey}`, "Content-Type": "application/json" },
        body,
        signal,
      });
    } catch (e) {
      clear();
      const kind = classifyThrown(e, timedOut());
      lastErr = new OpenAIRequestError(kind, `openai ${kind}`, {
        detail: String((e as Error)?.message ?? e),
      });
      if (call.signal?.aborted && !timedOut()) throw lastErr;
      if (attempt < maxAttempts) await sleep(backoffMs(kind, attempt));
      continue;
    }

    const requestId = res.headers.get("x-request-id") ?? undefined;
    if (!res.ok) {
      clear();
      const kind = classifyHttpStatus(res.status);
      const detail = await readErrorDetail(res);
      lastErr = new OpenAIRequestError(kind, `openai http ${res.status}`, {
        status: res.status,
        requestId,
        detail,
      });
      if (!lastErr.retryable || attempt >= maxAttempts) throw lastErr;
      await sleep(backoffMs(kind, attempt));
      continue;
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch (e) {
      clear();
      lastErr = new OpenAIRequestError("malformed_output", "openai body was not JSON", {
        requestId,
        detail: String(e),
      });
      if (attempt < maxAttempts) continue;
      throw lastErr;
    }
    clear();
    const latencyMs = Date.now() - started;
    const response = json as {
      status?: string;
      usage?: unknown;
      incomplete_details?: { reason?: string };
      error?: { message?: string };
    };
    const { text, refusal } = extractOutputText(json);
    const usage = mapUsage(response.usage);

    if (refusal !== null) {
      throw new OpenAIRequestError("refusal", "model refused", { requestId, detail: refusal });
    }
    if (response.status === "failed") {
      lastErr = new OpenAIRequestError("server", "openai response failed", {
        requestId,
        detail: response.error?.message,
      });
      if (attempt < maxAttempts) continue;
      throw lastErr;
    }
    const parsed = parseResult(call.contract, text);
    if (!parsed.ok) {
      const kind: FailureKind =
        response.status === "incomplete" ? "incomplete" : "malformed_output";
      lastErr = new OpenAIRequestError(
        kind,
        kind === "incomplete"
          ? `openai response incomplete (${response.incomplete_details?.reason ?? "unknown"})`
          : "structured output did not validate",
        {
          requestId,
          detail: parsed.error,
        },
      );
      if (lastErr.retryable && attempt < maxAttempts) continue;
      throw lastErr;
    }
    return {
      parsed: parsed.value,
      rawText: text,
      usage,
      estimatedCostUsd: estimateCostUsd(call.config.model, usage),
      model: call.config.model,
      latencyMs,
      attempts: attempt,
      requestId,
      status: response.status ?? "completed",
    };
  }
  throw lastErr ?? new OpenAIRequestError("unknown", "openai request failed");
}

/**
 * Streaming structured call. Yields the accumulated output text after each
 * delta, then a `done` event with the validated result, or an `error` event.
 *
 * Retry policy: if the upstream request fails before any delta was emitted,
 * retry once (non-streaming is not needed; same streaming request). If the
 * final text fails validation, fall back to ONE non-streaming attempt so the
 * user still gets a result. Failures after deltas were emitted are surfaced
 * as `error` (the UI already showed partial text).
 */
export async function* streamStructuredResponse<T>(
  call: StructuredCall<T>,
): AsyncGenerator<StreamEvent<T>> {
  const fetchImpl = call.fetchImpl ?? fetch;
  const sleep = call.sleep ?? defaultSleep;
  const maxAttempts = call.maxAttempts ?? 2;
  const body = JSON.stringify(buildBody(call, true));

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const started = Date.now();
    const { signal, clear, timedOut } = attemptSignal(call.config.timeoutMs, call.signal);
    let res: Response;
    try {
      res = await fetchImpl(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${call.apiKey}`, "Content-Type": "application/json" },
        body,
        signal,
      });
    } catch (e) {
      clear();
      const kind = classifyThrown(e, timedOut());
      if (call.signal?.aborted && !timedOut()) return;
      if (attempt < maxAttempts) {
        await sleep(backoffMs(kind, attempt));
        continue;
      }
      yield { type: "error", kind, message: String((e as Error)?.message ?? e) };
      return;
    }

    const requestId = res.headers.get("x-request-id") ?? undefined;
    if (!res.ok || !res.body) {
      clear();
      const kind = classifyHttpStatus(res.status);
      const detail = await readErrorDetail(res);
      console.error("openai stream http error", res.status, requestId, detail);
      if (isRetryableHttp(kind) && attempt < maxAttempts) {
        await sleep(backoffMs(kind, attempt));
        continue;
      }
      yield { type: "error", kind, message: detail };
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const parser = new SseParser();
    let accumulated = "";
    let refusal = "";
    let emittedDelta = false;
    let completed: { status?: string; usage?: unknown } | null = null;
    let failure: { kind: FailureKind; message: string } | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        const messages = done ? parser.end() : parser.push(decoder.decode(value, { stream: true }));
        for (const msg of messages) {
          let data: Record<string, unknown>;
          try {
            data = JSON.parse(msg.data);
          } catch {
            continue;
          }
          const evt = (data.type as string) || msg.event;
          if (evt === "response.output_text.delta") {
            accumulated += String(data.delta ?? "");
            emittedDelta = true;
            yield { type: "delta", accumulated };
          } else if (evt === "response.refusal.delta") {
            refusal += String(data.delta ?? "");
          } else if (evt === "response.completed" || evt === "response.incomplete") {
            completed = (data.response as { status?: string; usage?: unknown }) ?? {};
          } else if (evt === "response.failed") {
            const r = data.response as { error?: { message?: string } } | undefined;
            failure = { kind: "server", message: r?.error?.message ?? "response failed" };
          } else if (evt === "error") {
            failure = {
              kind: "server",
              message: String((data as { message?: string }).message ?? "stream error"),
            };
          }
        }
        if (done) break;
      }
    } catch (e) {
      clear();
      const kind = classifyThrown(e, timedOut());
      if (call.signal?.aborted && !timedOut()) return;
      if (!emittedDelta && attempt < maxAttempts) {
        await sleep(backoffMs(kind, attempt));
        continue;
      }
      yield { type: "error", kind, message: String((e as Error)?.message ?? e) };
      return;
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* noop */
      }
    }
    clear();

    if (refusal) {
      yield { type: "error", kind: "refusal", message: refusal };
      return;
    }
    if (failure) {
      if (!emittedDelta && attempt < maxAttempts) continue;
      yield { type: "error", kind: failure.kind, message: failure.message };
      return;
    }

    const parsed = parseResult(call.contract, accumulated);
    if (parsed.ok) {
      const usage = mapUsage(completed?.usage);
      yield {
        type: "done",
        outcome: {
          parsed: parsed.value,
          rawText: accumulated,
          usage,
          estimatedCostUsd: estimateCostUsd(call.config.model, usage),
          model: call.config.model,
          latencyMs: Date.now() - started,
          attempts: attempt,
          requestId,
          status: completed?.status ?? "completed",
        },
      };
      return;
    }

    // Malformed final text: one non-streaming fallback so the user still gets a result.
    console.error("openai stream validation failed", requestId, parsed.error);
    try {
      const outcome = await createStructuredResponse({ ...call, maxAttempts: 1 });
      yield { type: "done", outcome: { ...outcome, attempts: attempt + 1 } };
    } catch (e) {
      const err = e as OpenAIRequestError;
      yield {
        type: "error",
        kind: err.kind ?? "malformed_output",
        message: err.detail ?? err.message,
      };
    }
    return;
  }
}

function isRetryableHttp(kind: FailureKind): boolean {
  return kind === "rate_limited" || kind === "server";
}
