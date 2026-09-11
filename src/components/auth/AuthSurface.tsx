import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { enabledAuthProviders, providerLabel, type AuthProviderId } from "@/lib/auth/providers";
import { safeNextPath } from "@/lib/auth/next-param";
import { AUTH_COPY, ROUTES } from "@/lib/product";
import { cn } from "@/lib/utils";

export interface AuthSurfaceProps {
  mode: "sign-in" | "sign-up";
  /** Internal path to return to after OAuth; validated with safeNextPath. */
  next?: string;
  /** Compact variant for the in-context Generate chooser (no title, no mode switch). */
  compact?: boolean;
  /** Override the redirect target entirely (e.g. current URL for Generate resume). */
  redirectTo?: string;
  /** Called after the provider button is pressed (before navigation). */
  onStart?: (provider: AuthProviderId) => void;
  /** Busy-state button label. Full pages redirect ("Redirecting…"); dialogs
   *  that may resolve in place (popup/iframe) say "Signing you in…". */
  busyLabel?: string;
  className?: string;
}

function ProviderMark({ id }: { id: AuthProviderId }) {
  // Monochrome marks: black is the ink, no brand colors.
  if (id === "google")
    return (
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
        <path d="M21.6 12.23c0-.68-.06-1.33-.17-1.96H12v3.71h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.32 2.98-7.27Z" />
        <path d="M12 21.6c2.7 0 4.96-.9 6.62-2.42l-3.24-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.58A10 10 0 0 0 12 21.6Z" />
        <path d="M6.41 13.52a6 6 0 0 1 0-3.84V7.1H3.06a10 10 0 0 0 0 9l3.35-2.58Z" />
        <path d="M12 6.36c1.47 0 2.78.5 3.82 1.5l2.86-2.87A9.98 9.98 0 0 0 12 2.4a10 10 0 0 0-8.94 5.5l3.35 2.58C7.2 8.12 9.4 6.36 12 6.36Z" />
      </svg>
    );
  if (id === "apple")
    return (
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
        <path d="M16.37 12.72c.02 2.6 2.28 3.47 2.3 3.48-.02.06-.36 1.23-1.19 2.44-.71 1.05-1.45 2.09-2.62 2.11-1.15.02-1.52-.68-2.83-.68-1.31 0-1.72.66-2.8.7-1.13.04-1.98-1.13-2.7-2.17-1.47-2.13-2.6-6.02-1.08-8.64a4.18 4.18 0 0 1 3.54-2.15c1.1-.02 2.15.74 2.83.74.68 0 1.95-.92 3.28-.78.56.02 2.13.22 3.13 1.7-.08.05-1.87 1.09-1.86 3.25ZM14.2 6.4c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.65-1.05 1.69-.92 2.68.97.08 1.96-.5 2.56-1.23Z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
      <path d="M3 3h8.5v8.5H3V3Zm9.5 0H21v8.5h-8.5V3ZM3 12.5h8.5V21H3v-8.5Zm9.5 0H21V21h-8.5v-8.5Z" />
    </svg>
  );
}

/**
 * The one auth surface. /sign-in and /sign-up render it full-size with the
 * mode switch; the Generate chooser renders it compact inside a dialog. OAuth
 * only — no email, no password, no magic link in V1.
 */
export function AuthSurface({
  mode,
  next,
  compact = false,
  redirectTo,
  onStart,
  busyLabel = AUTH_COPY.redirecting,
  className,
}: AuthSurfaceProps) {
  const { signInWithProvider } = useAuth();
  const [busy, setBusy] = useState<AuthProviderId | null>(null);
  const providers = enabledAuthProviders();
  const nextPath = safeNextPath(next);

  async function start(provider: AuthProviderId) {
    setBusy(provider);
    onStart?.(provider);
    const target =
      redirectTo ??
      (typeof window !== "undefined" ? `${window.location.origin}${nextPath}` : undefined);
    const result = await signInWithProvider(provider, target);
    if (!result.ok) {
      setBusy(null);
      toast.error(result.error || "Sign-in failed");
      return;
    }
    if (!result.redirected) setBusy(null);
  }

  const isSignUp = mode === "sign-up";

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

      <div className="space-y-2">
        {providers.length === 0 && (
          <p className="text-center text-body-sm text-[color:var(--text-secondary)]">
            Sign-in is temporarily unavailable.
          </p>
        )}
        {providers.map((id) => (
          <Button
            key={id}
            type="button"
            variant="outline"
            size="lg"
            className="w-full justify-center gap-2.5"
            disabled={busy !== null}
            onClick={() => void start(id)}
            data-analytics-id={`auth-${mode}-${id}`}
          >
            <ProviderMark id={id} />
            {busy === id ? busyLabel : providerLabel(id)}
          </Button>
        ))}
      </div>

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
