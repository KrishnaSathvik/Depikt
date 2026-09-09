// =============================================================================
// DEPIKT — engine metadata shared by the UI and the API routes.
//
// The Images 2.5 engine lives in ./prompt-engine/ (builder.ts, critic.ts).
// The frozen v2.9 prompt lives in ./prompt-engine/legacy-v2.9.ts (benchmarks only).
// =============================================================================

export const CATEGORIES = [
  { value: "auto", label: "Auto-detect" },
  { value: "POSTER/COVER", label: "Poster / Cover" },
  { value: "INFOGRAPHIC/DIAGRAM", label: "Infographic / Diagram" },
  { value: "UI MOCKUP", label: "UI Mockup" },
  { value: "SOCIAL POST", label: "Social Post" },
  { value: "CINEMATIC SCENE", label: "Cinematic Scene" },
  { value: "STORYBOARD/MULTI-PANEL", label: "Storyboard / Multi-panel" },
  { value: "INTERIOR/ARCH/FOOD/FASHION", label: "Interior / Arch / Food / Fashion / Product" },
  { value: "VISUAL SUMMARY", label: "Visual Summary" },
  { value: "IMAGE EDIT", label: "Image Edit" },
  { value: "OPEN-ENDED CREATIVE", label: "Open-Ended Creative" },
] as const;

export const MODES = [
  { value: "default", label: "Default" },
  { value: "BATCH", label: "Batch (3 variants)" },
  { value: "JSON", label: "JSON output" },
  { value: "CRITIQUE", label: "Critique existing" },
] as const;

export type ModeValue = (typeof MODES)[number]["value"];

export { PROMPT_VERSION } from "./prompt-engine/builder";
export { LEGACY_PROMPT_VERSION } from "./prompt-engine/legacy-v2.9";
