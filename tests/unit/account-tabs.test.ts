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

test("the two account tabs are Creations and Account, in order -- no Profile, no Plan & Credits, no Overview", () => {
  assert.deepEqual(
    ACCOUNT_TABS.map((t) => t.id),
    ["creations", "account"],
  );
  const ids: readonly string[] = ACCOUNT_TABS.map((t) => t.id);
  assert.ok(!ids.includes("overview"), "Overview must not exist");
  assert.ok(!ids.includes("profile"), "identity lives in the Account tab, not a Profile tab");
  assert.ok(!ids.includes("plan"), "Plan & Credits merged into the Account tab");
  assert.ok(!ids.includes("favorites"), "Favorites is a public page, not an account tab");
  assert.ok(!ids.includes("history"), "History is a public page, not an account tab");
});

test("isAccountTabId rejects anything not one of the two ids", () => {
  for (const t of ACCOUNT_TABS) assert.ok(isAccountTabId(t.id));
  assert.ok(!isAccountTabId("overview"));
  assert.ok(!isAccountTabId("profile"));
  assert.ok(!isAccountTabId("plan"));
  assert.ok(!isAccountTabId("favorites"));
  assert.ok(!isAccountTabId("history"));
  assert.ok(!isAccountTabId("settings"));
  assert.ok(!isAccountTabId(undefined));
  assert.ok(!isAccountTabId(42));
});

test("Favorites and History are not linked anywhere in /account -- only from Library/Prompt", () => {
  for (const file of [
    "src/components/account/AccountNav.tsx",
    "src/components/account/AccountTab.tsx",
    "src/routes/account.tsx",
  ]) {
    const src = read(file);
    assert.doesNotMatch(src, /ROUTES\.favorites/, `${file} must not link to /favorites`);
    assert.doesNotMatch(src, /ROUTES\.history/, `${file} must not link to /history`);
  }
});

test("/account's validateSearch only accepts a known tab id, defaulting elsewhere to Account", () => {
  assert.equal(DEFAULT_ACCOUNT_TAB, "account");
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

test("no OverviewTab, ProfileTab, or PlanTab file survives the merge", () => {
  for (const f of [
    "src/components/account/OverviewTab.tsx",
    "src/components/account/ProfileTab.tsx",
    "src/components/account/PlanTab.tsx",
  ]) {
    assert.equal(
      (() => {
        try {
          readFileSync(resolve(import.meta.dirname, "../..", f));
          return true;
        } catch {
          return false;
        }
      })(),
      false,
      `${f} must not exist`,
    );
  }
});

test("AccountMenu is fast navigation (Creations/Account/Buy credits/Manage billing/Sign out), no separate Profile item", () => {
  const src = read("src/components/auth/AccountMenu.tsx");
  assert.match(src, /DropdownMenu/);
  // The identity block itself opens /account with no ?tab= (defaults to Account).
  assert.match(src, /onSelect=\{\(\) => void navigate\(\{ to: ROUTES\.account \}\)\}/);
  assert.match(src, /search: \{ tab: "creations" \}/);
  assert.match(src, /search: \{ tab: "account" \}/);
  assert.match(src, />\s*Creations\s*</);
  assert.match(
    src,
    />\s*Account\s*</,
    "a plain Account item, since there's no Profile item anymore",
  );
  assert.doesNotMatch(src, />\s*Profile\s*</, "no separate Profile menu item");
});

test("one shared AccountNav (no separate desktop rail / mobile tab row); Creations doesn't repeat the identity block", () => {
  const nav = read("src/components/account/AccountNav.tsx");
  assert.match(nav, /ACCOUNT_TABS/);
  const page = read("src/routes/account.tsx");
  assert.doesNotMatch(
    page,
    /<AccountHeader/,
    "no page-level identity header repeated above both tabs -- Creations must not show it",
  );
  assert.match(page, /<AccountNav/);
  // No permanent left sidebar for exactly two sections.
  assert.doesNotMatch(page, /AccountRail/);
});

test("identity (avatar + name/username) is edited from the Account tab, not a separate Profile screen", () => {
  const account = read("src/components/account/AccountTab.tsx");
  assert.match(account, /<DepiktAvatar/);
  assert.match(account, /useProfile\(/);
  assert.match(
    account,
    /<AvatarPickerDialog/,
    "tapping the avatar opens the avatar picker directly",
  );
  assert.match(account, /<EditProfileDialog/, "the pencil opens the name/username editor directly");
  const editDialog = read("src/components/account/EditProfileDialog.tsx");
  assert.match(editDialog, /useProfile\(/);
  assert.match(editDialog, /useIsMobile\(/, "bottom sheet on mobile, centered dialog on desktop");
  assert.match(editDialog, /side="bottom"/);
});

test("Sign out lives in the Account tab, set apart from account navigation, not mixed into a tab/menu list", () => {
  const account = read("src/components/account/AccountTab.tsx");
  assert.match(account, /AUTH_COPY\.signOut/);
  assert.match(account, /handleSignOut/);
  assert.doesNotMatch(
    read("src/components/account/AccountNav.tsx"),
    /signOut/i,
    "AccountNav must not also offer sign out",
  );
});

test("Account tab shows Plan & Credits, sign-in details, and account deletion -- everything that isn't a creation or identity edit", () => {
  const src = read("src/components/account/AccountTab.tsx");
  for (const s of [
    "PLAN &amp; CREDITS",
    "credits remaining",
    "ACCOUNT ACCESS",
    "Delete account",
    "signedInWithLabel",
  ]) {
    assert.match(src, new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), s);
  }
  // Free plan calls its extra bucket "Starter credits" in the UI even
  // though it's internally the same extra_credits bucket as purchased packs.
  assert.match(src, /Starter credits/);
  assert.match(src, /STARTER_CREDITS/);
  // Paid plans show a thin progress bar for included/allocation.
  assert.match(src, /includedPct/);
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
