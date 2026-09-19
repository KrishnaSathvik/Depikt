import test from "node:test";
import assert from "node:assert/strict";
import {
  activeSessionStore,
  readRestorableSession,
} from "../../src/lib/generation/active-session.ts";
import type { LivePollSnapshot } from "../../src/lib/generation/live-poll.ts";

const sessionId = "11111111-1111-4111-8111-111111111111";
function store() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}
const snapshot = (status: "running" | "succeeded"): LivePollSnapshot => ({
  jobs: [
    {
      jobId: "j",
      sessionId,
      status,
      operation: "generate",
      model: "flare",
      width: 1024,
      height: 1024,
      errorMessage: null,
      result:
        status === "succeeded"
          ? { versionId: "v", url: "https://example.com/result.png", width: 1024, height: 1024 }
          : null,
      label: null,
      index: null,
    },
  ],
  versions: [],
});

test("empty, cached-only and legacy unscoped storage never initiate restoration", () => {
  const storage = store();
  storage.setItem("depikt.generate.entityResume", JSON.stringify({ sessionId }));
  storage.setItem("depikt.grounding.resume.v1", JSON.stringify({ sessionId }));
  storage.setItem("depikt.generate.activeSessionId", sessionId);
  assert.equal(activeSessionStore("owner", "direct", storage).read(), null);
  assert.equal(storage.getItem("depikt.generate.activeSessionId"), null);
});

test("active recovery is isolated between users and Generate, Build and Critique", () => {
  const storage = store();
  const generate = activeSessionStore("owner", "direct", storage);
  generate.save(sessionId);
  assert.equal(generate.read(), sessionId);
  assert.equal(activeSessionStore("other", "direct", storage).read(), null);
  assert.equal(activeSessionStore("owner", "prompt_build", storage).read(), null);
  assert.equal(activeSessionStore("owner", "prompt_critique", storage).read(), null);
  assert.equal(activeSessionStore("owner", "library", storage).read(), sessionId);
  activeSessionStore("owner", "prompt_build", storage).clear();
  assert.equal(generate.read(), sessionId);
  generate.clear();
  assert.equal(generate.read(), null);
});

test("invalid and expired active records are ignored", () => {
  const storage = store();
  const key = "depikt.generate.activeSessionId:owner:generate";
  for (const value of [
    "broken",
    JSON.stringify({ sessionId, savedAt: Date.now() - 25 * 60 * 60 * 1000 }),
    JSON.stringify({ sessionId: "not-a-session", savedAt: Date.now() }),
  ]) {
    storage.setItem(key, value);
    assert.equal(activeSessionStore("owner", "direct", storage).read(), null);
  }
});

test("missing and failed initial reads do not produce a generating snapshot", async () => {
  assert.equal(
    await readRestorableSession(sessionId, async () => ({ jobs: [], versions: [] })),
    null,
  );
  assert.equal(
    await readRestorableSession(sessionId, async () => {
      throw Error("offline");
    }),
    null,
  );
  assert.equal(await readRestorableSession(sessionId, () => new Promise(() => {}), 5), null);
});

test("a confirmed running job resumes while a completed job remains completed", async () => {
  for (const status of ["running", "succeeded"] as const) {
    let reads = 0;
    const restored = await readRestorableSession(sessionId, async (id) => {
      assert.equal(id, sessionId);
      reads++;
      return snapshot(status);
    });
    assert.equal(restored?.jobs[0].status, status);
    assert.equal(reads, 1);
  }
});

test("restricted session storage cannot break the composer", () => {
  const fail = () => {
    throw Error("blocked");
  };
  const recovery = activeSessionStore("owner", "direct", {
    getItem: fail,
    setItem: fail,
    removeItem: fail,
  });
  assert.doesNotThrow(() => recovery.save(sessionId));
  assert.equal(recovery.read(), null);
  assert.doesNotThrow(() => recovery.clear());
});
