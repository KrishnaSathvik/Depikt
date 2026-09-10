import { test } from "node:test";
import assert from "node:assert/strict";
import { nextPollDelayMs, isTerminalStatus } from "../../src/lib/generation/polling.ts";

test("polls faster in the first ~20 seconds", () => {
  assert.equal(nextPollDelayMs(0), 2500);
  assert.equal(nextPollDelayMs(19_999), 2500);
});

test("backs off after ~20 seconds", () => {
  assert.equal(nextPollDelayMs(20_000), 5000);
  assert.equal(nextPollDelayMs(120_000), 5000);
});

test("terminal statuses stop polling", () => {
  assert.equal(isTerminalStatus("succeeded"), true);
  assert.equal(isTerminalStatus("failed"), true);
  assert.equal(isTerminalStatus("cancelled"), true);
});

test("non-terminal statuses keep polling", () => {
  assert.equal(isTerminalStatus("queued"), false);
  assert.equal(isTerminalStatus("running"), false);
});
