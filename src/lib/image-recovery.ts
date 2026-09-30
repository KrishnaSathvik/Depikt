/** At most one refresh request for an image source, including concurrent error events. */
export function createImageRecovery() {
  let attempted = false;
  return async (refresh?: () => Promise<string | null | undefined>): Promise<string | null> => {
    if (attempted || !refresh) return null;
    attempted = true;
    try {
      return (await refresh()) || null;
    } catch {
      return null;
    }
  };
}
