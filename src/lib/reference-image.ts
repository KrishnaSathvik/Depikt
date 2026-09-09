import { processReferenceImage, type ProcessedImage } from "./image-utils";
import { prefersLossless, type ReferenceIntent } from "./prompt-engine/reference";

export type ReferenceIntentChoice = ReferenceIntent | "auto";

export interface ReferenceImageState {
  /** Processed data URL sent to the API. */
  dataUrl: string;
  /** Original file kept so the image can be re-encoded when the intent changes. */
  file: Blob | null;
  intent: ReferenceIntentChoice;
  meta?: Pick<ProcessedImage, "mime" | "width" | "height" | "hasAlpha">;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Process an uploaded/pasted/dropped file into the state the pickers and pages share. */
export async function fileToReferenceState(
  file: Blob,
  intent: ReferenceIntentChoice = "auto",
): Promise<ReferenceImageState> {
  const processed = await processReferenceImage(file, { preferLossless: prefersLossless(intent) });
  return {
    dataUrl: processed.dataUrl,
    file,
    intent,
    meta: {
      mime: processed.mime,
      width: processed.width,
      height: processed.height,
      hasAlpha: processed.hasAlpha,
    },
  };
}
