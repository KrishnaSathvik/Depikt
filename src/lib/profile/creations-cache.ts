// Module-level (in-memory, per browser tab) cache for the Creations grid --
// same purpose as src/lib/profile/cache.ts's profile hydration cache, but
// simpler: no cross-user concern here (the grid only ever renders for the
// signed-in user, and a sign-out/sign-in is a full page context change),
// so a plain Map keyed by filter is enough. CreationsGrid mounts fresh
// every time the AccountHub's home view opens (and on the full-page
// /account route each navigation), so without this every open would
// re-fetch and show "Loading…" even for images fetched moments earlier.
//
// Never a source of truth -- every mount still revalidates against the
// server in the background and overwrites the cache with the fresh page.

import type { CreationsPage } from "./client";

type Filter = "all" | "generated" | "edited";

const cache = new Map<Filter, CreationsPage>();

export function readCreationsCache(filter: Filter): CreationsPage | null {
  return cache.get(filter) ?? null;
}

export function writeCreationsCache(filter: Filter, page: CreationsPage): void {
  cache.set(filter, page);
}
