// Native image generation — Prompt → Generate handoff.
//
// sessionStorage, not the URL: a full optimized prompt plus reference data
// URLs would make an ugly, potentially oversized query string, and this
// only needs to survive one navigation (or an auth round trip), not be
// shareable or bookmarkable. Mirrors the existing template-context.ts
// pattern (sessionStorage-keyed values, read once on the receiving page).

import type { SourceContextType } from "./job-request";
import type { RoutingHints } from "./model-router";

export interface GenerationHandoff {
  prompt: string;
  references: { dataUrl: string }[];
  structuredAspectRatio?: string | null;
  /** From Prompt's structured intent, fed to the Image Model Router — never a user model choice, there isn't one. */
  routingHints?: RoutingHints | null;
  sourceType: SourceContextType;
  sourceId?: string | null;
  /**
   * "Open in Generate" from an existing creation (Account → Creations): the
   * version being continued. No re-upload — the edit endpoint fetches this
   * version's own stored bytes server-side by id (see jobs.ts's
   * `req.operation === "edit" && req.sourceVersionId` fetch). previewUrl is
   * a short-lived signed URL used only to render the canvas immediately.
   */
  sourceVersion?: {
    id: string;
    previewUrl: string | null;
    width: number;
    height: number;
    prompt: string;
    model: "flare" | "sunburst";
    createdAt: string;
  } | null;
}

const KEY = "depikt:generation-handoff";

export function saveGenerationHandoff(handoff: GenerationHandoff): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(handoff));
  } catch {
    // Storage can be unavailable (private mode, quota); the receiving page
    // just falls back to its own empty state.
  }
}

export function consumeGenerationHandoff(): GenerationHandoff | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY); // one-shot: a reload after this shouldn't replay it
    return JSON.parse(raw) as GenerationHandoff;
  } catch {
    return null;
  }
}
