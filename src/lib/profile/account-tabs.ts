// Pure /account tab definitions, kept out of AccountTabs.tsx so tests (and
// any non-JSX consumer) can import it directly -- Node's built-in TS
// support strips .ts but can't parse .tsx.
//
// No Overview: every section it summarized (identity, plan, credits,
// recent creations, sign out) already exists on its own tab or in the
// rail/row's own Sign out action, so a fifth "summary of everything else"
// tab was pure duplication.
//
// Favorites and History are NOT tabs here, and not linked from anywhere in
// /account at all -- they're local, Dexie/IndexedDB data never tied to a
// signed-in user_id, so their one home is the public /favorites and
// /history pages (src/routes/favorites.tsx, history.tsx), linked from
// where the data is actually created: the Library and Prompt page headers.
// Account intentionally does not duplicate that link.

export type AccountTabId = "creations" | "profile" | "plan";

export const ACCOUNT_TABS: ReadonlyArray<{ id: AccountTabId; label: string }> = [
  { id: "creations", label: "Creations" },
  { id: "profile", label: "Profile" },
  { id: "plan", label: "Plan & Credits" },
];

/** Entered via the header avatar (identity click) with no explicit tab -> Profile. */
export const DEFAULT_ACCOUNT_TAB: AccountTabId = "profile";

export function isAccountTabId(value: unknown): value is AccountTabId {
  return typeof value === "string" && ACCOUNT_TABS.some((t) => t.id === value);
}
