import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { AUTH_STARTED_KEY, type AuthProviderId } from "@/lib/auth/providers";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { AUTH_COPY } from "@/lib/product";

export type SignInResult = { ok: true; redirected: boolean } | { ok: false; error: string };

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /**
   * Start OAuth with one of the V1 providers via Lovable's managed broker.
   * `redirectTo` must be an absolute same-origin URL (callers build it from a
   * safeNextPath()). In a top-level window this hard-navigates; inside a
   * Lovable preview iframe it resolves after the popup completes.
   */
  signInWithProvider: (provider: AuthProviderId, redirectTo?: string) => Promise<SignInResult>;
  /**
   * Passwordless email — Supabase's own magic link/OTP, not Lovable's OAuth
   * broker (Lovable's client only handles Google/Apple/Microsoft/Lovable).
   * Never resolves `redirected: true`: this only sends the email: the
   * session is established later, when the user opens the link and lands
   * back on `redirectTo` (detectSessionInUrl picks it up automatically —
   * see src/integrations/supabase/client.ts). `shouldCreateUser: false` on
   * /sign-in so it never silently creates an account there.
   */
  signInWithEmail: (
    email: string,
    opts: { redirectTo?: string; shouldCreateUser: boolean },
  ) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signInWithProvider: async () => ({ ok: false, error: "Auth is not available" }),
  signInWithEmail: async () => ({ ok: false, error: "Auth is not available" }),
  signOut: async () => {},
});

function readAuthStarted(): { provider: string } | null {
  try {
    const raw = sessionStorage.getItem(AUTH_STARTED_KEY);
    return raw ? (JSON.parse(raw) as { provider: string }) : null;
  } catch {
    return null;
  }
}

// OAuth is handled entirely by @lovable.dev/cloud-auth-js: in a top-level
// window it hands off to the broker and comes back to `redirect_uri` with the
// tokens in the URL (detectSessionInUrl establishes the session); inside the
// Lovable preview iframe it runs its own popup + web_message flow.
//
// Do NOT hand-roll a new-tab variant of this: the broker only answers with a
// web_message when the request comes from the iframe flow, so a hand-opened
// tab stalls on oauth.lovable.app/callback and never signs the user in.

// The site answers on several hostnames (apex, the lovable.app alias) that all
// redirect to the canonical www host. A session saved on one hostname is not
// readable on another, so sign-in must always come back to the canonical one.
const CANONICAL_HOST = "www.depikt.app";
const ALIAS_HOSTS = ["depikt.app", "depikt.lovable.app"];

function canonicalRedirectUri(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const url = new URL(window.location.href);
    if (ALIAS_HOSTS.includes(url.hostname)) url.hostname = CANONICAL_HOST;
    return url.toString();
  } catch {
    return window.location.href;
  }
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // A missing Supabase configuration must not take the whole app down:
    // auth stays signed out and the public pages still render.
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    // Set up listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (event === "SIGNED_IN" && newSession?.user) {
        // Only the sign-in this tab started counts as a completion; SIGNED_IN
        // also fires on tab refocus for an existing session.
        const started = readAuthStarted();
        if (started) {
          try {
            sessionStorage.removeItem(AUTH_STARTED_KEY);
          } catch {
            /* ignore */
          }
          const createdAt = Date.parse(newSession.user.created_at ?? "");
          const isNew = Number.isFinite(createdAt) && Date.now() - createdAt < 120_000;
          trackEvent("auth_completed", { method: started.provider, is_new_user: isNew });
          if (isNew) toast.success(AUTH_COPY.welcomeToast);
        }
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithProvider = async (
    provider: AuthProviderId,
    redirectTo?: string,
  ): Promise<SignInResult> => {
    try {
      sessionStorage.setItem(AUTH_STARTED_KEY, JSON.stringify({ provider }));
    } catch {
      /* ignore */
    }
    trackEvent("auth_started", { method: provider });
    const redirectUri = redirectTo ?? canonicalRedirectUri();
    // The managed client picks the right flow for the context (redirect in a
    // real tab, popup inside the Lovable preview iframe).

    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: redirectUri });
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true, redirected: Boolean(result.redirected) };
  };

  const signInWithEmail = async (
    email: string,
    opts: { redirectTo?: string; shouldCreateUser: boolean },
  ): Promise<SignInResult> => {
    if (!isSupabaseConfigured()) return { ok: false, error: "Auth is not available" };
    try {
      sessionStorage.setItem(AUTH_STARTED_KEY, JSON.stringify({ provider: "email" }));
    } catch {
      /* ignore */
    }
    trackEvent("auth_started", { method: "email" });
    const emailRedirectTo = opts.redirectTo ?? canonicalRedirectUri();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo, shouldCreateUser: opts.shouldCreateUser },
    });
    if (error) {
      try {
        sessionStorage.removeItem(AUTH_STARTED_KEY);
      } catch {
        /* ignore */
      }
      return { ok: false, error: error.message };
    }
    return { ok: true, redirected: false };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured()) return;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithProvider, signInWithEmail, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
