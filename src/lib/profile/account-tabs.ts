// Pure /account tab definitions, kept out of AccountTabs.tsx so tests (and
// any non-JSX consumer) can import it directly -- Node's built-in TS
// support strips .ts but can't parse .tsx.

export type AccountTabId = "overview" | "creations" | "profile" | "plan";

export const ACCOUNT_TABS: ReadonlyArray<{ id: AccountTabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "creations", label: "Creations" },
  { id: "profile", label: "Profile" },
  { id: "plan", label: "Plan & Credits" },
];

export function isAccountTabId(value: unknown): value is AccountTabId {
  return typeof value === "string" && ACCOUNT_TABS.some((t) => t.id === value);
}
