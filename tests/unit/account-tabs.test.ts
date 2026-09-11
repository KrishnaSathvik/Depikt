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

test("AccountMenu is just the avatar trigger -- no dropdown, no dialog of its own -- it opens the one AccountHub", () => {
  const src = read("src/components/auth/AccountMenu.tsx");
  assert.doesNotMatch(src, /DropdownMenu/, "the dropdown was replaced by AccountHub");
  assert.match(src, /useAccountHub\(/);
  assert.match(src, /hub\.openHub\("home"\)/);
});

test("AccountHub is the one canonical account/profile/creation surface -- home, creations, creation-detail, account, edit-profile, avatar-picker", () => {
  const provider = read("src/components/account/AccountHubProvider.tsx");
  for (const view of [
    '"home"',
    '"creations"',
    '"creation-detail"',
    '"account"',
    '"edit-profile"',
    '"avatar-picker"',
  ]) {
    assert.ok(provider.includes(view), `HubView must include ${view}`);
  }
  const hub = read("src/components/account/AccountHub.tsx");
  assert.match(hub, /<CreationsGrid/);
  assert.match(hub, /<CreationDetailView/);
  assert.match(hub, /<AccountPanels/);
  assert.match(hub, /<EditProfileForm/);
  assert.match(hub, /<AvatarPickerBody/);
  // Desktop dialog vs mobile sheet, same split as the rest of the account area.
  assert.match(hub, /useIsMobile\(/);
});

test("no standalone AvatarPickerDialog/EditProfileDialog/CreationDetailDialog survive -- AccountHub replaced all three", () => {
  for (const f of [
    "src/components/account/AvatarPickerDialog.tsx",
    "src/components/account/EditProfileDialog.tsx",
    "src/components/account/CreationDetailDialog.tsx",
    "src/components/account/AccountHeader.tsx",
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

test("identity (avatar + name/username) is edited via the AccountHub, from both the Account tab and the Hub's home view", () => {
  const identityRow = read("src/components/account/IdentityRow.tsx");
  assert.match(identityRow, /<DepiktAvatar/);
  assert.match(identityRow, /useProfile\(/);
  const account = read("src/components/account/AccountTab.tsx");
  assert.match(account, /<IdentityRow/);
  assert.match(account, /hub\.pushView\("avatar-picker"\)/);
  assert.match(account, /hub\.pushView\("edit-profile"\)/);
  const hub = read("src/components/account/AccountHub.tsx");
  assert.match(hub, /<IdentityRow/);
  const editForm = read("src/components/account/EditProfileForm.tsx");
  assert.match(editForm, /useProfile\(/);
});

test("Sign out lives in the Account panels and the Hub's home view, not mixed into account navigation", () => {
  const panels = read("src/components/account/AccountPanels.tsx");
  assert.match(panels, /AUTH_COPY\.signOut/);
  assert.match(panels, /handleSignOut/);
  const hub = read("src/components/account/AccountHub.tsx");
  assert.match(hub, /AUTH_COPY\.signOut/);
  assert.doesNotMatch(
    read("src/components/account/AccountNav.tsx"),
    /signOut/i,
    "AccountNav must not also offer sign out",
  );
});

test("Account panels show Plan & Credits, sign-in details, and account deletion -- everything that isn't a creation or identity edit", () => {
  const src = read("src/components/account/AccountPanels.tsx");
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
