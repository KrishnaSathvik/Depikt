// Deterministic, non-cryptographic string hash (djb2 variant). Used only to
// spread an immutable user id across small index spaces (avatar symbol/
// background/composition, username adjective/noun/suffix) so the same
// account always derives the same default avatar and a low-collision
// username candidate — never for anything security-sensitive.

export function hashString(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return h >>> 0; // unsigned 32-bit
}

export function hashToIndex(input: string, modulo: number): number {
  if (modulo <= 0) return 0;
  return hashString(input) % modulo;
}
