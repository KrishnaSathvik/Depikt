/** Browser-private caches must never outlive an authentication owner transition. */
export interface PrivateScope {
  userId: string;
  epoch: number;
}
let owner: string | null = null;
let epoch = 0;
const clearers = new Set<() => void>();
export function setPrivateCacheOwner(userId: string | null): void {
  if (owner === userId) return;
  owner = userId;
  epoch += 1;
  for (const clear of clearers) clear();
}
export function privateScope(userId: string): PrivateScope {
  return { userId, epoch };
}
export function isCurrentPrivateScope(scope: PrivateScope): boolean {
  return scope.userId === owner && scope.epoch === epoch;
}
export function createPrivateCache<T>() {
  const values = new Map<string, T>();
  clearers.add(() => values.clear());
  const key = (scope: PrivateScope, id: string) => `${scope.userId}:${id}`;
  return {
    read(scope: PrivateScope, id: string): T | null {
      return isCurrentPrivateScope(scope) ? (values.get(key(scope, id)) ?? null) : null;
    },
    write(scope: PrivateScope, id: string, value: T): void {
      if (isCurrentPrivateScope(scope)) values.set(key(scope, id), value);
    },
    update(scope: PrivateScope, update: (value: T) => T): void {
      if (!isCurrentPrivateScope(scope)) return;
      for (const [id, value] of values) {
        if (id.startsWith(`${scope.userId}:`)) values.set(id, update(value));
      }
    },
  };
}
