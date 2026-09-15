// Issue #2: Generate must not treat hydrating auth/credits as signed-out
// or out-of-credit. The decision is a pure function so submit() and the
// resume-after-hydration effect share one rule.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { decideSubmitGate } from "../../src/lib/generation/submit-gate.ts";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("auth still loading does not treat the user as signed out", () => {
  assert.equal(
    decideSubmitGate({ authLoading: true, hasUser: false, credits: null, creditsResolved: false }),
    "wait",
  );
});

test("signed-in user with credits still loading does not open auth or credit gates", () => {
  assert.equal(
    decideSubmitGate({ authLoading: false, hasUser: true, credits: null, creditsResolved: false }),
    "wait",
  );
});

test("signed-in user with credits available proceeds", () => {
  assert.equal(
    decideSubmitGate({ authLoading: false, hasUser: true, credits: 14, creditsResolved: true }),
    "proceed",
  );
});

test("signed-in user with zero credits hits the credit gate", () => {
  assert.equal(
    decideSubmitGate({ authLoading: false, hasUser: true, credits: 0, creditsResolved: true }),
    "credit_gate",
  );
});

test("resolved signed-out user hits the auth gate", () => {
  assert.equal(
    decideSubmitGate({ authLoading: false, hasUser: false, credits: null, creditsResolved: false }),
    "auth_gate",
  );
});

test("credit fetch failure after sign-in proceeds so the server stays authoritative", () => {
  assert.equal(
    decideSubmitGate({ authLoading: false, hasUser: true, credits: null, creditsResolved: true }),
    "proceed",
  );
});

test("submit() consults the hydration gate before treating !user as signed-out", () => {
  const hook = read("src/lib/generation/use-generation.ts");
  const submitFn = hook.slice(
    hook.indexOf("async function submit"),
    hook.indexOf("function applyPlanOrJobError"),
  );
  assert.match(submitFn, /decideSubmitGate\(/);
  assert.match(submitFn, /authLoading/);
  assert.match(submitFn, /creditsResolved/);
  const gateCall = submitFn.indexOf("decideSubmitGate(");
  const signedOut = submitFn.indexOf("if (!user)");
  assert.ok(gateCall >= 0 && signedOut >= 0 && gateCall < signedOut);
});

test("a click during hydration is resumed once auth and credits resolve", () => {
  const hook = read("src/lib/generation/use-generation.ts");
  assert.match(hook, /hydrationWaitRef/);
  assert.match(hook, /decideSubmitGate\(\{[\s\S]*authLoading/);
});
