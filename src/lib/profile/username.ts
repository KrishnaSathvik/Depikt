// Generated usernames and validation rules.
//
// The word lists here mirror the ones embedded in
// supabase/migrations/20260912100000_add_profiles.sql (kept in sync
// manually; tests/unit/profile-username.test.ts checks the two stay
// aligned). Real account creation always runs the SQL version, inside
// ensure_profile() on the database — this module exists so the same
// candidate shape can be validated and previewed from TypeScript (the
// availability/update API route, and any test coverage) without a live
// database connection.

import { hashToIndex } from "./hash.ts";

export const ADJECTIVES = [
  "quiet",
  "silver",
  "soft",
  "paper",
  "pixel",
  "amber",
  "cedar",
  "coral",
  "dusty",
  "faint",
  "gentle",
  "hollow",
  "ivory",
  "jade",
  "lucid",
  "mellow",
  "misty",
  "muted",
  "nimble",
  "opal",
  "pale",
  "rosy",
  "rustic",
  "slate",
] as const;

export const NOUNS = [
  "orbit",
  "frame",
  "comet",
  "fox",
  "moon",
  "harbor",
  "canyon",
  "lantern",
  "meadow",
  "ridge",
  "willow",
  "ember",
  "grove",
  "current",
  "signal",
  "compass",
  "cove",
  "drift",
  "echo",
  "field",
  "glacier",
  "horizon",
  "island",
  "juniper",
] as const;

export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "depikt",
  "support",
  "help",
  "api",
  "billing",
  "account",
  "root",
  "moderator",
  "official",
  "security",
  "privacy",
  "terms",
  "library",
  "prompt",
  "gallery",
  "blog",
  "templates",
  "pricing",
  "sign-in",
  "sign-up",
  "mcp",
  "www",
]);

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

// Lowercase letters, digits, hyphens; must start and end with an
// alphanumeric character (no leading/trailing hyphen); no "--" run.
const USERNAME_FORMAT_RE = /^[a-z0-9](?:[a-z0-9-]{0,22}[a-z0-9])?$/;

export function isValidUsernameFormat(username: string): boolean {
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) return false;
  if (!USERNAME_FORMAT_RE.test(username)) return false;
  if (username.includes("--")) return false;
  return true;
}

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(normalizeUsername(username));
}

export type UsernameValidation = { ok: true; username: string } | { ok: false; error: string };

export const USERNAME_FORMAT_ERROR =
  "Usernames are 3–24 characters: lowercase letters, numbers, and hyphens, with no leading, trailing, or repeated hyphens.";
export const USERNAME_RESERVED_ERROR = "That username is reserved.";

/** Full server-side validation: format + reserved list. Does not check availability (needs the DB). */
export function validateUsername(raw: string): UsernameValidation {
  const username = normalizeUsername(raw);
  if (!isValidUsernameFormat(username)) return { ok: false, error: USERNAME_FORMAT_ERROR };
  if (isReservedUsername(username)) return { ok: false, error: USERNAME_RESERVED_ERROR };
  return { ok: true, username };
}

/** Deterministic 4-digit suffix derived from the immutable user id. */
export function deriveUsernameSuffix(userId: string, attempt = 0): string {
  const key = attempt === 0 ? `${userId}:suffix` : `${userId}:suffix:${attempt}`;
  return String(hashToIndex(key, 9000) + 1000);
}

/**
 * One candidate username for a user id. `attempt` varies the whole
 * candidate (adjective, noun, and suffix) so a retry loop against a unique
 * constraint converges quickly without repeating the same value.
 */
export function generateUsernameCandidate(userId: string, attempt = 0): string {
  const adjIndex = hashToIndex(`${userId}:adj:${attempt}`, ADJECTIVES.length);
  const nounIndex = hashToIndex(`${userId}:noun:${attempt}`, NOUNS.length);
  const suffix = deriveUsernameSuffix(userId, attempt);
  return `${ADJECTIVES[adjIndex]}-${NOUNS[nounIndex]}-${suffix}`;
}
