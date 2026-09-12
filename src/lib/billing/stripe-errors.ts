/** Narrow view of a Stripe SDK error without importing the SDK into tests. */
export interface StripeLikeError {
  message: string;
  code?: string;
  param?: string;
  type?: string;
}

export function stripeLikeError(err: unknown): StripeLikeError | null {
  if (!err || typeof err !== "object") return null;
  const message = (err as { message?: unknown }).message;
  if (typeof message !== "string" || !message) return null;
  const code = (err as { code?: unknown }).code;
  const param = (err as { param?: unknown }).param;
  const type = (err as { type?: unknown }).type;
  return {
    message,
    code: typeof code === "string" ? code : undefined,
    param: typeof param === "string" ? param : undefined,
    type: typeof type === "string" ? type : undefined,
  };
}

export function isMissingStripeCustomer(err: unknown): boolean {
  const info = stripeLikeError(err);
  if (!info) return false;
  if (/no such customer/i.test(info.message)) return true;
  return info.code === "resource_missing" && info.param === "customer";
}

/** Owner-facing checkout copy. Stripe's own message is kept when it's specific. */
export function publicCheckoutError(err: unknown): string {
  const info = stripeLikeError(err);
  if (!info) return "Could not start checkout";
  if (
    /no such price/i.test(info.message) ||
    (info.code === "resource_missing" && info.param === "price")
  ) {
    return "Live Stripe is on, but this product still uses a test-mode price. Set STRIPE_PRICE_* to live Price IDs.";
  }
  if (/cannot currently make live charges/i.test(info.message)) {
    return "Stripe hasn't enabled live charges on this account yet.";
  }
  return info.message;
}
