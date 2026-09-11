// Structural checks on the profile/creations account API routes -- same
// grep-on-source approach as tests/unit/generate-edit-source-image.test.ts
// (there is no live Supabase project in this environment to exercise RLS
// against for real).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("username-availability route returns only a boolean, never account/email data", () => {
  const src = read("src/routes/api/account/username-availability.ts");
  // No response ever includes email/user_id/display_name -- every returned
  // JSON body is a bare { available } shape.
  const responses = Array.from(src.matchAll(/JSON\.stringify\(([^)]*)\)/g)).map((m) => m[1]);
  for (const body of responses) {
    assert.match(body.trim(), /^\{\s*available:/, `unexpected response shape: ${body}`);
  }
  assert.ok(!/\.email/.test(src), "must never read/return email");
});

test("username-availability route is authenticated (not open to anon)", () => {
  const src = read("src/routes/api/account/username-availability.ts");
  assert.match(src, /authenticateGenerationRequest\(request\)/);
});

test("profile PATCH route validates username server-side and never trusts the client alone", () => {
  const src = read("src/routes/api/account/profile.ts");
  assert.match(src, /validateUsername\(body\.username\)/);
  // The DB's unique constraint is still the authoritative race-safe check.
  assert.match(src, /23505/);
  assert.match(src, /That username is already taken\./);
});

test("profile GET self-heals via ensure_profile instead of 404ing pre-migration accounts", () => {
  const src = read("src/routes/api/account/profile.ts");
  assert.match(src, /db\.rpc\("ensure_profile"/);
});

test("profile route never lets a caller change avatar_seed away from their own identity basis", () => {
  const src = read("src/routes/api/account/profile.ts");
  // The PATCH body may only ever set displayName/username/avatarVariant --
  // avatar_seed is read back in responses (the user's own identity basis)
  // but never accepted as client input.
  assert.ok(
    !/body\.avatarSeed/.test(src),
    "PATCH must not read an avatarSeed field from the client",
  );
  assert.ok(!/patch\.avatar_seed/.test(src), "PATCH must never write avatar_seed");
});

test("creations route reads only image_versions/generation_jobs owned via RLS, never a service role", () => {
  const src = read("src/routes/api/account/creations.ts");
  assert.match(src, /authenticateGenerationRequest\(request\)/);
  assert.ok(!/service_role|SERVICE_ROLE/.test(src));
  assert.match(src, /from\("image_versions"\)/);
});

test("creations route never returns estimated API cost or provider diagnostics", () => {
  const src = read("src/routes/api/account/creations.ts");
  assert.ok(!/estimated_api_cost|openai_request_id|usage_json/.test(src));
});

test("creations route paginates rather than returning everything at once", () => {
  const src = read("src/routes/api/account/creations.ts");
  assert.match(src, /MAX_LIMIT/);
  assert.match(src, /\.limit\(limit \+ 1\)/);
  assert.match(src, /nextCursor/);
});

test("creations route supports the generated/edited filter via the owning job's operation", () => {
  const src = read("src/routes/api/account/creations.ts");
  assert.match(src, /generation_jobs!inner\(operation\)/);
  assert.match(src, /"generation_jobs\.operation", "generate"/);
  assert.match(src, /"generation_jobs\.operation", "edit"/);
});
