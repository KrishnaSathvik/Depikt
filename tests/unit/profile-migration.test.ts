// Structural checks on the profiles migration -- mirrors how
// generate-edit-source-image.test.ts verifies SQL/route source without a
// live database (this repo has no live Supabase project to test against).
// The real invariants (uniqueness, RLS, trigger coexistence) run for real
// on a scratch Postgres via scripts/test-profiles-migration.sh and
// tests/sql/profiles.test.sql.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

const sql = read("supabase/migrations/20260912100000_add_profiles.sql");

test("profiles table never stores plan/credits/Stripe data", () => {
  const createBlock = sql.match(/CREATE TABLE IF NOT EXISTS public\.profiles \(([\s\S]*?)\);/)?.[1];
  assert.ok(createBlock, "could not find the profiles CREATE TABLE block");
  assert.ok(!/plan/i.test(createBlock!));
  assert.ok(!/credit/i.test(createBlock!));
  assert.ok(!/stripe/i.test(createBlock!));
});

test("RLS is enabled and there is no public/anon read policy", () => {
  assert.match(sql, /ALTER TABLE public\.profiles ENABLE ROW LEVEL SECURITY/);
  assert.match(
    sql,
    /CREATE POLICY "profiles_owner_read" ON public\.profiles\s*\n\s*FOR SELECT USING \(auth\.uid\(\) = user_id\)/,
  );
  assert.ok(!/TO anon/.test(sql), "no policy/grant should target anon");
});

test("no client INSERT/DELETE policy exists -- rows are created only by ensure_profile", () => {
  assert.ok(!/FOR INSERT/.test(sql));
  assert.ok(!/FOR DELETE/.test(sql));
});

test("identity columns (user_id, created_at) are locked by a BEFORE UPDATE trigger", () => {
  assert.match(sql, /prevent_profile_identity_change/);
  assert.match(sql, /NEW\.user_id IS DISTINCT FROM OLD\.user_id/);
  assert.match(sql, /BEFORE UPDATE ON public\.profiles/);
});

test("username has a case-insensitive unique index, not just a UNIQUE column", () => {
  assert.match(
    sql,
    /CREATE UNIQUE INDEX profiles_username_lower_idx ON public\.profiles \(lower\(username\)\)/,
  );
});

test("username format is enforced at the DB layer: length, charset, no leading/trailing/double hyphen", () => {
  assert.match(sql, /length\(username\) BETWEEN 3 AND 24/);
  assert.match(sql, /username ~ '\^\[a-z0-9\]/);
  assert.match(sql, /NOT LIKE '%--%'/);
});

test("ensure_profile is idempotent, SECURITY DEFINER, and authorization-checked", () => {
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.ensure_profile/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(
    sql,
    /SELECT \* INTO v_row FROM public\.profiles WHERE user_id = p_user_id;\s*\n\s*IF FOUND THEN RETURN v_row; END IF;/,
  );
  assert.match(sql, /auth\.uid\(\) IS NOT NULL AND auth\.uid\(\) IS DISTINCT FROM p_user_id/);
});

test("the signup trigger is independent of the starter-credit trigger and never blocks signup", () => {
  assert.match(sql, /CREATE TRIGGER on_auth_user_created_depikt_profile/);
  assert.match(sql, /AFTER INSERT ON auth\.users/);
  // Its own function catches every exception rather than propagating.
  const fn = sql.split("handle_new_depikt_profile()")[1] ?? "";
  assert.match(fn, /EXCEPTION WHEN OTHERS THEN/);
  assert.match(fn, /RAISE WARNING/);
});

test("username generator and default avatar functions exist and are used by ensure_profile", () => {
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.generate_username_candidate/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.default_avatar_variant/);
  assert.match(sql, /v_username := public\.generate_username_candidate\(p_user_id, v_attempt\)/);
  assert.match(sql, /public\.default_avatar_variant\(p_user_id\)/);
});

test("collision retry loop has a bound and raises rather than looping forever", () => {
  assert.match(sql, /EXCEPTION WHEN unique_violation THEN/);
  assert.match(sql, /v_attempt > 25/);
});

test("is_reserved_username covers the required minimum set", () => {
  const required = [
    "admin",
    "administrator",
    "depikt",
    "support",
    "help",
    "api",
    "billing",
    "account",
    "root",
    "moderator",
    "official",
  ];
  for (const word of required) {
    assert.ok(sql.includes(`'${word}'`), `missing reserved username: ${word}`);
  }
});

test("scripts/test-profiles-migration.sh applies this migration and runs the SQL invariants", () => {
  const script = read("scripts/test-profiles-migration.sh");
  assert.match(script, /20260912100000_\*\.sql/);
  assert.match(script, /tests\/sql\/profiles\.test\.sql/);
});
