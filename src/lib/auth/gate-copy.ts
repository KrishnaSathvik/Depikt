// Contextual copy for the auth gate (AuthGateDialog / BillingAuthDialog).
//
// Auth is not the product; it is a one-time identity check in the middle of
// something the user already chose to do. The headline continues that
// intent ("Make this image") rather than announcing a requirement
// ("Sign in required"), and the same OAuth buttons handle both sign-in and
// sign-up, so the dialog never asks which one the user wants.

import type { SourceContextType } from "@/lib/generation/job-request";
import type { PaidPlanKey } from "@/lib/billing/plans";

/**
 * Headline for the generation auth gate, by where the submit came from.
 * Regenerate and Apply-edit can only be reached once a job has already
 * succeeded, which requires being signed in already — so only the
 * first-submit contexts are reachable signed-out.
 */
export function generationGateHeadline(sourceType: SourceContextType): string {
  switch (sourceType) {
    case "prompt_build":
      return "Generate this image";
    case "prompt_critique":
      return "Generate the improved version";
    default:
      return "Make this image";
  }
}

export function planGateHeadline(plan: PaidPlanKey): string {
  return plan === "max" ? "Get Depikt Max" : "Get Depikt Pro";
}

export const PACK_GATE_HEADLINE = "Get more image credits";

/** A short, muted excerpt — never the full prompt. */
export function promptExcerpt(prompt: string, maxLength = 80): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}
