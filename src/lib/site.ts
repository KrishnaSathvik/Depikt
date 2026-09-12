/** Canonical public hostname. Apex and lovable.app aliases redirect here. */
export const CANONICAL_HOST = "www.depikt.app";
export const ALIAS_HOSTS = ["depikt.app", "depikt.lovable.app"];

export const SITE_URL = (
  import.meta.env.VITE_SITE_URL ||
  process.env.SITE_URL ||
  `https://${CANONICAL_HOST}`
).replace(/\/$/, "");

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
