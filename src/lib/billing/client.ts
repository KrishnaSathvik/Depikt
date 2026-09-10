// Browser-side billing calls. Every request carries the user's own Supabase
// bearer token (same as generation); the server resolves all money values.

import { generationFetch, GenerationApiError } from "@/lib/generation/client";
import { trackEvent } from "@/lib/analytics";
import { CATALOG, type ProductKey } from "./plans";
import type { AccountSummaryResponse } from "@/routes/api/billing/account";

async function billingJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await generationFetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new GenerationApiError(
      (body as { error?: string }).error ?? "Request failed",
      res.status,
    );
  }
  return body as T;
}

/** Creates a hosted Checkout Session for a catalog key and navigates to it. */
export async function startCheckout(productKey: ProductKey): Promise<void> {
  const product = CATALOG[productKey];
  trackEvent(product.kind === "pack" ? "credit_pack_selected" : "plan_selected", {
    product_key: productKey,
  });
  trackEvent("checkout_started", {
    product_key: productKey,
    value: product.priceCents / 100,
    currency: "USD",
  });
  const { url } = await billingJson<{ url: string }>("/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ productKey }),
  });
  window.location.assign(url);
}

/** Opens the Stripe Customer Portal in the current tab. */
export async function openBillingPortal(): Promise<void> {
  trackEvent("billing_portal_opened", {});
  const { url } = await billingJson<{ url: string }>("/api/billing/portal", {
    method: "POST",
    body: "{}",
  });
  window.location.assign(url);
}

export interface ConfirmCheckoutResponse {
  result:
    | { kind: "pack"; fulfilled: boolean }
    | { kind: "subscription"; synced: boolean }
    | { kind: "ignored"; reason: string };
  mode: string;
  paymentStatus: string;
  productKey: string | null;
}

/** Landing-page fulfillment after Checkout; the webhook remains authoritative. */
export function confirmCheckout(sessionId: string): Promise<ConfirmCheckoutResponse> {
  return billingJson<ConfirmCheckoutResponse>("/api/billing/confirm", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export function getAccountSummary(): Promise<AccountSummaryResponse> {
  return billingJson<AccountSummaryResponse>("/api/billing/account", { method: "GET" });
}

export function deleteAccount(): Promise<{ deleted: boolean }> {
  return billingJson<{ deleted: boolean }>("/api/account/delete", {
    method: "POST",
    body: JSON.stringify({ confirm: "DELETE" }),
  });
}

/** Wipes per-device Depikt data after sign-out / account deletion. */
export async function clearLocalUserData(): Promise<void> {
  try {
    const { db } = await import("@/lib/db");
    await db.delete();
  } catch {
    /* ignore */
  }
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("depikt:") || key.startsWith("pixelary")) localStorage.removeItem(key);
    }
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
}
