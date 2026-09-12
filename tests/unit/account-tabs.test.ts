// /account has no tabs and no separate Account view/page anymore --
// identity + Plan & Credits (see CreditsCard) sit above the Creations
// grid directly, on both the full-page /account fallback and the
// AccountHub's home view. Same grep-on-source approach as
// tests/unit/account-profile-api.test.ts (no React renderer in this
// project -- see CLAUDE.md's "No test framework").

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

function exists(rel: string): boolean {
  try {
    readFileSync(resolve(import.meta.dirname, "../..", rel));
    return true;
  } catch {
    return false;
  }
}

test("no separate public /creations route exists -- Creations lives on /account", () => {
  assert.equal(exists("src/routes/creations.tsx"), false);
});

test("no OverviewTab, ProfileTab, PlanTab, AccountTab, AccountPanels, or AccountNav file survives", () => {
  for (const f of [
    "src/components/account/OverviewTab.tsx",
    "src/components/account/ProfileTab.tsx",
    "src/components/account/PlanTab.tsx",
    "src/components/account/AccountTab.tsx",
    "src/components/account/AccountPanels.tsx",
    "src/components/account/AccountNav.tsx",
    "src/components/account/AccountHeader.tsx",
    "src/lib/profile/account-tabs.ts",
  ]) {
    assert.equal(exists(f), false, `${f} must not exist`);
  }
});

test("no standalone AvatarPickerDialog/EditProfileDialog/CreationDetailDialog survive -- AccountHub replaced all three", () => {
  for (const f of [
    "src/components/account/AvatarPickerDialog.tsx",
    "src/components/account/EditProfileDialog.tsx",
    "src/components/account/CreationDetailDialog.tsx",
  ]) {
    assert.equal(exists(f), false, `${f} must not exist`);
  }
});

test("AccountMenu is just the avatar trigger -- no dropdown, no dialog of its own -- it opens the one AccountHub", () => {
  const src = read("src/components/auth/AccountMenu.tsx");
  assert.doesNotMatch(src, /DropdownMenu/, "the dropdown was replaced by AccountHub");
  assert.match(src, /useAccountHub\(/);
  assert.match(src, /hub\.openHub\("home"\)/);
});

test("AccountHub has no separate account view and no separate creations view -- Creations is inline on home", () => {
  const provider = read("src/components/account/AccountHubProvider.tsx");
  for (const view of [
    '"home"',
    '"creation-detail"',
    '"edit-profile"',
    '"avatar-picker"',
    '"upgrade"',
    '"buy-credits"',
  ]) {
    assert.ok(provider.includes(view), `HubView must include ${view}`);
  }
  const hubViewDecl = provider.slice(
    provider.indexOf("export type HubView ="),
    provider.indexOf(";", provider.indexOf("export type HubView =")),
  );
  assert.doesNotMatch(hubViewDecl, /"account"(?!-)/, "there is no separate account view anymore");
  const hub = read("src/components/account/AccountHub.tsx");
  assert.match(hub, /<CreationsGrid/);
  assert.match(hub, /<CreationDetailView/);
  assert.match(hub, /<CreditsCard/);
  assert.match(hub, /<EditProfileForm/);
  assert.match(hub, /<AvatarPickerBody/);
  assert.match(hub, /<PlanCards/, "Upgrade opens PlanCards inside the hub, not /pricing");
  assert.match(hub, /<BuyCreditsBody/, "Buy credits opens inside the hub, not a separate dialog");
  assert.doesNotMatch(hub, /<AccountPanels/);
  // Home no longer has a clickable "Creations" nav row -- the grid is
  // inline, just under a plain (non-interactive) heading.
  assert.doesNotMatch(hub, /pushView\("creations"\)/);
  // Desktop dialog vs mobile sheet, same split as the rest of the account area.
  assert.match(hub, /useIsMobile\(/);
});

test("Plan & Credits (CreditsCard) and the full Creations grid sit on the profile directly -- no separate click for either", () => {
  const page = read("src/routes/account.tsx");
  assert.match(page, /<IdentityRow/);
  assert.match(page, /<CreditsCard/);
  assert.match(page, /<CreationsTab \/>/);
  // Identity+credits appear before Creations in source order.
  assert.ok(page.indexOf("<CreditsCard") < page.indexOf("<CreationsTab"));

  const hub = read("src/components/account/AccountHub.tsx");
  const homeViewBlock = hub.slice(
    hub.indexOf("function HomeView"),
    hub.indexOf("/**\n * One canonical"),
  );
  assert.match(homeViewBlock, /<IdentityRow/);
  assert.match(homeViewBlock, /<CreditsCard/);
  assert.match(homeViewBlock, /<CreationsGrid/);
  assert.ok(homeViewBlock.indexOf("<CreditsCard") < homeViewBlock.indexOf("<CreationsGrid"));
});

test("Upgrade and Buy credits both open inside the profile, never a navigation or a second stacked dialog", () => {
  const card = read("src/components/account/CreditsCard.tsx");
  assert.match(card, /onUpgrade: \(\) => void/);
  assert.match(card, /onBuyCredits: \(\) => void/);
  assert.doesNotMatch(card, /ROUTES\.pricing/, "Upgrade must not navigate to /pricing");
  assert.doesNotMatch(
    card,
    /useBuyCredits\(/,
    "Buy credits must not open the global BuyCreditsSheet from here",
  );
  const hub = read("src/components/account/AccountHub.tsx");
  assert.match(hub, /onUpgrade=\{\(\) => hub\.pushView\("upgrade"\)\}/);
  assert.match(hub, /onBuyCredits=\{\(\) => hub\.pushView\("buy-credits"\)\}/);
});

test("CreditsCard shows a plan, a credit total, a progress bar, and Buy credits -- the one Plan & Credits surface", () => {
  const src = read("src/components/account/CreditsCard.tsx");
  assert.match(src, /Plan & credits/);
  assert.match(src, /credits remaining/);
  assert.match(src, /Buy credits/);
  assert.match(src, /Manage billing/);
  assert.match(src, /View plans/);
  assert.match(src, /STARTER_CREDITS/);
  // A single thin progress bar, shared by the paid (included-this-month) and
  // free (starter grant) cases — extras stay out of the bar.
  assert.match(src, /Included this month/);
  assert.match(src, /Extra credits/);
  assert.match(src, /bg-\[color:var\(--border-subtle\)\]/);
  assert.match(src, /width: `\$\{pct\}%`/);
});

test("identity (avatar + name/username) is edited via the AccountHub, from both /account and the Hub's home view", () => {
  const identityRow = read("src/components/account/IdentityRow.tsx");
  assert.match(identityRow, /<DepiktAvatar/);
  assert.match(identityRow, /useProfile\(/);
  const page = read("src/routes/account.tsx");
  assert.match(page, /hub\.pushView\("avatar-picker"\)/);
  assert.match(page, /hub\.pushView\("edit-profile"\)/);
  const hub = read("src/components/account/AccountHub.tsx");
  assert.match(hub, /<IdentityRow/);
  const editForm = read("src/components/account/EditProfileForm.tsx");
  assert.match(editForm, /useProfile\(/);
});

test("Sign out and Delete account live only in the AccountHub's home view", () => {
  const hub = read("src/components/account/AccountHub.tsx");
  assert.match(hub, /AUTH_COPY\.signOut/);
  assert.match(hub, /<DeleteAccountAction/);
  const deleteAction = read("src/components/account/DeleteAccountAction.tsx");
  assert.match(deleteAction, /deleteAccount\(/);
  assert.match(deleteAction, /Type DELETE to confirm|type DELETE/i);
});

test("Sign out and Delete account both close the hub -- signOut()/deleteAccount() clearing the session doesn't self-close the modal", () => {
  const hub = read("src/components/account/AccountHub.tsx");
  const handleSignOutBlock = hub.slice(
    hub.indexOf("async function handleSignOut"),
    hub.indexOf("return (", hub.indexOf("async function handleSignOut")),
  );
  assert.match(handleSignOutBlock, /await signOut\(\)/);
  assert.match(handleSignOutBlock, /hub\.closeHub\(\)/);
  assert.match(hub, /onClick=\{\(\) => void handleSignOut\(\)\}/);

  const deleteAction = read("src/components/account/DeleteAccountAction.tsx");
  const handleDeleteBlock = deleteAction.slice(
    deleteAction.indexOf("async function handleDelete"),
    deleteAction.indexOf("return (", deleteAction.indexOf("async function handleDelete")),
  );
  assert.match(handleDeleteBlock, /await signOut\(\)/);
  assert.match(handleDeleteBlock, /hub\.closeHub\(\)/);
});

test("sign-in method and email sit next to Sign out in the AccountHub home view", () => {
  const hub = read("src/components/account/AccountHub.tsx");
  assert.match(hub, /Signed in with/);
  assert.match(hub, /summary\.email/);
});

test("Favorites and History are not linked anywhere in /account -- only from Library/Prompt", () => {
  for (const file of ["src/routes/account.tsx", "src/components/account/CreationsTab.tsx"]) {
    const src = read(file);
    assert.doesNotMatch(src, /ROUTES\.favorites/, `${file} must not link to /favorites`);
    assert.doesNotMatch(src, /ROUTES\.history/, `${file} must not link to /history`);
  }
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
