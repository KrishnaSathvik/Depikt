// Pure /account tab definitions, kept out of AccountTabs.tsx so tests (and
// any non-JSX consumer) can import it directly -- Node's built-in TS
// support strips .ts but can't parse .tsx.
//
// No Overview: every section it summarized (identity, plan, credits,
// recent creations, sign out) already exists on its own tab or in the
// header's account menu, so a fifth "summary of everything else" tab was
// pure duplication. Favorites and History moved in from /library — they're
// personal data, so the signed-in account is a more natural home than the
// public library page.

export type AccountTabId = "creations" | "favorites" | "history" | "profile" | "plan";

export const ACCOUNT_TABS: ReadonlyArray<{ id: AccountTabId; label: string }> = [
  { id: "creations", label: "Creations" },
  { id: "favorites", label: "Favorites" },
  { id: "history", label: "History" },
  { id: "profile", label: "Profile" },
  { id: "plan", label: "Plan & Credits" },
];

/** Entered via the header avatar (identity click) with no explicit tab -> Profile. */
export const DEFAULT_ACCOUNT_TAB: AccountTabId = "profile";

export function isAccountTabId(value: unknown): value is AccountTabId {
  return typeof value === "string" && ACCOUNT_TABS.some((t) => t.id === value);
}
