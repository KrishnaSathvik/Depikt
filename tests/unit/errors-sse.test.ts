import { test } from "node:test";
import assert from "node:assert/strict";
import { OpenAIRequestError, classifyHttpStatus, classifyThrown, clientMessageFor, isRetryableKind } from "../../src/lib/openai/errors.ts";
import { SseParser, encodeSseEvent } from "../../src/lib/openai/sse.ts";

test("http status classification", () => {
  assert.equal(classifyHttpStatus(429), "rate_limited");
  assert.equal(classifyHttpStatus(401), "auth");
  assert.equal(classifyHttpStatus(403), "auth");
  assert.equal(classifyHttpStatus(402), "billing");
  assert.equal(classifyHttpStatus(500), "server");
  assert.equal(classifyHttpStatus(503), "server");
  assert.equal(classifyHttpStatus(400), "bad_request");
  assert.equal(classifyHttpStatus(404), "bad_request");
});

test("retry classification: transport/server/malformed retry; auth/billing/bad_request/refusal do not", () => {
  for (const k of ["timeout", "network", "rate_limited", "server", "malformed_output"] as const) assert.equal(isRetryableKind(k), true, k);
  for (const k of ["auth", "billing", "bad_request", "refusal", "incomplete", "unknown"] as const) assert.equal(isRetryableKind(k), false, k);
  assert.equal(new OpenAIRequestError("auth", "x").retryable, false);
  assert.equal(new OpenAIRequestError("server", "x", { status: 502 }).status, 502);
});

test("timeout classification from thrown values", () => {
  assert.equal(classifyThrown(new Error("boom"), true), "timeout");
  const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
  assert.equal(classifyThrown(abort, false), "timeout");
  assert.equal(classifyThrown(new TypeError("fetch failed"), false), "network");
});

test("client messages never leak upstream detail", () => {
  assert.equal(clientMessageFor("rate_limited"), "Rate limit reached. Please wait a moment and try again.");
  assert.equal(clientMessageFor("malformed_output"), "Invalid AI response format");
  assert.equal(clientMessageFor("server"), "AI service error");
});

test("SseParser handles chunk boundaries, multi-line data, comments and CRLF", () => {
  const p = new SseParser();
  let msgs = p.push("event: a\ndata: {\"x\":1}\n\n: keepalive\nevent: b\r\ndata: line1\r\ndata: line2\r\n\r\nevent: c\ndata: par");
  assert.deepEqual(msgs, [
    { event: "a", data: '{"x":1}' },
    { event: "b", data: "line1\nline2" },
  ]);
  msgs = p.push("tial\n\n");
  assert.deepEqual(msgs, [{ event: "c", data: "partial" }]);
  msgs = p.push("data: tail-no-blank");
  assert.deepEqual(msgs, []);
  assert.deepEqual(p.end(), [{ event: "message", data: "tail-no-blank" }]);
});

test("encodeSseEvent produces the Depikt frame format", () => {
  assert.equal(encodeSseEvent("delta", { args: "{" }), 'event: delta\ndata: {"args":"{"}\n\n');
});
