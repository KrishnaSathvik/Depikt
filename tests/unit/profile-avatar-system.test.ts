// Product constraints on the avatar system (CLAUDE.md / the profile phase
// spec): no image-generation credit, no remote avatar API, no OS emoji, no
// Storage upload, header shows the Depikt avatar (never the OAuth photo).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("avatar system never calls image generation, a remote avatar API, or Storage", () => {
  for (const file of [
    "src/lib/profile/avatar.ts",
    "src/components/profile/DepiktAvatar.tsx",
    "src/components/account/AvatarPickerDialog.tsx",
  ]) {
    const src = read(file);
    assert.ok(
      !/openai|generateImage|createGenerationJob/i.test(src),
      `${file} must not generate images`,
    );
    assert.ok(
      !/from\s+["'].*dicebear|require\(["'].*dicebear/i.test(src),
      `${file} must not import a remote avatar API`,
    );
    assert.ok(!/storage\.from\(/.test(src), `${file} must not upload to Storage`);
  }
});

test("dicebear (or any remote avatar API) is not a project dependency", () => {
  const pkg = JSON.parse(read("package.json")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!Object.keys(all).some((name) => /dicebear/i.test(name)));
});

test("avatar symbols are drawn as SVG geometry, not emoji characters", () => {
  const src = read("src/components/profile/DepiktAvatar.tsx");
  assert.match(src, /<svg/);
  assert.ok(
    !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(src),
    "no emoji glyphs in the renderer",
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
