// Development-only. Rendered app-wide from __root.tsx but returns null
// unless isDevAuthEnabled() — see src/lib/dev-auth.ts for the guard and
// why this exists (unblocks local QA of auth-gated flows without
// Lovable's hosted-only OAuth proxy).
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { devAuthCredentials, devSignIn, isDevAuthEnabled } from "@/lib/dev-auth";

export function DevAuthBanner() {
  const { user, loading, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isDevAuthEnabled() || loading) return null;
  const creds = devAuthCredentials();

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    const result = await devSignIn();
    setBusy(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        zIndex: 9999,
        background: "#111",
        color: "#fff",
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: 12,
        fontFamily: "monospace",
        display: "flex",
        alignItems: "center",
        gap: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}
    >
      <span style={{ opacity: 0.7 }}>DEV AUTH</span>
      {user ? (
        <>
          <span>{user.email}</span>
          <button
            type="button"
            onClick={() => void signOut()}
            style={{ color: "#fff", textDecoration: "underline", background: "none", border: 0 }}
          >
            Sign out
          </button>
        </>
      ) : creds ? (
        <button
          type="button"
          onClick={() => void handleSignIn()}
          disabled={busy}
          style={{ color: "#fff", textDecoration: "underline", background: "none", border: 0 }}
        >
          {busy ? "Signing in…" : `Sign in as ${creds.email}`}
        </button>
      ) : (
        <span style={{ color: "#f87171" }}>Set VITE_DEV_AUTH_EMAIL/PASSWORD</span>
      )}
      {error && <span style={{ color: "#f87171" }}>{error}</span>}
    </div>
  );
}
