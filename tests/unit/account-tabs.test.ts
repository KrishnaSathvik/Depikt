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

test("the three account tabs are Creations, Profile, Plan & Credits, in order -- no Overview", () => {
  assert.deepEqual(
    ACCOUNT_TABS.map((t) => t.id),
    ["creations", "profile", "plan"],
  );
  assert.equal(ACCOUNT_TABS.find((t) => t.id === "plan")?.label, "Plan & Credits");
  // AccountTabId's type itself no longer includes "overview" -- this just
  // confirms the runtime list matches (a stray string couldn't slip in).
  const ids: readonly string[] = ACCOUNT_TABS.map((t) => t.id);
  assert.ok(!ids.includes("overview"), "Overview must not exist");
  assert.ok(!ids.includes("favorites"), "Favorites is a public page, not an account tab");
  assert.ok(!ids.includes("history"), "History is a public page, not an account tab");
});

test("isAccountTabId rejects anything not one of the three ids", () => {
  for (const t of ACCOUNT_TABS) assert.ok(isAccountTabId(t.id));
  assert.ok(!isAccountTabId("overview"));
  assert.ok(!isAccountTabId("favorites"));
  assert.ok(!isAccountTabId("history"));
  assert.ok(!isAccountTabId("settings"));
  assert.ok(!isAccountTabId(undefined));
  assert.ok(!isAccountTabId(42));
});

test("Favorites and History are not linked anywhere in /account -- only from Library/Prompt", () => {
  for (const file of [
    "src/components/account/AccountRail.tsx",
    "src/components/account/AccountTabs.tsx",
    "src/routes/account.tsx",
  ]) {
    const src = read(file);
    assert.doesNotMatch(src, /ROUTES\.favorites/, `${file} must not link to /favorites`);
    assert.doesNotMatch(src, /ROUTES\.history/, `${file} must not link to /history`);
  }
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

test("AccountMenu is a direct link to /account (Profile, the default tab) -- no dropdown", () => {
  const src = read("src/components/auth/AccountMenu.tsx");
  assert.doesNotMatch(src, /DropdownMenu/, "the header avatar no longer opens a dropdown");
  assert.match(src, /to=\{ROUTES\.account\}/);
  assert.match(src, /<DepiktAvatar/);
  // No duplicated navigation: none of the account-rail destinations, buy
  // credits, or sign out are wired up as click handlers here anymore --
  // they're one click away on /account itself, not a second menu first.
  assert.doesNotMatch(src, /onSelect=|onClick=/, "no menu items, just the one link");
});

test("desktop uses a left rail, mobile uses the horizontal tab row -- both share ACCOUNT_TABS and offer Sign out", () => {
  const rail = read("src/components/account/AccountRail.tsx");
  assert.match(rail, /hidden .*lg:block/);
  assert.match(rail, /ACCOUNT_TABS/);
  assert.match(rail, /AUTH_COPY\.signOut/);
  const tabs = read("src/components/account/AccountTabs.tsx");
  assert.match(tabs, /ACCOUNT_TABS/);
  assert.match(tabs, /AUTH_COPY\.signOut/);
  const page = read("src/routes/account.tsx");
  assert.match(page, /<AccountRail/);
  assert.match(page, /<AccountTabs/);
  assert.match(page, /lg:hidden/, "the mobile tab row must be hidden at lg+");
});

test("/favorites and /history are public routes, not gated by auth", () => {
  for (const [route, tab] of [
    ["src/routes/favorites.tsx", "FavoritesTab"],
    ["src/routes/history.tsx", "HistoryTab"],
  ]) {
    const src = read(route);
    assert.match(src, new RegExp(`<${tab} />`));
    assert.doesNotMatch(
      src,
      /navigate\(\{ to: ROUTES\.signIn/,
      `${route} must not redirect signed-out visitors away`,
    );
  }
});
