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

// Same broker + message protocol as @lovable.dev/cloud-auth-js's popup flow,
// but always in a new tab so the app window never navigates away.
const OAUTH_INITIATE_PATH = "/~oauth/initiate";
const OAUTH_MESSAGE_ORIGINS = ["https://oauth.lovable.app", "https://lovable.dev"];

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function generateOAuthState(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return [...crypto.getRandomValues(new Uint8Array(16))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

interface OAuthBrokerResponse {
  state?: string;
  error?: string;
  error_description?: string;
  access_token?: string;
  refresh_token?: string;
}

async function signInWithProviderNewTab(
  provider: AuthProviderId,
  redirectUri: string | undefined,
): Promise<SignInResult> {
  const state = generateOAuthState();
  const params = new URLSearchParams({
    provider,
    redirect_uri: redirectUri ?? window.location.href,
    state,
    response_mode: "web_message",
  });
  const url = `${window.location.origin}${OAUTH_INITIATE_PATH}?${params.toString()}`;
  const tab = window.open(url, "_blank");
  if (!tab) {
    // Popup blocked — fall back to the classic full-page redirect.
    window.location.href = url;
    return { ok: true, redirected: true };
  }
  let response: OAuthBrokerResponse;
  try {
    response = await new Promise<OAuthBrokerResponse>((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        // The broker posts from its own origin, but when the callback is served
        // from this site's domain (apex/www variants) the message origin is ours.
        if (!OAUTH_MESSAGE_ORIGINS.includes(event.origin) && !isTrustedAppOrigin(event.origin))
          return;
        const data = event.data as { type?: string; response?: OAuthBrokerResponse } | null;
        if (!data || data.type !== "authorization_response" || !data.response) return;
        cleanup();
        resolve(data.response);
      };
      const closedTimer = window.setInterval(() => {
        if (tab.closed) {
          cleanup();
          reject(new Error("Sign-in window was closed"));
        }
      }, 500);
      const cleanup = () => {
        window.removeEventListener("message", onMessage);
        window.clearInterval(closedTimer);
      };
      window.addEventListener("message", onMessage);
    });
  } catch (error) {
    try {
      sessionStorage.removeItem(AUTH_STARTED_KEY);
    } catch {
      /* ignore */
    }
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  if (response.state !== state) return { ok: false, error: "State is invalid" };
  if (response.error) {
    return { ok: false, error: response.error_description ?? "Sign in failed" };
  }
  if (!response.access_token || !response.refresh_token) {
    return { ok: false, error: "No tokens received" };
  }
  try {
    await supabase.auth.setSession({
      access_token: response.access_token,
      refresh_token: response.refresh_token,
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  return { ok: true, redirected: false };
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
    const redirectUri =
      redirectTo ?? (typeof window !== "undefined" ? window.location.href : undefined);
    // In a top-level window, open the provider login in a NEW TAB and listen
    // for the broker's postMessage, so the app stays put. In a preview iframe
    // the managed client already handles the popup flow itself.
    if (!isInIframe()) {
      return signInWithProviderNewTab(provider, redirectUri);
    }
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
