/** Canonical public hostname. Apex and lovable.app aliases redirect here. */
export const CANONICAL_HOST = "www.depikt.app";
export const ALIAS_HOSTS = ["depikt.app", "depikt.lovable.app"];

export const SITE_URL = (
  (typeof import.meta.env !== "undefined" ? import.meta.env.VITE_SITE_URL : undefined) ||
  (typeof process !== "undefined" ? process.env.SITE_URL : undefined) ||
  `https://${CANONICAL_HOST}`
).replace(/\/$/, "");

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Rewrite apex / lovable.app alias URLs onto the canonical www host.
 * OAuth and magic-link returns must land on www: apex 302s there and would
 * drop hash tokens, and a session stored on one host is invisible on the other.
 */
export function toCanonicalUrl(href?: string): string | undefined {
  const raw = href?.trim() || (typeof window !== "undefined" ? window.location.href : undefined);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (ALIAS_HOSTS.includes(url.hostname)) url.hostname = CANONICAL_HOST;
    return url.toString();
  } catch {
    return raw;
  }
}
