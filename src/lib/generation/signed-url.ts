import { raceWithTimeout } from "./timeout.ts";

export const SIGNED_URL_TIMEOUT_MS = 2_500;

type SignedUrlResult = { data?: { signedUrl?: string | null } | null } | null;

/**
 * Storage signing is on the poll path. A hung createSignedUrl must not keep
 * the client in "Creating your image…" after the job has already succeeded.
 */
export async function createSignedUrlWithTimeout(
  sign: () => Promise<SignedUrlResult>,
  timeoutMs: number = SIGNED_URL_TIMEOUT_MS,
): Promise<string | null> {
  const result = await raceWithTimeout(sign(), timeoutMs, null);
  return result?.data?.signedUrl ?? null;
}
