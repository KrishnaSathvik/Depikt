// Native image generation — feature flag.
//
// Off by default everywhere. Flip only via GENERATION_ENABLED=true in the
// deploy environment once launch is approved — never by editing this file's
// default, so a redeploy without the env var set can't silently re-enable
// a half-finished paid-resource feature in production.

export function isNativeGenerationEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.GENERATION_ENABLED === "true";
}
