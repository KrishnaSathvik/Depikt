import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAINTENANCE_INTERVAL_MS,
  kickSessionMaintenance,
  maintenanceInFlight,
  maintenanceNextAllowedAt,
  resetSessionMaintenanceForTests,
} from "../../src/lib/generation/session-maintenance.ts";

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

test("kickSessionMaintenance does not wait for the server GET", async () => {
  resetSessionMaintenanceForTests();
  let settled = false;
  const hang = deferred();
  const maintain = async () => {
    await hang.promise;
    settled = true;
  };

  kickSessionMaintenance("sess-1", maintain, 1_000);
  assert.equal(settled, false);
  assert.equal(maintenanceInFlight.has("sess-1"), true);

  hang.resolve();
  await flushMicrotasks();
  assert.equal(settled, true);
  assert.equal(maintenanceInFlight.has("sess-1"), false);
});

test("Generate, Build, and Critique share one in-flight maintenance call per session", async () => {
  resetSessionMaintenanceForTests();
  let calls = 0;
  const hang = deferred();
  const maintain = async () => {
    calls += 1;
    await hang.promise;
  };

  kickSessionMaintenance("sess-1", maintain, 1_000);
  kickSessionMaintenance("sess-1", maintain, 1_000);
  kickSessionMaintenance("sess-1", maintain, 1_000);
  assert.equal(calls, 1);

  hang.resolve();
  await flushMicrotasks();
});

test("a finished maintenance call is throttled until the interval elapses", async () => {
  resetSessionMaintenanceForTests();
  let calls = 0;
  const maintain = async () => {
    calls += 1;
  };

  kickSessionMaintenance("sess-1", maintain, 1_000);
  await flushMicrotasks();
  assert.equal(calls, 1);

  kickSessionMaintenance("sess-1", maintain, 1_000 + MAINTENANCE_INTERVAL_MS - 1);
  await flushMicrotasks();
  assert.equal(calls, 1);

  kickSessionMaintenance("sess-1", maintain, 1_000 + MAINTENANCE_INTERVAL_MS);
  await flushMicrotasks();
  assert.equal(calls, 2);
});

test("a failed maintenance GET does not reject the poller", async () => {
  resetSessionMaintenanceForTests();
  kickSessionMaintenance(
    "sess-1",
    async () => {
      throw new Error("session GET failed");
    },
    1_000,
  );
  await flushMicrotasks();
  assert.equal(maintenanceInFlight.has("sess-1"), false);
  assert.ok((maintenanceNextAllowedAt.get("sess-1") ?? 0) > 1_000);
});
