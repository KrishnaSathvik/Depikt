import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_SESSION_POLL_GRACE_MS,
  jobHasUsableResultUrl,
  sessionAwaitingResultUrl,
  shouldKeepPollingSession,
} from "../../src/lib/generation/poll-complete.ts";

test("a succeeded job without a signed URL is not done polling", () => {
  const jobs = [{ status: "succeeded", result: { url: null } }];
  assert.equal(jobHasUsableResultUrl(jobs[0]!), false);
  assert.equal(sessionAwaitingResultUrl(jobs), true);
  assert.equal(shouldKeepPollingSession(jobs), true);
});

test("a succeeded job with a URL can stop polling", () => {
  const jobs = [{ status: "succeeded", result: { url: "https://example.test/a.png" } }];
  assert.equal(jobHasUsableResultUrl(jobs[0]!), true);
  assert.equal(sessionAwaitingResultUrl(jobs), false);
  assert.equal(shouldKeepPollingSession(jobs), false);
});

test("queued or running jobs keep polling even if a sibling already has a URL", () => {
  const jobs = [
    { status: "succeeded", result: { url: "https://example.test/a.png" } },
    { status: "running", result: null },
  ];
  assert.equal(shouldKeepPollingSession(jobs), true);
  assert.equal(sessionAwaitingResultUrl(jobs), false);
});

test("an all-failed session is complete — no URL wait", () => {
  const jobs = [
    { status: "failed", result: null },
    { status: "cancelled", result: null },
  ];
  assert.equal(shouldKeepPollingSession(jobs), false);
  assert.equal(sessionAwaitingResultUrl(jobs), false);
});

test("mixed series: keep polling while any success is still URL-less", () => {
  const jobs = [
    { status: "failed", result: null },
    { status: "succeeded", result: { url: null } },
  ];
  assert.equal(sessionAwaitingResultUrl(jobs), true);
  assert.equal(shouldKeepPollingSession(jobs), true);
});

test("an empty job list does not poll forever", () => {
  assert.equal(shouldKeepPollingSession([]), false);
});

test("a known session with no jobs yet keeps polling only during the creation grace", () => {
  assert.equal(shouldKeepPollingSession([], { elapsedMs: 0 }), true);
  assert.equal(shouldKeepPollingSession([], { elapsedMs: EMPTY_SESSION_POLL_GRACE_MS - 1 }), true);
  assert.equal(shouldKeepPollingSession([], { elapsedMs: EMPTY_SESSION_POLL_GRACE_MS }), false);
});
