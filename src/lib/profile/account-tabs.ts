// Pure /account tab definitions, kept out of AccountTabs.tsx so tests (and
// any non-JSX consumer) can import it directly -- Node's built-in TS
// support strips .ts but can't parse .tsx.
//
// No Overview: every section it summarized (identity, plan, credits,
// recent creations, sign out) already exists on its own tab or in the
// header's account menu, so a fifth "summary of everything else" tab was
// pure duplication.
//
// Favorites and History are NOT tabs here (despite living under
// src/components/account/ for historical reasons -- they render fine
// standalone). Both are local, Dexie/IndexedDB data never tied to a
// signed-in user_id, so gating them behind /account's auth redirect shut
// out anyone who hadn't signed up. They're public pages at /favorites and
// /history (src/routes/favorites.tsx, history.tsx); AccountRail/AccountTabs
// render them as plain links to those routes, not as tab-switch state, so
// a signed-in visitor sees the exact same page either way.
// Relative, not "@/lib/product" -- this file is imported directly by
// tests/unit/account-tabs.test.ts under Node's plain --test runner, which
// doesn't resolve the "@/" path alias (only the Vite build does).
import { ROUTES } from "../product.ts";

export type AccountTabId = "creations" | "profile" | "plan";

export const ACCOUNT_TABS: ReadonlyArray<{ id: AccountTabId; label: string }> = [
  { id: "creations", label: "Creations" },
  { id: "profile", label: "Profile" },
  { id: "plan", label: "Plan & Credits" },
];

/** Rendered as links (not tabs) in the same rail/row, between Creations and Profile. */
export const ACCOUNT_EXTERNAL_LINKS: ReadonlyArray<{ to: string; label: string }> = [
  { to: ROUTES.favorites, label: "Favorites" },
  { to: ROUTES.history, label: "History" },
];

/** Entered via the header avatar (identity click) with no explicit tab -> Profile. */
export const DEFAULT_ACCOUNT_TAB: AccountTabId = "profile";

export function isAccountTabId(value: unknown): value is AccountTabId {
  return typeof value === "string" && ACCOUNT_TABS.some((t) => t.id === value);
}
