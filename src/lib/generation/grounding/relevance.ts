import type { GroundingBundle, SearchResult } from "./contract.ts";

// Retrieval is not evidence by itself. Require subject overlap, excluding generic
// rendering/research instructions, and reject empty/encoded snippets before use.
const GENERIC = new Set(
  `a an the and or of to in on at for from with as by is are be it its this that then only no not do don't use create make image images photo photos photograph photographs photography photorealistic realistic editorial premium studio light lighting standalone separate exact preserve identity packaging product bottle reference references visual visuals appearance current today recent official research search look up factual facts supported actual authentic accurate text labels composition render scene style counter holding sitting natural clean context fictional character characters entity entities`.split(
    " ",
  ),
);
function terms(text: string): Set<string> {
  return new Set(
    (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
      (word) => word.length > 2 && !GENERIC.has(word),
    ),
  );
}
export function usableEvidence(text: string): boolean {
  const value = text.trim();
  return (
    value.length > 0 &&
    /\p{L}/u.test(value) &&
    !/(?:data:[^\s]+;base64,|[A-Za-z0-9+/=_-]{80,}|<\/?(?:script|html)\b)/i.test(value)
  );
}
export function relevantResult(result: SearchResult, prompt: string): boolean {
  if (!usableEvidence(result.excerpt)) return false;
  const subject = terms(prompt);
  if (!subject.size) return false; // uncertain retrieval never becomes a requirement
  const evidence = terms(`${result.title} ${result.excerpt}`);
  const overlap = [...subject].filter((word) => evidence.has(word));
  return overlap.length >= Math.min(2, subject.size);
}
