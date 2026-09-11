import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ACCOUNT_TABS, isAccountTabId } from "../../src/lib/profile/account-tabs.ts";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("the four account sections are Overview, Creations, Profile, Plan & Credits, in order", () => {
  assert.deepEqual(
    ACCOUNT_TABS.map((t) => t.id),
    ["overview", "creations", "profile", "plan"],
  );
  assert.equal(ACCOUNT_TABS.find((t) => t.id === "plan")?.label, "Plan & Credits");
});

test("isAccountTabId rejects anything not one of the four ids", () => {
  for (const t of ACCOUNT_TABS) assert.ok(isAccountTabId(t.id));
  assert.ok(!isAccountTabId("settings"));
  assert.ok(!isAccountTabId(undefined));
  assert.ok(!isAccountTabId(42));
});

test("/account's validateSearch only accepts a known tab id, defaulting elsewhere to overview", () => {
  const src = read("src/routes/account.tsx");
  assert.match(src, /isAccountTabId\(search\.tab\)/);
  assert.match(src, /const activeTab: AccountTabId = tab \?\? "overview"/);
});

test("no separate public /creations route is created -- it's an /account tab", () => {
  assert.equal(
    (() => {
      try {
        readFileSync(resolve(import.meta.dirname, "../..", "src/routes/creations.tsx"));
        return true;
      } catch {
        return false;
      }
    })(),
    false,
  );
});

test("AccountMenu's 'My creations' opens the account creations tab, not a new route", () => {
  const src = read("src/components/auth/AccountMenu.tsx");
  assert.match(src, /ROUTES\.account, search: \{ tab: "creations" \}/);
});
