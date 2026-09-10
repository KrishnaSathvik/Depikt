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

function readViteEnv(): EnvLike {
  const meta = import.meta as ImportMeta & { env?: EnvLike };
  return meta.env ?? {};
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
