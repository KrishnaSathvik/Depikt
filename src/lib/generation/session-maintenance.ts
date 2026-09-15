/** Shared across every mounted useGeneration hook so Build/Critique cannot stack session GETs behind Generate. */
export const MAINTENANCE_INTERVAL_MS = 15_000;

export const maintenanceInFlight = new Set<string>();
export const maintenanceNextAllowedAt = new Map<string, number>();

export function resetSessionMaintenanceForTests(): void {
  maintenanceInFlight.clear();
  maintenanceNextAllowedAt.clear();
}

function shouldKickSessionMaintenance(sessionId: string, now: number): boolean {
  if (maintenanceInFlight.has(sessionId)) return false;
  if ((maintenanceNextAllowedAt.get(sessionId) ?? 0) > now) return false;
  return true;
}

/**
 * Poke GET /api/generation/sessions/:id in the background. Credit settlement
 * and stale-fail stay server-authoritative; the browser never awaits this
 * on the spinner path.
 */
export function kickSessionMaintenance(
  sessionId: string,
  maintain: (id: string) => Promise<unknown>,
  now: number = Date.now(),
): void {
  if (!shouldKickSessionMaintenance(sessionId, now)) return;

  maintenanceInFlight.add(sessionId);
  maintenanceNextAllowedAt.set(sessionId, now + MAINTENANCE_INTERVAL_MS);

  void maintain(sessionId)
    .catch(() => {
      // UI polling must never fail because maintenance failed.
    })
    .finally(() => {
      maintenanceInFlight.delete(sessionId);
    });
}
