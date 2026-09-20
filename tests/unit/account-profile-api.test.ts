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

test("profile route validates the avatar style/seed before persisting either", () => {
  const src = read("src/routes/api/account/profile.ts");
  // avatarVariant must be one of the curated DiceBear styles (isAvatarStyle),
  // never an arbitrary string -- the DB's own CHECK constraint is the
  // authoritative backstop, but this API validates first for a clean error.
  assert.match(src, /isAvatarStyle\(body\.avatarVariant\)/);
  // avatarSeed is a free-form DiceBear seed (the picker's shuffle produces
  // one), but still bounded and type-checked, and always written to the
  // caller's own row only (patch applied via .eq("user_id", userId), see
  // the update call below).
  assert.match(src, /body\.avatarSeed\.length > AVATAR_SEED_MAX/);
  assert.match(src, /patch\.avatar_seed = body\.avatarSeed/);
  assert.match(src, /\.eq\("user_id", userId\)/);
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
  assert.match(
    src,
    /generation_jobs!image_versions_job_id_fkey!inner\(operation, series_index, series_label\)/,
  );
  assert.match(src, /"generation_jobs\.operation", "generate"/);
  assert.match(src, /"generation_jobs\.operation", "edit"/);
});

// Regression: image_versions has two FKs to generation_jobs (its own job_id,
// and an edit's source_version_id pointing at a *different* row's job), so
// PostgREST's bare `generation_jobs!inner(...)` embed is ambiguous and 500s
// with PGRST201 ("more than one relationship was found"). Confirmed live
// against a real Supabase project with both migrations applied, and fixed
// by naming the FK explicitly. The embed must never regress to the bare,
// ambiguous form.
test("creations route names the FK explicitly, never the ambiguous bare embed", () => {
  const src = read("src/routes/api/account/creations.ts");
  assert.equal(
    /generation_jobs!inner\(/.test(src),
    false,
    "bare generation_jobs!inner(...) is ambiguous between two FKs (PGRST201) -- must use generation_jobs!image_versions_job_id_fkey!inner(...)",
  );
  assert.match(src, /image_versions_job_id_fkey/);
});

test("creation delete route authenticates, never uses a service role, and checks path ownership", () => {
  const src = read("src/routes/api/account/creations.$id.ts");
  assert.match(src, /authenticateGenerationRequest\(request\)/);
  assert.ok(!/service_role|SERVICE_ROLE/.test(src));
  assert.match(src, /ownerOfStoragePath\(path\) !== userId/);
  assert.match(src, /users\/\$\{userId\}\/sessions\//);
  assert.match(src, /\.from\("image_versions"\)/);
  assert.match(src, /\.delete\(\)/);
  assert.match(src, /storage[\s\S]*\.remove\(\[path\]\)/);
});

test("creation delete is owner-only and does not cascade-delete child edits", () => {
  const sql = read("supabase/migrations/20260919140000_allow_owner_delete_image_versions.sql");
  assert.match(sql, /image_versions_owner_delete/);
  assert.match(sql, /FOR DELETE USING \(auth\.uid\(\) = user_id\)/);
  assert.match(sql, /ON DELETE SET NULL/);
  assert.match(sql, /generation_assets_owner_delete_sessions/);
  assert.match(sql, /\(storage\.foldername\(name\)\)\[3\] = 'sessions'/);
  assert.ok(!/ON DELETE CASCADE/.test(sql));
});

test("creations grid delete control is a separate button that does not open the card", () => {
  const src = read("src/components/account/CreationsGrid.tsx");
  assert.match(src, /aria-label="Delete image"/);
  assert.match(src, /event\.stopPropagation\(\)/);
  assert.match(src, /onDelete=\{setPendingDelete\}/);
  assert.match(src, /sm:group-hover:opacity-100/);
});
