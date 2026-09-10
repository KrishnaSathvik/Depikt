// Development-only Supabase email/password sign-in, for local QA of
// auth-gated flows (native image generation) without going through
// Lovable's OAuth proxy (`/~oauth/initiate`), which only exists on a
// hosted Lovable preview/production surface and 404s under plain `vite dev`.
//
// This is a REAL Supabase Auth session — signInWithPassword/signUp against
// the same anon-key client the rest of the app uses, RLS fully enforced,
// auth.uid() populated normally. It is not a bypass: it's a second,
// standard Supabase auth method (email/password) used only to reach a
// normal session locally, guarded so it can never activate outside dev:
//
//   import.meta.env.DEV                    — Vite's own dev-mode flag
//   VITE_DEV_AUTH_ENABLED === "true"       — explicit opt-in, unset by default
//
// Credentials come from VITE_DEV_AUTH_EMAIL / VITE_DEV_AUTH_PASSWORD in
// .env.local (git-ignored — see .gitignore's `*.local`). Nothing here is
// wired into production code paths or committed secrets.
import { supabase } from "@/integrations/supabase/client";

export function isDevAuthEnabled(): boolean {
  return Boolean(import.meta.env.DEV) && import.meta.env.VITE_DEV_AUTH_ENABLED === "true";
}

export function devAuthCredentials(): { email: string; password: string } | null {
  const email = import.meta.env.VITE_DEV_AUTH_EMAIL as string | undefined;
  const password = import.meta.env.VITE_DEV_AUTH_PASSWORD as string | undefined;
  if (!email || !password) return null;
  return { email, password };
}

/**
 * Sign in as the dev test user, creating the account on first use
 * (ordinary self-service Supabase signUp — no admin/service-role access
 * used or required). Returns an error message on failure.
 */
export async function devSignIn(): Promise<{ ok: true } | { ok: false; error: string }> {
  const creds = devAuthCredentials();
  if (!creds) return { ok: false, error: "VITE_DEV_AUTH_EMAIL/PASSWORD not set in .env.local" };

  const signIn = await supabase.auth.signInWithPassword(creds);
  if (!signIn.error) return { ok: true };

  // First run: the dev account doesn't exist yet — create it. Supabase's
  // self-service signUp, same as any real user would use.
  if (/invalid login credentials/i.test(signIn.error.message)) {
    const signUp = await supabase.auth.signUp(creds);
    if (signUp.error) return { ok: false, error: signUp.error.message };
    if (signUp.data.session) return { ok: true };
    return {
      ok: false,
      error: "Account created but no session returned — email confirmation may be required.",
    };
  }

  return { ok: false, error: signIn.error.message };
}
