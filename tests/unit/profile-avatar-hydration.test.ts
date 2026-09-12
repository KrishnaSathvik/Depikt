// Regression coverage for the avatar/profile refresh flicker: on page
// refresh, AccountMenu used to render an email-initial letter while the
// profile GET was in flight, then swap to the saved DiceBear avatar once it
// arrived -- a visible "wrong identity, then right identity" flash. Same
// grep-on-source approach as tests/unit/account-profile-api.test.ts (no
// React renderer in this project -- see CLAUDE.md's "No test framework").

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("AccountMenu never guesses an identity (email initial) while the profile is loading", () => {
  const src = read("src/components/auth/AccountMenu.tsx");
  assert.ok(
    !/charAt\(0\)/.test(src),
    "AccountMenu must not render an email/name-derived initial as an avatar fallback",
  );
});

test("AccountMenu's loading placeholder is neutral, not a default/guessed DiceBear avatar", () => {
  const src = read("src/components/auth/AccountMenu.tsx");
  // AccountMenu is now just the trigger button (profile ? DepiktAvatar :
  // neutral placeholder) -- the ternary's else-branch must stay a plain
  // element, never a second DepiktAvatar call with a default/placeholder
  // seed that itself gets swapped out once the real avatar loads.
  const fallbackBranch = src.slice(src.indexOf(") : ("));
  assert.ok(fallbackBranch.length > 0, "expected an else-branch after the profile ternary");
  assert.ok(
    !/DepiktAvatar/.test(fallbackBranch),
    "loading fallback must not render any avatar identity",
  );
  assert.match(fallbackBranch, /aria-hidden="true"/);
});

test("AccountMenu opens the one AccountHub instead of owning a dropdown or sheet itself", () => {
  const src = read("src/components/auth/AccountMenu.tsx");
  assert.doesNotMatch(
    src,
    /useIsMobile\(\)/,
    "responsive dropdown/sheet split now lives in AccountHub, not here",
  );
  assert.doesNotMatch(src, /from "@\/components\/ui\/sheet"/);
  assert.match(src, /useAccountHub\(/);
  assert.match(src, /hub\.openHub\(/);
});

test("AccountHub uses a centered dialog on every viewport (same shell as auth / buy credits)", () => {
  const src = read("src/components/account/AccountHub.tsx");
  assert.doesNotMatch(src, /useIsMobile\(\)/);
  assert.doesNotMatch(src, /from "@\/components\/ui\/sheet"/);
  assert.doesNotMatch(src, /side="bottom"/);
  assert.match(src, /DialogContent/);
  assert.match(src, /rounded-lg/);
  assert.match(src, /w-\[calc\(100%-2rem\)\]/);
});

test("profile hydration cache is scoped by user id and never returns a mismatched row", () => {
  const src = read("src/lib/profile/cache.ts");
  assert.match(src, /KEY_PREFIX/);
  assert.match(src, /key\(userId: string\)/);
  // Defense in depth against a cross-user read even if the key lookup itself were wrong.
  assert.match(src, /parsed\.userId !== userId/);
});

test("profile hydration cache never becomes the source of truth -- reads and writes only ProfileResponse", () => {
  const src = read("src/lib/profile/cache.ts");
  assert.match(src, /import type \{ ProfileResponse \} from "\.\/client"/);
  assert.ok(
    !/\.rpc\(|\.from\(|createClient\(/.test(src),
    "the cache module must not talk to the DB directly",
  );
});

test("cache reads/writes are defensive -- storage failures never throw", () => {
  const src = read("src/lib/profile/cache.ts");
  const readFn = src.slice(
    src.indexOf("export function readCachedProfile"),
    src.indexOf("export function writeCachedProfile"),
  );
  const writeFn = src.slice(src.indexOf("export function writeCachedProfile"));
  assert.match(readFn, /try \{/);
  assert.match(readFn, /catch \{/);
  assert.match(writeFn, /try \{/);
  assert.match(writeFn, /catch \{/);
});

test("ProfileProvider hydrates from the cache before the network fetch resolves, and reconciles after", () => {
  const src = read("src/lib/profile/profile-context.tsx");
  assert.match(src, /readCachedProfile\(user\.id\)/);
  // Hydration must happen before the network call, not after.
  const hydrateIdx = src.indexOf("readCachedProfile(user.id)");
  const fetchIdx = src.indexOf("await getProfile()");
  assert.ok(hydrateIdx > -1 && fetchIdx > -1 && hydrateIdx < fetchIdx);
  // The authoritative fetch result overwrites the cache -- Supabase wins.
  assert.match(src, /writeCachedProfile\(user\.id, fresh\)/);
});

test("save() commits to the server and confirms success before updating shared state or the cache", () => {
  const src = read("src/lib/profile/profile-context.tsx");
  const saveBlock = src.slice(src.indexOf("const save = useCallback"));
  const awaitIdx = saveBlock.indexOf("await updateProfile(input)");
  const setProfileIdx = saveBlock.indexOf("setProfile(next)");
  const writeCacheIdx = saveBlock.indexOf("writeCachedProfile(user.id, next)");
  assert.ok(awaitIdx > -1 && setProfileIdx > -1 && writeCacheIdx > -1);
  assert.ok(awaitIdx < setProfileIdx, "must await the server update before touching shared state");
  assert.ok(
    setProfileIdx < writeCacheIdx,
    "must update shared state before caching (server response is authoritative)",
  );
});

test("signing out clears the in-memory profile", () => {
  const src = read("src/lib/profile/profile-context.tsx");
  const refreshBlock = src.slice(
    src.indexOf("const refresh = useCallback"),
    src.indexOf("const save = useCallback"),
  );
  assert.match(refreshBlock, /if \(!user\) \{\s*setProfile\(null\);/);
});
