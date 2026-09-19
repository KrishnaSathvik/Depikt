export type LocalEditIntent = "attribute_change" | "replacement" | "removal" | "addition" | "other";

/** Conservative local intent classification; ambiguity retains the normal edit path. */
export function classifyLocalEdit(prompt: string): LocalEditIntent {
  // Preservation instructions are not requested operations (e.g. "preserve color").
  const request = prompt.split(/\b(?:preserve|keep unchanged|leave unchanged)\b/i)[0];
  const attribute =
    /\b(colou?r|recolou?r|material|texture|finish|opacity|saturation|brightness|matte|glossy|metallic|ivory|red|blue|green|yellow|white|black|silver|gold|purple|lavender|pink|orange|brown|gray|grey|turquoise|wooden|ceramic|transparent)\b/i;
  // Explicit object operations take precedence over attribute words in their descriptions.
  if (
    /\b(?:remove|erase|delete)\b/i.test(request) &&
    !/\b(?:colou?r|texture|finish)\b/i.test(request)
  )
    return "removal";
  if (/\b(?:add|insert|place)\b/i.test(request) && !/\b(?:colou?r|texture|finish)\b/i.test(request))
    return "addition";
  if (
    /\b(?:replace|swap|substitute)\b/i.test(request) &&
    !/\b(?:colou?r|material|texture|finish)\b/i.test(request)
  )
    return "replacement";
  if (
    /\b(resize|reshape|rotate|taller|shorter|wider|narrower|larger|smaller|pose|perspective|silhouette)\b/i.test(
      request,
    )
  )
    return "other";
  if (
    attribute.test(request) &&
    /\b(?:change|make|turn|recolou?r|paint|tint|adjust|replace|swap|add|remove)\b/i.test(request)
  )
    return "attribute_change";
  return "other";
}

export const ATTRIBUTE_GEOMETRY_REQUIREMENT =
  "Preserve shape, silhouette, dimensions, perspective, pose and internal geometry of the selected object. Change only the requested attribute; do not redesign its parts or move its boundaries.";
export function localEditInstruction(intent: LocalEditIntent): string {
  switch (intent) {
    case "attribute_change":
      return ATTRIBUTE_GEOMETRY_REQUIREMENT;
    case "replacement":
      return "Replace the selected target as requested. Its geometry may change; preserve unrelated content.";
    case "removal":
      return "Remove the selected target so it disappears. Reconstruct the local background and preserve unrelated content.";
    case "addition":
      return "Add the requested content within the selected region. Local geometry may expand as requested; preserve unrelated content.";
    default:
      return "Change only the requested features; preserve all other selected-object features.";
  }
}
