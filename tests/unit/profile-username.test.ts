import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ADJECTIVES,
  NOUNS,
  RESERVED_USERNAMES,
  isValidUsernameFormat,
  isReservedUsername,
  normalizeUsername,
  validateUsername,
  generateUsernameCandidate,
  deriveUsernameSuffix,
} from "../../src/lib/profile/username.ts";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("username format: valid and invalid shapes", () => {
  assert.ok(isValidUsernameFormat("quiet-orbit-4821"));
  assert.ok(isValidUsernameFormat("abc"));
  assert.ok(isValidUsernameFormat("a".repeat(24)));
  assert.ok(!isValidUsernameFormat("ab"), "too short");
  assert.ok(!isValidUsernameFormat("a".repeat(25)), "too long");
  assert.ok(!isValidUsernameFormat("-leading"), "leading hyphen");
  assert.ok(!isValidUsernameFormat("trailing-"), "trailing hyphen");
  assert.ok(!isValidUsernameFormat("has--double"), "repeated hyphen");
  assert.ok(!isValidUsernameFormat("Has_Caps"), "underscore/caps");
  assert.ok(!isValidUsernameFormat("has spaces"), "spaces");
  assert.ok(!isValidUsernameFormat("emoji🙂"), "emoji");
});

test("normalizeUsername lowercases and trims", () => {
  assert.equal(normalizeUsername("  QuietOrbit  "), "quietorbit");
});

test("reserved usernames are blocked, case-insensitively", () => {
  for (const w of ["admin", "depikt", "support", "billing", "account", "root"]) {
    assert.ok(isReservedUsername(w));
  }
  assert.ok(isReservedUsername("ADMIN"), "case-insensitive via normalize before check");
  assert.ok(!isReservedUsername("quiet-orbit-4821"));
});

test("validateUsername combines format + reserved checks", () => {
  assert.deepEqual(validateUsername("quiet-orbit-4821"), {
    ok: true,
    username: "quiet-orbit-4821",
  });
  assert.equal(validateUsername("ab").ok, false);
  assert.equal(validateUsername("Admin").ok, false);
});

test("deriveUsernameSuffix is deterministic and in range", () => {
  const uid = "11111111-2222-3333-4444-555555555555";
  const a = deriveUsernameSuffix(uid);
  const b = deriveUsernameSuffix(uid);
  assert.equal(a, b, "same user id -> same suffix");
  assert.ok(/^\d{4}$/.test(a));
  assert.ok(Number(a) >= 1000 && Number(a) <= 9999);
});

test("generateUsernameCandidate is deterministic per user id and varies per attempt", () => {
  const uid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const first = generateUsernameCandidate(uid);
  assert.equal(first, generateUsernameCandidate(uid), "same user id + attempt -> same candidate");
  assert.match(first, /^[a-z]+-[a-z]+-\d{4}$/);
  const retry = generateUsernameCandidate(uid, 1);
  assert.notEqual(first, retry, "a retry attempt must produce a different candidate");
});

test("two different user ids very rarely collide (spot check across a batch)", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 500; i++) {
    const uid = `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`;
    seen.add(generateUsernameCandidate(uid));
  }
  assert.ok(seen.size > 490, `expected near-unique candidates, got ${seen.size}/500 distinct`);
});

// The real generation always runs in Postgres (ensure_profile); this module
// exists for validation/preview/tests. Keep the two word lists in sync.
test("TS word lists match the SQL migration's embedded word lists", () => {
  const sql = read("supabase/migrations/20260912100000_add_profiles.sql");
  const adjMatch = sql.match(/v_adjectives text\[\] := ARRAY\[([\s\S]*?)\];/);
  const nounMatch = sql.match(/v_nouns text\[\] := ARRAY\[([\s\S]*?)\];/);
  assert.ok(adjMatch && nounMatch, "could not find word-list arrays in the migration");
  const parseList = (block: string) =>
    Array.from(block.matchAll(/'([a-z0-9]+)'/g)).map((m) => m[1]);
  assert.deepEqual(parseList(adjMatch![1]), [...ADJECTIVES]);
  assert.deepEqual(parseList(nounMatch![1]), [...NOUNS]);
});

test("reserved usernames match the SQL migration's is_reserved_username list", () => {
  const sql = read("supabase/migrations/20260912100000_add_profiles.sql");
  const match = sql.match(/SELECT lower\(p_username\) IN \(([\s\S]*?)\)/);
  assert.ok(match, "could not find is_reserved_username's list in the migration");
  const sqlReserved = Array.from(match![1].matchAll(/'([a-z0-9-]+)'/g)).map((m) => m[1]);
  assert.deepEqual(new Set(sqlReserved), RESERVED_USERNAMES);
});
