/** Content-free structured Worker logs. Never pass prompts, images, URLs, or raw errors. */
export interface GenerationMetric {
  jobId?: string;
  sessionId?: string;
  operation?: "generate" | "edit" | "regenerate";
  series?: boolean;
  outcome?: string;
  durationMs?: number;
  imageMs?: number;
  validationMs?: number;
  planningMs?: number;
  groundingMs?: number;
  providerAttempts?: number;
  needed?: boolean;
  executed?: boolean;
  webQueries?: number;
  visualQueries?: number;
  sourceCount?: number;
  cacheHit?: boolean;
  authority?: string;
  temporalLimitation?: boolean;
  ocrCalls?: number;
  charged?: number;
  refunded?: number;
  platformFunded?: boolean;
  originalRetained?: boolean;
}
const keys: (keyof GenerationMetric)[] = [
  "jobId",
  "sessionId",
  "operation",
  "series",
  "outcome",
  "durationMs",
  "imageMs",
  "validationMs",
  "planningMs",
  "groundingMs",
  "providerAttempts",
  "needed",
  "executed",
  "webQueries",
  "visualQueries",
  "sourceCount",
  "cacheHit",
  "authority",
  "temporalLimitation",
  "ocrCalls",
  "charged",
  "refunded",
  "platformFunded",
  "originalRetained",
];
export function generationMetric(
  event:
    | "generation_requested"
    | "generation_completed"
    | "grounding_completed"
    | "validation_completed"
    | "repair_completed"
    | "credits_settled",
  values: GenerationMetric,
  write: (value: string) => void = console.info,
): void {
  const safe = Object.fromEntries(
    keys.filter((key) => values[key] !== undefined).map((key) => [key, values[key]]),
  );
  try {
    write(JSON.stringify({ event, ...safe }));
  } catch {
    /* Logging cannot fail a paid request. */
  }
}
