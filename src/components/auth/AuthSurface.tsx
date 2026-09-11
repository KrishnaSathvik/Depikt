import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import {
  enabledAuthProviders,
  isEmailAuthEnabled,
  providerLabel,
  type AuthProviderId,
} from "@/lib/auth/providers";
import { safeNextPath } from "@/lib/auth/next-param";
import { AUTH_COPY, ROUTES } from "@/lib/product";
import { cn } from "@/lib/utils";

export interface AuthSurfaceProps {
  mode: "sign-in" | "sign-up";
  /** Internal path to return to after auth; validated with safeNextPath. */
  next?: string;
  /** Compact variant for the in-context Generate/billing chooser (no title, no mode switch). */
  compact?: boolean;
  /** Override the redirect target entirely (e.g. current URL for Generate resume). */
  redirectTo?: string;
  /** Called after a provider button (OAuth or email) is pressed, before the request starts. */
  onStart?: (provider: AuthProviderId | "email") => void;
  /**
   * When true, an OAuth provider click calls `onStart` and stops — the
   * caller is expected to start the sign-in itself (e.g. AuthGateDialog's
   * `gen.chooseAuthProvider`, which also owns closing the dialog and its
   * own error toast). Without this, both AuthSurface and the caller would
   * call signInWithProvider for the same click. Email is unaffected: there
   * is no equivalent external starter for it, so `submitEmail` always calls
   * signInWithEmail itself regardless of this flag.
   */
  skipOwnSignIn?: boolean;
  /** Busy-state button label. Full pages redirect ("Redirecting…"); dialogs
   *  that may resolve in place (popup/iframe) say "Signing you in…". */
  busyLabel?: string;
  className?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_S = 30;

/** Real brand marks — Google's 4-color G, Apple's mark (single-color by
 * design), Microsoft's 4-square mark, an approximation of Lovable's pink
 * mark (no official asset shipped with this project), and a plain envelope
 * for email. Never a monochrome placeholder. */
function ProviderMark({ id }: { id: AuthProviderId }) {
  if (id === "google")
    return (
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
        <path
          fill="#4285F4"
          d="M21.6 12.23c0-.68-.06-1.33-.17-1.96H12v3.71h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.32 2.98-7.27Z"
        />
        <path
          fill="#34A853"
          d="M12 21.6c2.7 0 4.96-.9 6.62-2.42l-3.24-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.58A10 10 0 0 0 12 21.6Z"
        />
        <path fill="#FBBC05" d="M6.41 13.52a6 6 0 0 1 0-3.84V7.1H3.06a10 10 0 0 0 0 9l3.35-2.58Z" />
        <path
          fill="#EA4335"
          d="M12 6.36c1.47 0 2.78.5 3.82 1.5l2.86-2.87A9.98 9.98 0 0 0 12 2.4a10 10 0 0 0-8.94 5.5l3.35 2.58C7.2 8.12 9.4 6.36 12 6.36Z"
        />
      </svg>
    );
  if (id === "apple")
    return (
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
        <path d="M16.37 12.72c.02 2.6 2.28 3.47 2.3 3.48-.02.06-.36 1.23-1.19 2.44-.71 1.05-1.45 2.09-2.62 2.11-1.15.02-1.52-.68-2.83-.68-1.31 0-1.72.66-2.8.7-1.13.04-1.98-1.13-2.7-2.17-1.47-2.13-2.6-6.02-1.08-8.64a4.18 4.18 0 0 1 3.54-2.15c1.1-.02 2.15.74 2.83.74.68 0 1.95-.92 3.28-.78.56.02 2.13.22 3.13 1.7-.08.05-1.87 1.09-1.86 3.25ZM14.2 6.4c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.65-1.05 1.69-.92 2.68.97.08 1.96-.5 2.56-1.23Z" />
      </svg>
    );
  if (id === "microsoft")
    return (
      <svg viewBox="0 0 23 23" aria-hidden className="h-4 w-4">
        <rect x="1" y="1" width="10" height="10" fill="#F25022" />
        <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
        <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
        <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
      </svg>
    );
  // Lovable — approximated (no official brand asset in this project).
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="#FB64B6">
      <path d="M12 20.5s-7.5-4.44-9.7-9.08C.9 8.2 2.3 4.9 5.6 4.1c1.9-.46 3.9.3 5 1.9a1 1 0 0 0 1.6 0c1.1-1.6 3.1-2.36 5-1.9 3.3.8 4.7 4.1 3.3 7.32C19.5 16.06 12 20.5 12 20.5Z" />
    </svg>
  );
}

function EmailMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

/**
 * The one auth surface. /sign-in and /sign-up render it full-size with the
 * mode switch; the Generate/billing choosers render it compact inside a
 * dialog. Email (passwordless magic link) is primary; Google/Apple/
 * Microsoft/Lovable follow in a 2x2 grid on desktop, one column on mobile.
 */
export function AuthSurface({
  mode,
  next,
  compact = false,
  redirectTo,
  onStart,
  skipOwnSignIn = false,
  busyLabel = AUTH_COPY.redirecting,
  className,
}: AuthSurfaceProps) {
  const { signInWithProvider, signInWithEmail } = useAuth();
  const [busy, setBusy] = useState<AuthProviderId | "email" | null>(null);
  const [view, setView] = useState<"form" | "sent">("form");
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const providers = enabledAuthProviders();
  const emailEnabled = isEmailAuthEnabled();
  const nextPath = safeNextPath(next);
  const isSignUp = mode === "sign-up";

  useEffect(
    () => () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    },
    [],
  );

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_S);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1 && cooldownRef.current) clearInterval(cooldownRef.current);
        return Math.max(0, s - 1);
      });
    }, 1000);
  }

  function target() {
    return (
      redirectTo ??
      (typeof window !== "undefined" ? `${window.location.origin}${nextPath}` : undefined)
    );
  }

  async function startProvider(provider: AuthProviderId) {
    setBusy(provider);
    onStart?.(provider);
    if (skipOwnSignIn) return;
    const result = await signInWithProvider(provider, target());
    if (!result.ok) {
      setBusy(null);
      toast.error(result.error || "Sign-in failed");
      return;
    }
    if (!result.redirected) setBusy(null);
  }

  async function submitEmail(e?: React.FormEvent) {
    e?.preventDefault();
    if (!EMAIL_RE.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    setBusy("email");
    onStart?.("email");
    const result = await signInWithEmail(email, {
      redirectTo: target(),
      shouldCreateUser: isSignUp,
    });
    setBusy(null);
    if (!result.ok) {
      toast.error(!isSignUp ? AUTH_COPY.emailNotFound : result.error || "Could not send the link");
      return;
    }
    setView("sent");
    startCooldown();
  }

  async function resend() {
    if (cooldown > 0) return;
    setBusy("email");
    const result = await signInWithEmail(email, {
      redirectTo: target(),
      shouldCreateUser: isSignUp,
    });
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error || "Could not resend the link");
      return;
    }
    startCooldown();
  }

  if (view === "sent") {
    return (
      <div className={cn("w-full max-w-[360px]", className)}>
        <div className="text-center">
          <h1 className="text-heading-lg">{AUTH_COPY.checkInboxTitle}</h1>
          <p className="mt-2 text-body-md text-[color:var(--text-secondary)]">
            {AUTH_COPY.checkInboxBody}
          </p>
          <p className="mt-1 text-body-md font-medium text-[color:var(--text-primary)]">{email}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-6 w-full justify-center"
          onClick={() => {
            setView("form");
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            setCooldown(0);
          }}
        >
          {AUTH_COPY.useAnotherEmail}
        </Button>
        <p className="mt-4 text-center text-body-sm text-[color:var(--text-tertiary)]">
          {AUTH_COPY.resendPrompt}{" "}
          {cooldown > 0 ? (
            <span>
              {AUTH_COPY.resendAction} in {cooldown}s
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void resend()}
              disabled={busy === "email"}
              className="font-medium text-[color:var(--text-primary)] underline-offset-4 hover:underline"
            >
              {AUTH_COPY.resendAction}
            </button>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("w-full max-w-[360px]", className)}>
      {!compact && (
        <div className="mb-8 text-center">
          <h1 className="text-heading-lg">
            {isSignUp ? AUTH_COPY.signUpTitle : AUTH_COPY.signInTitle}
          </h1>
          <p className="mt-2 text-body-md text-[color:var(--text-secondary)]">
            {isSignUp ? AUTH_COPY.signUpSubtitle : AUTH_COPY.signInSubtitle}
          </p>
        </div>
      )}

      {providers.length === 0 && !emailEnabled && (
        <p className="text-center text-body-sm text-[color:var(--text-secondary)]">
          Sign-in is temporarily unavailable.
        </p>
      )}

      {emailEnabled && (
        <form onSubmit={(e) => void submitEmail(e)} className="space-y-2">
          <label htmlFor="auth-email" className="sr-only">
            {AUTH_COPY.emailLabel}
          </label>
          <Input
            id="auth-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={AUTH_COPY.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy !== null}
          />
          <Button
            type="submit"
            size="lg"
            className="w-full justify-center"
            disabled={busy !== null || !EMAIL_RE.test(email)}
          >
            <EmailMark />
            {busy === "email" ? AUTH_COPY.sendingLink : AUTH_COPY.continueWithEmail}
          </Button>
        </form>
      )}

      {emailEnabled && providers.length > 0 && (
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[color:var(--border-subtle)]" />
          <span className="text-[12px] text-[color:var(--text-tertiary)]">
            {AUTH_COPY.orContinueWith}
          </span>
          <div className="h-px flex-1 bg-[color:var(--border-subtle)]" />
        </div>
      )}

      {providers.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {providers.map((id) => (
            <Button
              key={id}
              type="button"
              variant="outline"
              size="lg"
              className="w-full justify-center gap-2.5"
              disabled={busy !== null}
              onClick={() => void startProvider(id)}
              data-analytics-id={`auth-${mode}-${id}`}
            >
              <ProviderMark id={id} />
              {busy === id ? busyLabel : providerLabel(id)}
            </Button>
          ))}
        </div>
      )}

      {(isSignUp || compact) && (
        <p className="mt-5 text-center text-[12px] leading-relaxed text-[color:var(--text-tertiary)]">
          {AUTH_COPY.legalPrefix}{" "}
          <Link
            to={ROUTES.terms}
            className="underline underline-offset-4 hover:text-[color:var(--text-primary)]"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            to={ROUTES.privacy}
            className="underline underline-offset-4 hover:text-[color:var(--text-primary)]"
          >
            Privacy Policy
          </Link>
          .
        </p>
      )}

      {isSignUp && !compact && (
        <p className="mt-6 text-center text-[12px] text-[color:var(--text-tertiary)]">
          {AUTH_COPY.signUpNote}
        </p>
      )}

      {!compact && (
        <p className="mt-8 text-center text-body-sm text-[color:var(--text-secondary)]">
          {isSignUp ? AUTH_COPY.haveAccount : AUTH_COPY.newToDepikt}{" "}
          <Link
            to={isSignUp ? ROUTES.signIn : ROUTES.signUp}
            search={nextPath !== "/" ? { next: nextPath } : undefined}
            className="font-medium text-[color:var(--text-primary)] underline-offset-4 hover:underline"
          >
            {isSignUp ? AUTH_COPY.signIn : AUTH_COPY.createAccount} →
          </Link>
        </p>
      )}
    </div>
  );
}
