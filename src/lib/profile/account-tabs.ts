// Pure /account tab definitions, kept out of AccountNav.tsx so tests (and
// any non-JSX consumer) can import it directly -- Node's built-in TS
// support strips .ts but can't parse .tsx.
//
// Two tabs, not three: identity (avatar/name/username/plan+credits) moved
// into AccountHeader -- shown above both tabs, edited via a pencil next to
// the name and by tapping the avatar directly -- so a standalone Profile
// tab was pure duplication of what the header already showed and edited.
// Plan & Credits merged into Account alongside sign-in details and account
// deletion: everything that isn't a creation or an identity edit.
//
// Favorites and History are NOT tabs here, and not linked from anywhere in
// /account at all -- they're local, Dexie/IndexedDB data never tied to a
// signed-in user_id, so their one home is the public /favorites and
// /history pages (src/routes/favorites.tsx, history.tsx), linked from
// where the data is actually created: the Library and Prompt page headers.
// Account intentionally does not duplicate that link.

export type AccountTabId = "creations" | "account";

export const ACCOUNT_TABS: ReadonlyArray<{ id: AccountTabId; label: string }> = [
  { id: "creations", label: "Creations" },
  { id: "account", label: "Account" },
];

/** Entered via the header avatar (identity click) with no explicit tab -> Account. */
export const DEFAULT_ACCOUNT_TAB: AccountTabId = "account";

export function isAccountTabId(value: unknown): value is AccountTabId {
  return typeof value === "string" && ACCOUNT_TABS.some((t) => t.id === value);
}
