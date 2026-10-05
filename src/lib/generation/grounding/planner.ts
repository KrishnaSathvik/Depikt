import { authoritySubject, wantsAuthority } from "./authority.ts";
import { groundingNeeded } from "./need.ts";
import type { Intent } from "../../prompt-engine/intent.ts";
import type { GroundingPlan } from "./contract.ts";

export function planGrounding(
  intent: Intent,
  prompt: string,
  searchNeeded = false,
  ownedEntityCount = 0,
): GroundingPlan {
  void searchNeeded;
  const needed = groundingNeeded(prompt, {
    ownedEntityCount,
    category: intent.category,
  });
  if (!needed)
    return { needed: false, mode: "none", queries: [], factualNeeds: [], visualNeeds: [] };
  const text = prompt.replace(/\s+/g, " ").trim().slice(0, 360);
  const visualOnly = /\b(visual references only|images only)\b/i.test(prompt);
  const webOnly = /\b(facts only|no visual references)\b/i.test(prompt);
  return {
    needed: true,
    mode: visualOnly ? "visual" : webOnly ? "web" : "web_and_visual",
    queries: wantsAuthority(prompt)
      ? [
          `${authoritySubject(prompt)} official references`,
          `${authoritySubject(prompt)} current appearance photographs`,
        ]
      : [text, `${text} official documentation reference photographs`.slice(0, 500)],
    factualNeeds: visualOnly
      ? []
      : [
          ...intent.factual_requirements.missing_facts,
          "Verified capabilities and constraints relevant to the request",
        ].slice(0, 6),
    visualNeeds: webOnly
      ? []
      : ["Actual appearance, proportions, and layout from relevant reference images"],
  };
}

/**
 * Research is an enhancement, never a gate. When the provider fails the
 * generation still runs from the prompt alone, so the plan must stop claiming
 * references were gathered -- otherwise the result, the stored session and the
 * logs all describe references that were never fetched.
 */
export function withoutGrounding<T extends { searchNeeded: boolean }>(plan: T): T {
  return { ...plan, searchNeeded: false };
}
