import type { Intent } from "../../prompt-engine/intent.ts";
import type { GroundingPlan } from "./contract.ts";

export function planGrounding(intent: Intent, prompt: string, searchNeeded = false): GroundingPlan {
  const explicit = /\b(research|look up|search|verify|fact.check|reference photographs?)\b/i.test(
    prompt,
  );
  const current = /\b(current|today|tonight|latest|real.world|real location)\b/i.test(prompt);
  const exactProduct =
    intent.category === "product" && /\b(exact|real|accurate|authentic)\b/i.test(prompt);
  const factual =
    /\b(compatible|compatibility|DLCs?|what can actually|available assets|mechanics)\b/i.test(
      prompt,
    );
  const needed = explicit || current || exactProduct || factual || searchNeeded;
  if (!needed)
    return { needed: false, mode: "none", queries: [], factualNeeds: [], visualNeeds: [] };
  const text = prompt.replace(/\s+/g, " ").trim().slice(0, 360);
  const visualOnly = /\b(visual references only|images only)\b/i.test(prompt);
  const webOnly = /\b(facts only|no visual references)\b/i.test(prompt);
  return {
    needed: true,
    mode: visualOnly ? "visual" : webOnly ? "web" : "web_and_visual",
    queries: [text, `${text} official documentation reference photographs`.slice(0, 500)],
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
