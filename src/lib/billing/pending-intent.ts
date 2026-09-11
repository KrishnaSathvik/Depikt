// Pending Checkout intent across the OAuth round trip, mirroring
// src/lib/generation/pending-generation.ts: a user who picks a plan or a
// credit pack while signed out should not have to pick it again after
// signing in. sessionStorage, tab-scoped, one-shot.

import { isProductKey, type ProductKey } from "./plans";

const KEY = "depikt:pending-checkout";

export function savePendingCheckout(productKey: ProductKey): void {
  try {
    sessionStorage.setItem(KEY, productKey);
  } catch {
    /* ignore */
  }
}

export function readPendingCheckout(): ProductKey | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return isProductKey(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function clearPendingCheckout(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
