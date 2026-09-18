import type { Intent } from "../prompt-engine/intent.ts";

type ExactText = Intent["exact_text"][number];
const cue =
  /\b(?:exact\s+text|text|says?|reads?|title|headline|caption|label|write|written|words?|copy|slogan|render|display|print)\b\s*(?:(?:says?|reads?|is|must\s+say|must\s+read)\s*)?[:=–-]?\s*["“']?$/i;
const shared = /\b(?:shared|every|each|all|throughout)\b/i;
const ordinal =
  /\b(?:image|poster|slide|child|frame|ad|asset)\s*(\d+)\b|\b(first|second|third|fourth|fifth|sixth)\s+(?:image|poster|slide|child|frame|ad|asset)\b/i;

// Keep quoted copy intact while splitting source instructions into clauses.
function clauses(prompt: string): string[] {
  const separated = prompt.replace(
    /"[^"]*"|“[^”]*”|'[^']*'|(?:,?\s+(?:and\s+)?)(?=(?:image|poster|slide|child|frame|ad|asset)\s*\d+\b)/gi,
    (part) => (/^["“']/.test(part) ? part : "\n"),
  );
  return separated.match(/(?:"[^"]*"|“[^”]*”|'[^']*'|[^;\n.!?])+[.!?]?/g) ?? [];
}
function evidence(item: ExactText, prompt: string): string[] {
  if (!item.text.trim()) return [];
  return clauses(prompt).filter((clause) => {
    const at = clause.indexOf(item.text);
    if (at < 0) return false;
    // Quotes alone may name a scene. Require an actual instruction to render copy.
    const prefix = clause.slice(0, at);
    return cue.test(prefix) && !/\b(?:no|without|omit|avoid|do not|don't)\b/i.test(prefix);
  });
}
export function isExplicitRenderableText(item: ExactText, userPrompt: string): boolean {
  return evidence(item, userPrompt).length > 0;
}
export function sanitizeSeriesIntent(intent: Intent, userPrompt: string): Intent {
  return {
    ...intent,
    exact_text: intent.exact_text.filter((item) => isExplicitRenderableText(item, userPrompt)),
  };
}
export function childExactText(
  intent: Intent,
  userPrompt: string,
  childPrompt: string,
  index: number,
): ExactText[] {
  return intent.exact_text.filter((item) =>
    evidence(item, userPrompt).some((clause) => {
      const prefix = clause.slice(0, clause.indexOf(item.text));
      const scope = ordinal.exec(prefix);
      if (scope) {
        const position = scope[1]
          ? Number(scope[1]) - 1
          : ["first", "second", "third", "fourth", "fifth", "sixth"].indexOf(
              scope[2].toLowerCase(),
            );
        return position === index;
      }
      if (shared.test(prefix)) return true;
      // A local scene qualifier scopes copy to the decomposed brief. Unqualified
      // copy is shared; it must never inherit another child's numbered copy.
      const local =
        /(?:\b(?:for|in|on|at)\s+(?:the\s+)?)(.+?)\s+(?:image|poster|slide|scene|ad)\b/i.exec(
          prefix,
        );
      if (local) return childPrompt.toLowerCase().includes(local[1].toLowerCase());
      const named = /^\s*([^:]+):/.exec(prefix);
      if (named && !/\b(?:exact|text|headline|caption|label|title|copy|slogan)\b/i.test(named[1]))
        return childPrompt.toLowerCase().includes(named[1].trim().toLowerCase());
      return true;
    }),
  );
}
