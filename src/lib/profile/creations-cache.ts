import type { CreationsPage } from "./client";
import { createPrivateCache, type PrivateScope } from "../private-cache.ts";

type Filter = "all" | "generated" | "edited";
const cache = createPrivateCache<CreationsPage>();

export function readCreationsCache(scope: PrivateScope, filter: Filter): CreationsPage | null {
  return cache.read(scope, filter);
}
export function writeCreationsCache(
  scope: PrivateScope,
  filter: Filter,
  page: CreationsPage,
): void {
  cache.write(scope, filter, page);
}
export function removeCreationFromCache(scope: PrivateScope, id: string): void {
  cache.update(scope, (page) => ({ ...page, items: page.items.filter((item) => item.id !== id) }));
}
