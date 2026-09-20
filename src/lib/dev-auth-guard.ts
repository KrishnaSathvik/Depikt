type DevAuthEnv = {
  DEV?: boolean;
  PROD?: boolean;
  MODE?: string;
  VITE_DEV_AUTH_ENABLED?: string;
};

/** True only for an opted-in local Vite dev server. Preview and prod are always false. */
export function isDevAuthEnabled(env: DevAuthEnv = import.meta.env): boolean {
  return (
    env.DEV === true &&
    env.PROD !== true &&
    env.MODE === "development" &&
    env.VITE_DEV_AUTH_ENABLED === "true"
  );
}

/** Hosted preview/prod hostnames never get the overlay, even if a misbuilt bundle leaked. */
export function isLocalDevHost(hostname?: string): boolean {
  const host = hostname ?? (typeof window === "undefined" ? "" : window.location.hostname);
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}
