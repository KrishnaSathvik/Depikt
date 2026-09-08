import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createStructuredResponse,
  streamStructuredResponse,
  extractOutputText,
  type StructuredCall,
} from "../../src/lib/openai/client.ts";
import { CONTRACTS } from "../../src/lib/openai/schemas.ts";
import { OpenAIRequestError } from "../../src/lib/openai/errors.ts";

const noSleep = async () => {};

function fullResponse(text: string, extra: Record<string, unknown> = {}) {
  return {
    id: "resp_1",
    status: "completed",
    output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }],
    usage: {
      input_tokens: 100,
      output_tokens: 20,
      input_tokens_details: { cached_tokens: 40 },
      output_tokens_details: { reasoning_tokens: 5 },
    },
    ...extra,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-request-id": "req_test" },
  });
}

function sseResponse(frames: string[]) {
  return new Response(frames.join(""), {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

function baseCall(
  fetchImpl: typeof fetch,
  overrides: Partial<StructuredCall<unknown>> = {},
): StructuredCall<unknown> {
  return {
    apiKey: "sk-test",
    config: { model: "gpt-5.4-mini", temperature: 0.7, timeoutMs: 5000 },
    instructions: "sys",
    input: [{ role: "user", content: "hi" }],
    contract: CONTRACTS.builder_default,
    fetchImpl,
    sleep: noSleep,
    ...overrides,
  };
}

const good = JSON.stringify({ prompt: "p", category: "POSTER/COVER", why_it_works: "w" });

test("non-stream: builds a Responses request with strict text.format and returns usage + cost", async () => {
  let captured: { url: string; body: Record<string, unknown> } | null = null;
  const fetchImpl: typeof fetch = async (url, init) => {
    captured = { url: String(url), body: JSON.parse(String(init?.body)) };
    return jsonResponse(fullResponse(good));
  };
  const out = await createStructuredResponse(baseCall(fetchImpl));
  assert.ok(captured);
  const c = captured as unknown as { url: string; body: Record<string, unknown> };
  assert.equal(c.url, "https://api.openai.com/v1/responses");
  assert.equal(c.body.model, "gpt-5.4-mini");
  assert.equal(c.body.instructions, "sys");
  assert.equal(c.body.temperature, 0.7);
  assert.equal(c.body.store, false);
  assert.equal(c.body.stream, false);
  const fmt = (c.body.text as { format: { type: string; strict: boolean; name: string } }).format;
  assert.equal(fmt.type, "json_schema");
  assert.equal(fmt.strict, true);
  assert.equal(fmt.name, "depikt_builder_default");
  assert.deepEqual(out.parsed, JSON.parse(good));
  assert.deepEqual(out.usage, {
    inputTokens: 100,
    cachedInputTokens: 40,
    outputTokens: 20,
    reasoningTokens: 5,
  });
  assert.equal(out.requestId, "req_test");
  assert.equal(out.attempts, 1);
  assert.ok(out.estimatedCostUsd > 0);
});

test("non-stream: temperature omitted for models that reject it; reasoning included", async () => {
  let body: Record<string, unknown> = {};
  const fetchImpl: typeof fetch = async (_u, init) => {
    body = JSON.parse(String(init?.body));
    return jsonResponse(fullResponse(good));
  };
  await createStructuredResponse(
    baseCall(fetchImpl, {
      config: { model: "gpt-6-astra", temperature: 0.7, reasoningEffort: "high", timeoutMs: 5000 },
    }),
  );
  assert.equal("temperature" in body, false);
  assert.deepEqual(body.reasoning, { effort: "high" });
});

test("non-stream: retries once on 500 then succeeds", async () => {
  let n = 0;
  const fetchImpl: typeof fetch = async () =>
    ++n === 1
      ? jsonResponse({ error: { message: "boom" } }, 500)
      : jsonResponse(fullResponse(good));
  const out = await createStructuredResponse(baseCall(fetchImpl));
  assert.equal(n, 2);
  assert.equal(out.attempts, 2);
});

test("non-stream: does not retry 401 / 402 / 400", async () => {
  for (const status of [401, 402, 400]) {
    let n = 0;
    const fetchImpl: typeof fetch = async () => {
      n++;
      return jsonResponse({ error: { message: "nope", code: "x" } }, status);
    };
    await assert.rejects(createStructuredResponse(baseCall(fetchImpl)), (e: unknown) => {
      assert.ok(e instanceof OpenAIRequestError);
      assert.equal(e.status, status);
      assert.equal(e.retryable, false);
      return true;
    });
    assert.equal(n, 1, `status ${status} must not retry`);
  }
});

test("non-stream: malformed output retries once, then fails with malformed_output", async () => {
  let n = 0;
  const fetchImpl: typeof fetch = async () => {
    n++;
    return jsonResponse(fullResponse('{"prompt": "missing fields"}'));
  };
  await assert.rejects(createStructuredResponse(baseCall(fetchImpl)), (e: unknown) => {
    assert.ok(e instanceof OpenAIRequestError);
    assert.equal(e.kind, "malformed_output");
    return true;
  });
  assert.equal(n, 2);
});

test("non-stream: refusal is surfaced and not retried", async () => {
  let n = 0;
  const fetchImpl: typeof fetch = async () => {
    n++;
    return jsonResponse({
      status: "completed",
      output: [{ type: "message", content: [{ type: "refusal", refusal: "no" }] }],
      usage: {},
    });
  };
  await assert.rejects(
    createStructuredResponse(baseCall(fetchImpl)),
    (e: unknown) => (e as OpenAIRequestError).kind === "refusal",
  );
  assert.equal(n, 1);
});

test("non-stream: timeout aborts the attempt and is classified as timeout", async () => {
  const fetchImpl: typeof fetch = (_u, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () =>
        reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
      );
    });
  await assert.rejects(
    createStructuredResponse(
      baseCall(fetchImpl, { config: { model: "gpt-5.4-mini", timeoutMs: 20 }, maxAttempts: 1 }),
    ),
    (e: unknown) => (e as OpenAIRequestError).kind === "timeout",
  );
});

test("extractOutputText concatenates output_text parts and finds refusals", () => {
  const r = extractOutputText({
    output: [
      { type: "reasoning" },
      {
        type: "message",
        content: [
          { type: "output_text", text: "a" },
          { type: "output_text", text: "b" },
        ],
      },
    ],
  });
  assert.deepEqual(r, { text: "ab", refusal: null });
});

function frame(type: string, data: Record<string, unknown>) {
  return `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
}

test("stream: yields accumulated deltas then done with usage", async () => {
  const frames = [
    frame("response.created", { response: { id: "r" } }),
    frame("response.output_text.delta", { delta: '{"prompt": "p",' }),
    frame("response.output_text.delta", {
      delta: ' "category": "POSTER/COVER", "why_it_works": "w"}',
    }),
    frame("response.completed", {
      response: { status: "completed", usage: { input_tokens: 10, output_tokens: 5 } },
    }),
  ];
  const fetchImpl: typeof fetch = async () => sseResponse(frames);
  const events = [];
  for await (const e of streamStructuredResponse(baseCall(fetchImpl))) events.push(e);
  assert.equal(events[0].type, "delta");
  assert.equal((events[0] as { accumulated: string }).accumulated, '{"prompt": "p",');
  const done = events.at(-1);
  assert.equal(done?.type, "done");
  const outcome = (done as { outcome: { parsed: unknown; usage: { inputTokens: number } } })
    .outcome;
  assert.deepEqual(outcome.parsed, { prompt: "p", category: "POSTER/COVER", why_it_works: "w" });
  assert.equal(outcome.usage.inputTokens, 10);
});

test("stream: malformed final text falls back to one non-streaming attempt", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async (_u, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    if (body.stream) {
      return sseResponse([
        frame("response.output_text.delta", { delta: '{"prompt": "only"}' }),
        frame("response.completed", { response: { status: "completed" } }),
      ]);
    }
    return jsonResponse(fullResponse(good));
  };
  const events = [];
  for await (const e of streamStructuredResponse(baseCall(fetchImpl))) events.push(e);
  assert.equal(calls, 2);
  const done = events.at(-1) as { type: string; outcome: { attempts: number } };
  assert.equal(done.type, "done");
  assert.equal(done.outcome.attempts, 2);
});

test("stream: http 500 before any delta retries once; 401 does not", async () => {
  let n = 0;
  const fetchImpl: typeof fetch = async () =>
    ++n === 1
      ? jsonResponse({ error: { message: "x" } }, 500)
      : sseResponse([
          frame("response.output_text.delta", { delta: good }),
          frame("response.completed", { response: {} }),
        ]);
  const events = [];
  for await (const e of streamStructuredResponse(baseCall(fetchImpl))) events.push(e);
  assert.equal(n, 2);
  assert.equal(events.at(-1)?.type, "done");

  let m = 0;
  const fetch401: typeof fetch = async () => {
    m++;
    return jsonResponse({ error: { message: "x" } }, 401);
  };
  const ev2 = [];
  for await (const e of streamStructuredResponse(baseCall(fetch401))) ev2.push(e);
  assert.equal(m, 1);
  assert.deepEqual(
    ev2.map((e) => e.type),
    ["error"],
  );
  assert.equal((ev2[0] as { kind: string }).kind, "auth");
});

test("stream: refusal deltas become a refusal error", async () => {
  const fetchImpl: typeof fetch = async () =>
    sseResponse([
      frame("response.refusal.delta", { delta: "no" }),
      frame("response.completed", { response: {} }),
    ]);
  const events = [];
  for await (const e of streamStructuredResponse(baseCall(fetchImpl))) events.push(e);
  assert.deepEqual(
    events.map((e) => e.type),
    ["error"],
  );
  assert.equal((events[0] as { kind: string }).kind, "refusal");
});
