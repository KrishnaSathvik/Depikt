/**
 * Deterministic grounding-need helpers. Keyword presence is never enough;
 * each helper requires command, temporal, place, product, or historical
 * context that external evidence would actually improve.
 */

const RESEARCH_NOUN =
  /^(lab(?:oratory)?|scientist|scientists|notes?|papers?|desk|facilit(?:y|ies)|assistants?|department|cent(?:er|re)|institute|team|group|hospital|university|setting)$/i;

const IMAGE_CHECK =
  /\bcheck\s+the\s+(?:lighting|composition|crop|framing|exposure|focus|white\s*balance|colou?rs?|shadows?|highlights?|anatomy|hands?|face|eyes|pose|contrast|background)\b/i;

const COMPOSITION_FIDELITY =
  /\b(?:accurate(?:ly)?|exact(?:ly)?|faithful)\s+(?:lighting|composition|center(?:ed)?|centred|crop|framing)\b|\baccurate and centered\b|\bexactly centered\b|\bfaithful to my uploaded\b/i;

const STYLE_PLACE = /\b[\w'-]+[- ](?:inspired|style)\b/i;

const PLACE_NOUN =
  /\b(?:skyline|skylines|crossing|square|plaza|bridge|harbour|harbor|landmarks?|viewpoint|vantage|opera house|cathedral|tower|stadium|waterfront|esplanade|launch pad)\b/i;

const PUBLIC_SUBJECT =
  /\b(?:iphone|smartphone|camera|uniform|livery|lander|hardware|packaging|console|vehicles?|cars?|aircraft|spacecraft|parts|stock[\s-]game|device|configuration|product|f1|formula\s*1|nasa|artemis)\b/i;

const FIDELITY =
  /\b(?:accurate(?:ly)?|authentic|faithful|exact(?:ly)?|correct|official|factory|photorealistic|stock[\s-]game|real[\s-]world|production version)\b/i;

const EXACT_TEXT =
  /\bexact(?:ly)?\s+(?:spelling|text|title|wording|letters?|typography|caption|headline|names?)\b/i;

const TEMPORAL =
  /\b(?:current(?:ly)?|today|tonight|latest|present[\s-]day|modern[\s-]day|as of(?:\s+\d{4})?|this year(?:'?s)?|(?:20\d{2})\s+(?:version|livery|uniform|configuration|model|f1))\b/i;

export function hasSearchDecline(prompt: string): boolean {
  return (
    /\b(?:no|without|skip|avoid)\s+(?:external\s+)?(?:research|search|grounding|references?)\b/i.test(
      prompt,
    ) ||
    /\bdo not (?:research|search)\b/i.test(prompt) ||
    /\bdon'?t\s+(?:search(?:\s+the\s+web)?|research|use\s+external)\b/i.test(prompt) ||
    /\buse only my uploaded\b/i.test(prompt) ||
    /\bno external (?:research|references?|search)\b/i.test(prompt)
  );
}

export function hasOwnedOrFictionalAuthority(prompt: string, ownedEntityCount: number): boolean {
  return ownedEntityCount > 0 || /\b(?:fictional|invented|imaginary|made[\s-]up)\b/i.test(prompt);
}

export function hasExplicitResearchCommand(prompt: string): boolean {
  if (/\blook\s*up\b/i.test(prompt)) return true;
  if (/\bsearch\s+for\b/i.test(prompt)) return true;
  if (/\bverify\b/i.test(prompt)) return true;
  if (/\bfact[\s.-]?check\b/i.test(prompt)) return true;
  if (
    /\bfind\s+(?:reference|official|current)\s+(?:images?|photos?|photographs?|sources?|references?)\b/i.test(
      prompt,
    )
  )
    return true;
  if (/\b(?:use|using)\s+(?:current\s+)?official\s+sources\b/i.test(prompt)) return true;
  if (
    /\b(?:external|web|official)\s+(?:factual\s+|visual\s+)?(?:grounding|references?|research)\b/i.test(
      prompt,
    )
  )
    return true;
  if (/\bcheckerboard\b/i.test(prompt)) {
    /* fall through to research-verb checks */
  } else if (/\bcheck\b/i.test(prompt)) {
    if (IMAGE_CHECK.test(prompt)) return false;
    if (/\bcheck\s+(?:whether|if)\b/i.test(prompt)) return true;
    if (/\bcheck\s+(?:the\s+)?(?:current|latest|official|real|dlcs?|research)\b/i.test(prompt))
      return true;
  }
  for (const match of prompt.matchAll(/\bresearch\b/gi)) {
    const after = prompt.slice(match.index! + match[0].length);
    const next = after.match(/^\s+([A-Za-z0-9'-]+)/)?.[1] ?? "";
    if (next && RESEARCH_NOUN.test(next)) continue;
    const before = prompt.slice(0, match.index);
    const atCommand =
      before.trim() === "" || /(?:^|[.!?;]\s*|\b(?:please|then|and)\s+)$/i.test(before);
    if (atCommand || /^\s+(?:what|how|whether|if|the|this|current|official)\b/i.test(after)) {
      return true;
    }
  }
  return false;
}

export function hasTemporalFidelityRequest(prompt: string): boolean {
  if (isAestheticTemporal(prompt) || STYLE_PLACE.test(prompt)) return false;
  if (!hasTemporalCue(prompt)) return false;
  return (
    hasPublicOrPlaceSubject(prompt) ||
    hasAppearanceState(prompt) ||
    /\breal[\s-]world\b|\breal location\b/i.test(prompt) ||
    hasNamedEntity(prompt)
  );
}

export function hasRealPlaceFidelityRequest(prompt: string): boolean {
  if (STYLE_PLACE.test(prompt) || COMPOSITION_FIDELITY.test(prompt)) return false;
  const place =
    PLACE_NOUN.test(prompt) ||
    /\breal (?:landmarks?|building|location|place|station)\b/i.test(prompt) ||
    /\bnamed public viewpoint\b/i.test(prompt) ||
    /\bfrom\b[^.]{0,80}\bpoint\b/i.test(prompt) ||
    /\bopera house\b/i.test(prompt);
  const fidelity =
    hasFidelityCue(prompt) || hasTemporalCue(prompt) || /\bas (?:it|they) appear/i.test(prompt);
  return place && fidelity;
}

export function hasPublicSubjectFidelityRequest(prompt: string): boolean {
  if (COMPOSITION_FIDELITY.test(prompt) || STYLE_PLACE.test(prompt)) return false;
  if (/\bfaithful to my uploaded\b/i.test(prompt)) return false;
  return (
    hasFidelityCue(prompt) && (PUBLIC_SUBJECT.test(prompt) || /\bstock[\s-]game\b/i.test(prompt))
  );
}

export function hasHistoricalReconstructionRequest(prompt: string): boolean {
  if (/\b\d{4}s[- ](?:inspired|style)\b/i.test(prompt)) return false;
  if (/\bvintage\s+\d{4}s\b/i.test(prompt)) return false;
  if (/\b(?:medieval|fantasy)\b/i.test(prompt)) return false;
  return (
    /\bas (?:it|they) appeared in\s+\d{4}\b/i.test(prompt) ||
    /\bhistorical reconstruction\b/i.test(prompt) ||
    /\bhistoric(?:al)?\s+(?:building|station|place|landmark|site).{0,80}appeared\b/i.test(prompt) ||
    /\bin\s+\d{4}\s+accurat/i.test(prompt) ||
    /\bconfiguration in\s+\d{4}\b/i.test(prompt)
  );
}

export function hasFactualMechanicsRequest(prompt: string): boolean {
  return /\b(?:compatible|compatibility|dlcs?|what can actually|available assets|mechanics)\b/i.test(
    prompt,
  );
}

function hasFidelityCue(prompt: string): boolean {
  if (EXACT_TEXT.test(prompt)) {
    return /\b(?:accurate(?:ly)?|authentic|faithful|correct|official|factory|photorealistic|stock[\s-]game|real[\s-]world|production version|exact (?:appearance|packaging|product))\b/i.test(
      prompt,
    );
  }
  return FIDELITY.test(prompt);
}

function hasExactProductRequest(prompt: string, category?: string): boolean {
  if (category !== "product" || COMPOSITION_FIDELITY.test(prompt)) return false;
  if (EXACT_TEXT.test(prompt)) {
    return /\b(?:exact (?:appearance|packaging|product)|real|accurate|authentic)\b/i.test(prompt);
  }
  return /\b(?:exact|real|accurate|authentic)\b/i.test(prompt);
}

export function groundingNeeded(
  prompt: string,
  opts: { ownedEntityCount?: number; category?: string } = {},
): boolean {
  if (hasSearchDecline(prompt)) return false;
  if (hasExplicitResearchCommand(prompt)) return true;
  const inferred =
    hasTemporalFidelityRequest(prompt) ||
    hasRealPlaceFidelityRequest(prompt) ||
    hasPublicSubjectFidelityRequest(prompt) ||
    hasHistoricalReconstructionRequest(prompt) ||
    hasFactualMechanicsRequest(prompt) ||
    hasExactProductRequest(prompt, opts.category);
  if (!inferred) return false;
  // Invented worlds stay off unless the user explicitly asked to research.
  if (hasOwnedOrFictionalAuthority(prompt, 0)) return false;
  // Packs are authority for the owned entities, not for unrelated real-world context.
  if ((opts.ownedEntityCount ?? 0) > 0) return hasExternalContextDespiteOwnedPacks(prompt);
  return true;
}

function hasExternalContextDespiteOwnedPacks(prompt: string): boolean {
  return (
    hasRealPlaceFidelityRequest(prompt) ||
    hasHistoricalReconstructionRequest(prompt) ||
    hasFactualMechanicsRequest(prompt) ||
    hasExternalPublicCurrentRequest(prompt) ||
    hasExternalPlaceTemporalRequest(prompt)
  );
}

function hasExternalPlaceTemporalRequest(prompt: string): boolean {
  if (STYLE_PLACE.test(prompt) || isAestheticTemporal(prompt)) return false;
  if (!hasTemporalCue(prompt)) return false;
  return (
    PLACE_NOUN.test(prompt) ||
    /\bopera house\b/i.test(prompt) ||
    /\breal (?:landmarks?|building|location|place|station)\b/i.test(prompt) ||
    /\bnamed public viewpoint\b/i.test(prompt) ||
    hasNamedEntity(prompt)
  );
}

function hasExternalPublicCurrentRequest(prompt: string): boolean {
  if (!hasTemporalCue(prompt) && !/\bofficial\s+sources\b/i.test(prompt)) return false;
  return (
    /\b(?:packaging|uniform|runway|fashion week|official sources|external)\b/i.test(prompt) ||
    hasPublicSubjectFidelityRequest(prompt)
  );
}

function hasTemporalCue(prompt: string): boolean {
  return (
    TEMPORAL.test(prompt) ||
    /\bas (?:it|they) appear(?:s)?(?:\s+(?:now|today))\b/i.test(prompt) ||
    /\bas it looks today\b/i.test(prompt)
  );
}

function isAestheticTemporal(prompt: string): boolean {
  return /\b(?:current(?:ly)?)\s+(?:mood|vibe|feeling|atmosphere|tone|style|aesthetic|lighting)\b/i.test(
    prompt,
  );
}

function hasAppearanceState(prompt: string): boolean {
  return /\b(?:currently\s+)?looks like\b|\bas it looks today\b|\bas (?:it|they) appear(?:s)?\b/i.test(
    prompt,
  );
}

function hasPublicOrPlaceSubject(prompt: string): boolean {
  return (
    PUBLIC_SUBJECT.test(prompt) ||
    PLACE_NOUN.test(prompt) ||
    /\breal (?:landmarks?|building|location|place|station)\b/i.test(prompt) ||
    /\bfashion week\b|\brunway\b/i.test(prompt)
  );
}

function hasNamedEntity(prompt: string): boolean {
  return /[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})+/.test(prompt);
}
