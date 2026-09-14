import { test } from "node:test";
import assert from "node:assert/strict";
import { didUpdateRow } from "../../src/lib/generation/supabase-data-access.ts";

test("status CAS throws query errors instead of reporting a lost race", () => {
  const queryError = new Error("database unavailable");

  assert.throws(() => didUpdateRow({ data: null, error: queryError }), queryError);
});

test("status CAS returns false when the query succeeds without updating a row", () => {
  assert.equal(didUpdateRow({ data: null, error: null }), false);
  assert.equal(didUpdateRow({ data: { id: "job-1" }, error: null }), true);
});
