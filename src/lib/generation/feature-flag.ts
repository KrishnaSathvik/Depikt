// Native image generation — feature flag.
//
// Off by default everywhere. Flip only via GENERATION_ENABLED=true in the
// deploy environment once launch is approved — never by editing this file's
// default, so a redeploy without the env var set can't silently re-enable
// a half-finished paid-resource feature in production.

// Checked both server-side (API routes, SSR loaders — process.env) and
// client-side (Header nav, the /generate route's own redirect-vs-render
// branch — import.meta.env, which Vite statically replaces on both the
// client and server bundles, unlike process.env which browsers don't have).
// Set VITE_GENERATION_ENABLED=true in the deploy environment to flip both
// at once; GENERATION_ENABLED alone is not read by the client bundle.
export function isNativeGenerationEnabled(explicitValue?: string): boolean {
  const fromVite = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_GENERATION_ENABLED;
  const fromProcess = typeof process !== "undefined" ? process.env.GENERATION_ENABLED : undefined;
  return (explicitValue ?? fromVite ?? fromProcess) === "true";
}
