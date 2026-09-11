// Product constraints on the avatar system (revised: DiceBear, generated
// locally). No image-generation credit, no request to DiceBear's *HTTP*
// API (only the local @dicebear/* packages), no OS emoji dependency, no
// Storage upload, header shows the Depikt avatar (never the OAuth photo).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("avatar system never calls image generation or Storage, and never hits DiceBear's HTTP API", () => {
  for (const file of [
    "src/lib/profile/avatar.ts",
    "src/components/profile/DepiktAvatar.tsx",
    "src/components/account/AvatarPickerBody.tsx",
  ]) {
    const src = read(file);
    assert.ok(
      !/openai|generateImage|createGenerationJob/i.test(src),
      `${file} must not generate images`,
    );
    // The HTTP API is https://api.dicebear.com/... -- local generation
    // (createAvatar from @dicebear/core + a style package) never fetches it.
    assert.ok(!/api\.dicebear\.com/i.test(src), `${file} must not call DiceBear's HTTP API`);
    assert.ok(
      !/\bfetch\(/.test(src),
      `${file} must not make a network request to render an avatar`,
    );
    assert.ok(!/storage\.from\(/.test(src), `${file} must not upload to Storage`);
  }
});

test("DiceBear is generated locally: @dicebear/core + curated style packages, imported directly", () => {
  const pkg = JSON.parse(read("package.json")) as { dependencies?: Record<string, string> };
  assert.ok(pkg.dependencies?.["@dicebear/core"], "@dicebear/core must be a direct dependency");
  for (const style of ["lorelei", "notionists", "thumbs", "open-peeps", "bottts"]) {
    assert.ok(
      pkg.dependencies?.[`@dicebear/${style}`],
      `@dicebear/${style} must be a direct dependency`,
    );
  }
  const renderer = read("src/components/profile/DepiktAvatar.tsx");
  assert.match(renderer, /from "@dicebear\/core"/);
  assert.match(renderer, /from "@dicebear\/lorelei"/);
  assert.match(renderer, /from "@dicebear\/notionists"/);
  assert.match(renderer, /from "@dicebear\/thumbs"/);
  assert.match(renderer, /from "@dicebear\/open-peeps"/);
  assert.match(renderer, /from "@dicebear\/bottts"/);
  assert.match(renderer, /createAvatar\(/);
  // Not all 61 DiceBear styles -- only the five curated ones (CLAUDE.md /
  // the redesign brief: "Choose 2-3 curated styles" -- five is still a
  // small, deliberate set, never all of them).
  assert.doesNotMatch(renderer, /@dicebear\/avataaars|@dicebear\/pixel-art|@dicebear\/micah/);
});

test("no rendered SVG/avatar image is stored -- only the (seed, style) pair", () => {
  const migration = read("supabase/migrations/20260912100000_add_profiles.sql");
  assert.match(migration, /avatar_seed\s+text NOT NULL/);
  assert.match(migration, /avatar_variant\s+text NOT NULL/);
  assert.doesNotMatch(migration, /avatar_svg|avatar_url|avatar_image/i);
  // avatar_variant is restricted to the curated style set at the DB layer too.
  assert.match(
    migration,
    /avatar_variant IN \('lorelei', 'notionists', 'thumbs', 'open-peeps', 'bottts'\)/,
  );
});

test("ProfileProvider is mounted at the root, inside AuthProvider", () => {
  const src = read("src/routes/__root.tsx");
  const authIdx = src.indexOf("<AuthProvider>");
  const profileIdx = src.indexOf("<ProfileProvider>");
  assert.ok(authIdx >= 0 && profileIdx >= 0 && authIdx < profileIdx);
});

test("the signed-in header control renders the Depikt avatar, not the OAuth provider photo", () => {
  const src = read("src/components/auth/AccountMenu.tsx");
  assert.match(src, /<DepiktAvatar/);
  assert.ok(!/user_metadata\?\.avatar_url|user\.user_metadata\.picture/.test(src));
});
