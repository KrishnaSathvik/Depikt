// Deterministic aspect-ratio parsing for the Images 2.5 engine.
//
// Only genuinely deterministic signals are handled here:
//   - a literal ratio the user typed ("16:9", "4:5", "2.39:1")
//   - an explicit, unambiguous platform format ("YouTube thumbnail", "Instagram Story")
// Broad words like "portrait", "story", "vertical", "square", "banner" are NOT
// interpreted here. The v2.9 engine did that and produced false positives
// ("portrait of a woman" → 4:5, "a story about" → 9:16, "Times Square" → 1:1).
// Context-dependent wording is left to the intent analyzer.

export interface ExplicitRatio {
  value: string;
  source: "explicit" | "platform";
  matched: string;
}

const PLATFORM_FORMATS: Array<[RegExp, string]> = [
  [/\byoutube\s+thumbnails?\b/i, "16:9"],
  [/\binstagram\s+stor(?:y|ies)\b/i, "9:16"],
  [/\binstagram\s+reels?\b/i, "9:16"],
  [/\bfacebook\s+stor(?:y|ies)\b/i, "9:16"],
  [/\btiktok\s+(?:video|post|cover)s?\b/i, "9:16"],
  [/\bpinterest\s+pins?\b/i, "2:3"],
  [/\bsquare\s+format\b/i, "1:1"],
  [/\b(?:1:1|square)\s+aspect\b/i, "1:1"],
];

// "16:9", "4:5", "2.39:1", "21 : 9". Rejects clock times ("10:30", "3:45 pm")
// by requiring that the right-hand side is not a zero-padded two-digit minute
// and that no am/pm follows.
const NUMERIC_RATIO =
  /\b(\d{1,2}(?:\.\d{1,2})?)\s*:\s*(\d{1,2}(?:\.\d{1,2})?)\b(?!\s*(?:am|pm)\b)/gi;

export function parseExplicitRatio(text: string): ExplicitRatio | null {
  for (const m of text.matchAll(NUMERIC_RATIO)) {
    const left = m[1];
    const right = m[2];
    if (/^0\d$/.test(right)) continue; // "10:05" is a time
    const l = Number(left);
    const r = Number(right);
    if (!(l > 0 && r > 0) || l > 32 || r > 32) continue;
    return { value: `${left}:${right}`, source: "explicit", matched: m[0] };
  }
  for (const [re, value] of PLATFORM_FORMATS) {
    const m = text.match(re);
    if (m) return { value, source: "platform", matched: m[0] };
  }
  return null;
}

/** Normalize model-produced ratio strings ("16 x 9", "16/9", "16:9 landscape") to "16:9". */
export function normalizeRatio(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = value.match(/(\d{1,2}(?:\.\d{1,2})?)\s*[:x/×]\s*(\d{1,2}(?:\.\d{1,2})?)/i);
  if (!m) return null;
  return `${m[1]}:${m[2]}`;
}
