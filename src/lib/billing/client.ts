// Browser-side billing calls. Every request carries the user's own Supabase
// bearer token (same as generation); the server resolves all money values.

import { generationFetch, GenerationApiError } from "@/lib/generation/client";
import { trackEvent } from "@/lib/analytics";

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

/** Opens the Stripe Customer Portal in the current tab. */
export async function openBillingPortal(): Promise<void> {
  trackEvent("billing_portal_opened", {});
  const { url } = await billingJson<{ url: string }>("/api/billing/portal", {
    method: "POST",
    body: "{}",
  });
  window.location.assign(url);
}
