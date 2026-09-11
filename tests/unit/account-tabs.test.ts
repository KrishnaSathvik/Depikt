import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ACCOUNT_TABS,
  DEFAULT_ACCOUNT_TAB,
  isAccountTabId,
} from "../../src/lib/profile/account-tabs.ts";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("the five account sections are Creations, Favorites, History, Profile, Plan & Credits, in order -- no Overview", () => {
  assert.deepEqual(
    ACCOUNT_TABS.map((t) => t.id),
    ["creations", "favorites", "history", "profile", "plan"],
  );
  assert.equal(ACCOUNT_TABS.find((t) => t.id === "plan")?.label, "Plan & Credits");
  // AccountTabId's type itself no longer includes "overview" -- this just
  // confirms the runtime list matches (a stray string couldn't slip in).
  const ids: readonly string[] = ACCOUNT_TABS.map((t) => t.id);
  assert.ok(!ids.includes("overview"), "Overview must not exist");
});

test("isAccountTabId rejects anything not one of the five ids", () => {
  for (const t of ACCOUNT_TABS) assert.ok(isAccountTabId(t.id));
  assert.ok(!isAccountTabId("overview"));
  assert.ok(!isAccountTabId("settings"));
  assert.ok(!isAccountTabId(undefined));
  assert.ok(!isAccountTabId(42));
});

test("/account's validateSearch only accepts a known tab id, defaulting elsewhere to Profile", () => {
  assert.equal(DEFAULT_ACCOUNT_TAB, "profile");
  const src = read("src/routes/account.tsx");
  assert.match(src, /isAccountTabId\(search\.tab\)/);
  assert.match(src, /const activeTab: AccountTabId = tab \?\? DEFAULT_ACCOUNT_TAB/);
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

test("no OverviewTab file survives the merge", () => {
  assert.equal(
    (() => {
      try {
        readFileSync(
          resolve(import.meta.dirname, "../..", "src/components/account/OverviewTab.tsx"),
        );
        return true;
      } catch {
        return false;
      }
    })(),
    false,
  );
});

test("AccountMenu's identity block opens Profile (the default tab), no separate 'Account' item", () => {
  const src = read("src/components/auth/AccountMenu.tsx");
  // The identity DropdownMenuItem navigates to /account with no explicit
  // tab, which resolves to Profile via DEFAULT_ACCOUNT_TAB.
  assert.match(src, /onSelect=\{\(\) => void navigate\(\{ to: ROUTES\.account \}\)\}/);
  assert.doesNotMatch(src, />\s*Account\s*</, "no generic 'Account' menu item");
  for (const tab of ["Creations", "Favorites", "History"]) {
    assert.match(src, new RegExp(`search: \\{ tab: "${tab.toLowerCase()}" \\}`));
    assert.match(src, new RegExp(`>\\s*${tab}\\s*<`));
  }
});

test("desktop uses a left rail, mobile uses the horizontal tab row -- both share ACCOUNT_TABS", () => {
  const rail = read("src/components/account/AccountRail.tsx");
  assert.match(rail, /hidden .*lg:block/);
  assert.match(rail, /ACCOUNT_TABS/);
  const tabs = read("src/components/account/AccountTabs.tsx");
  assert.match(tabs, /ACCOUNT_TABS/);
  const page = read("src/routes/account.tsx");
  assert.match(page, /<AccountRail/);
  assert.match(page, /<AccountTabs/);
  assert.match(page, /lg:hidden/, "the mobile tab row must be hidden at lg+");
});
