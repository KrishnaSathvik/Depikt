// V1 auth providers: Google, Apple, Microsoft via Lovable-managed OAuth.
//
// A provider button is only rendered when it is switched on here, so the
// product never ships a dead OAuth button. Google is the one provider verified
// live in production; Apple and Microsoft require enabling in Lovable Cloud
// (Users → Auth settings) first, then VITE_AUTH_APPLE_ENABLED /
// VITE_AUTH_MICROSOFT_ENABLED=true in the deploy environment.

export type AuthProviderId = "google" | "apple" | "microsoft";

export interface AuthProviderDef {
  id: AuthProviderId;
  label: string;
  envKey: string;
  defaultEnabled: boolean;
}

export const AUTH_PROVIDERS: ReadonlyArray<AuthProviderDef> = [
  {
    id: "google",
    label: "Continue with Google",
    envKey: "VITE_AUTH_GOOGLE_ENABLED",
    defaultEnabled: true,
  },
  {
    id: "apple",
    label: "Continue with Apple",
    envKey: "VITE_AUTH_APPLE_ENABLED",
    defaultEnabled: false,
  },
  {
    id: "microsoft",
    label: "Continue with Microsoft",
    envKey: "VITE_AUTH_MICROSOFT_ENABLED",
    defaultEnabled: false,
  },
];

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
  };
}

export function enabledAuthProviders(env: EnvLike = readViteEnv()): AuthProviderId[] {
  return AUTH_PROVIDERS.filter((p) => {
    const raw = env[p.envKey];
    if (raw === undefined || raw === "") return p.defaultEnabled;
    return String(raw) === "true";
  }).map((p) => p.id);
}

export function providerLabel(id: AuthProviderId): string {
  return AUTH_PROVIDERS.find((p) => p.id === id)?.label ?? id;
}

/** Session-scoped marker so auth_completed fires once per real sign-in, not on every tab focus. */
export const AUTH_STARTED_KEY = "depikt:auth-started";
