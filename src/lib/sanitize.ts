// Output sanitizers applied to every generated prompt string.
// Extracted verbatim from the API route so they can be unit-tested and reused
// by the benchmark harness. Behavior is intentionally unchanged (v2.9).

/**
 * Strip Midjourney/Stable Diffusion CLI flags. Depikt targets OpenAI image
 * models, which don't use --ar/--style/--v/etc. Belt-and-suspenders sanitize.
 */
export function stripCliFlags(s: string): string {
  return s
    .replace(/\s*--ar\s+\S+/gi, "")
    .replace(/\s*--style\s+\S+/gi, "")
    .replace(/\s*--v\s+\d+(?:\.\d+)?/gi, "")
    .replace(/\s*--niji\s+\d+/gi, "")
    .replace(/\s*--stylize\s+\d+/gi, "")
    .replace(/\s*--s\s+\d+/gi, "")
    .replace(/\s*--quality\s+\S+/gi, "")
    .replace(/\s*--q\s+\S+/gi, "")
    .replace(/\s*--chaos\s+\d+/gi, "")
    .replace(/\s*--c\s+\d+/gi, "")
    .replace(/\s*--seed\s+\d+/gi, "")
    .replace(/\s*--weird\s+\d+/gi, "")
    .replace(/\s*--tile\b/gi, "")
    .replace(/\s*--no\s+\S+/gi, "")
    .trim();
}

/**
 * Lens unit guard: some models occasionally emit "40px lens" instead of
 * "40mm lens" because px/mm tokens collide in training. Conservative regex:
 * only fixes \d{2,3}px directly followed by lens vocabulary.
 */
export function fixLensUnits(s: string): string {
  return s
    .replace(/\b(\d{2,3})px(\s+(?:lens|prime|macro|telephoto|wide|f\/|aperture))/gi, "$1mm$2")
    .replace(/\b(\d{2,3})mm\s+pixel\b/gi, "$1mm");
}

export function sanitizePrompt(s: string): string {
  return fixLensUnits(stripCliFlags(s));
}

/**
 * Apply sanitizers to every prompt-bearing field of a result object, in place.
 * Mirrors the v2.9 route behavior: prompt, prompts[], rewritten_prompt.
 */
export function sanitizeResultFields<T extends Record<string, unknown>>(result: T): T {
  const r = result as Record<string, unknown>;
  if (typeof r.prompt === "string") r.prompt = sanitizePrompt(r.prompt);
  if (Array.isArray(r.prompts)) {
    r.prompts = r.prompts.map((p) => (typeof p === "string" ? sanitizePrompt(p) : p));
  }
  if (typeof r.rewritten_prompt === "string")
    r.rewritten_prompt = sanitizePrompt(r.rewritten_prompt);
  return result;
}
