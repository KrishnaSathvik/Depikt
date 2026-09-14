import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(relativePath: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", relativePath), "utf8");
}

test("series migration locks the stored execution plan and submit identity", () => {
  const migration = read("supabase/migrations/20260914120000_generation_series.sql");

  assert.match(migration, /ADD COLUMN IF NOT EXISTS create_idempotency_key text/);
  assert.match(migration, /UNIQUE \(user_id, create_idempotency_key\)/);
  assert.match(migration, /NEW\.user_id IS DISTINCT FROM OLD\.user_id/);
  assert.match(migration, /NEW\.plan_json IS DISTINCT FROM OLD\.plan_json/);
  assert.match(
    migration,
    /NEW\.create_idempotency_key IS DISTINCT FROM OLD\.create_idempotency_key/,
  );
  assert.match(migration, /BEFORE UPDATE ON public\.generation_sessions/);
});

test("jobs route keys the session insert and never uses LIKE for replay", () => {
  const route = read("src/routes/api/generation/jobs.ts");

  assert.match(route, /create_idempotency_key: req\.idempotencyKey/);
  assert.match(route, /sessionError\?\.code === "23505"/);
  assert.match(route, /generationJobIdempotencyKeys\(/);
  assert.doesNotMatch(route, /\.like\("idempotency_key"/);
  assert.match(route, /\.select\("id, plan_json"\)/);
  assert.match(route, /executionPlanIdentityMatches\(existingSession\.plan_json/);
});

test("job creation failures delete only a session confirmed to have no jobs", () => {
  const route = read("src/routes/api/generation/jobs.ts");

  assert.match(route, /async function deleteSessionIfEmpty\(/);
  assert.match(route, /\.from\("generation_jobs"\)[\s\S]*?\.eq\("session_id", sessionId\)/);
  assert.match(route, /if \(jobsError \|\| \(jobs\?\.length \?\? 0\) > 0\) return/);
  assert.match(route, /\.from\("generation_sessions"\)[\s\S]*?\.delete\(\)/);
  assert.equal(
    route.match(/await deleteSessionIfEmpty\(supabase, userId, sessionId\)/g)?.length,
    4,
  );
});
