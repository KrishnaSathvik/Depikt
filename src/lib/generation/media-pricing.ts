import type { MediaOptions } from "./media.ts";
import { creditCostFor } from "./models.ts";

export interface MediaQuote {
  creditsPerJob: number | null;
  executable: boolean;
  reason?: string;
  policy: string;
}
/** No client-selected amount and no guessed GIF credit charge. Benchmark approval is a future policy change. */
export function quoteMediaOperation(
  operation: "generate" | "edit",
  media?: MediaOptions,
): MediaQuote {
  if (media?.outputFormat === "gif")
    return {
      creditsPerJob: null,
      executable: false,
      reason:
        "Animated GIF generation is awaiting its cost benchmark. No credits will be reserved.",
      policy: "gif-benchmark-pending",
    };
  return {
    creditsPerJob: creditCostFor(operation),
    executable: true,
    policy: operation === "edit" ? "existing-image-edit" : "existing-image-generation",
  };
}
export function assertMediaExecutionPriced(
  operation: "generate" | "edit",
  media?: MediaOptions,
): number {
  const quote = quoteMediaOperation(operation, media);
  if (!quote.executable || quote.creditsPerJob === null) throw new Error(quote.reason);
  return quote.creditsPerJob;
}
