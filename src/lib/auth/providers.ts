// Auth providers: Email (Supabase magic link) + Google, Apple, Microsoft,
// Lovable via Lovable-managed OAuth.
//
// A provider button is only rendered when it is switched on here, so the
// product never ships a dead OAuth button. All five methods (Email, Google,
// Apple, Microsoft, Lovable) are enabled on the connected Supabase project
// (Auth settings), so they default on here too; each still has its own
// VITE_AUTH_*_ENABLED override for turning one off in a specific deploy
// environment without a code change.

export type AuthProviderId = "google" | "apple" | "microsoft" | "lovable";

export interface AuthProviderDef {
  id: AuthProviderId;
  label: string;
  envKey: string;
  defaultEnabled: boolean;
}

export const AUTH_PROVIDERS: ReadonlyArray<AuthProviderDef> = [
  {
    id: "google",
    label: "Google",
    envKey: "VITE_AUTH_GOOGLE_ENABLED",
    defaultEnabled: true,
  },
  {
    id: "apple",
    label: "Apple",
    envKey: "VITE_AUTH_APPLE_ENABLED",
    defaultEnabled: true,
  },
  {
    id: "microsoft",
    label: "Microsoft",
    envKey: "VITE_AUTH_MICROSOFT_ENABLED",
    defaultEnabled: true,
  },
  {
    id: "lovable",
    label: "Lovable",
    envKey: "VITE_AUTH_LOVABLE_ENABLED",
    defaultEnabled: true,
  },
];

/** Passwordless email (Supabase magic link/OTP) — not an OAuth provider, so it isn't in AUTH_PROVIDERS. */
export const EMAIL_AUTH_ENV_KEY = "VITE_AUTH_EMAIL_ENABLED";
export const EMAIL_AUTH_DEFAULT_ENABLED = true;

type EnvLike = Record<string, string | boolean | undefined>;

// Vite's SSR module runner proxies `import.meta.env` and rejects dynamic
// (bracket, non-literal) property access on it with "Dynamic access of
// import.meta.env is not supported" — even when the access happens through a
// variable that merely holds a reference to that proxy. So each key is read
// with its own static `import.meta.env.VITE_...` expression here, once, and
// copied into a plain object that enabledAuthProviders can index freely.
function readViteEnv(): EnvLike {
  return {
    VITE_AUTH_GOOGLE_ENABLED: import.meta.env.VITE_AUTH_GOOGLE_ENABLED,
    VITE_AUTH_APPLE_ENABLED: import.meta.env.VITE_AUTH_APPLE_ENABLED,
    VITE_AUTH_MICROSOFT_ENABLED: import.meta.env.VITE_AUTH_MICROSOFT_ENABLED,
    VITE_AUTH_LOVABLE_ENABLED: import.meta.env.VITE_AUTH_LOVABLE_ENABLED,
    VITE_AUTH_EMAIL_ENABLED: import.meta.env.VITE_AUTH_EMAIL_ENABLED,
  };
}

function flagEnabled(raw: string | boolean | undefined, defaultEnabled: boolean): boolean {
  if (raw === undefined || raw === "") return defaultEnabled;
  return String(raw) === "true";
}

export function enabledAuthProviders(env: EnvLike = readViteEnv()): AuthProviderId[] {
  return AUTH_PROVIDERS.filter((p) => flagEnabled(env[p.envKey], p.defaultEnabled)).map(
    (p) => p.id,
  );
}

export function isEmailAuthEnabled(env: EnvLike = readViteEnv()): boolean {
  return flagEnabled(env[EMAIL_AUTH_ENV_KEY], EMAIL_AUTH_DEFAULT_ENABLED);
}

export function providerLabel(id: AuthProviderId): string {
  return AUTH_PROVIDERS.find((p) => p.id === id)?.label ?? id;
}

/** Session-scoped marker so auth_completed fires once per real sign-in, not on every tab focus. */
export const AUTH_STARTED_KEY = "depikt:auth-started";
