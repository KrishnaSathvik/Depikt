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
    if (!isSupabaseConfigured()) return { ok: false, error: "Auth is not available" };
    try {
      sessionStorage.setItem(AUTH_STARTED_KEY, JSON.stringify({ provider }));
    } catch {
      /* ignore */
    }
    trackEvent("auth_started", { method: provider });
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri:
        redirectTo ?? (typeof window !== "undefined" ? window.location.href : undefined),
    });
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
    const emailRedirectTo =
      opts.redirectTo ?? (typeof window !== "undefined" ? window.location.href : undefined);
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
