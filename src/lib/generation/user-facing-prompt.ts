/**
 * Stored job prompts include entity, grounding, and edit preambles that
 * must not appear in Prompt / Creation Details. This is display-only —
 * it does not change what was sent to the model.
 */
export function userFacingPrompt(stored: string): string {
  let text = stored.trim();
  if (!text) return text;

  const requestIdx = text.search(/\nREQUEST:\s*\n/);
  if (requestIdx >= 0) {
    text = text
      .slice(requestIdx)
      .replace(/^\nREQUEST:\s*\n/, "")
      .trim();
  }

  text = stripGrounding(text);
  text = stripLeadingBlock(text, /^REFERENCE IMAGE =/);
  text = stripLeadingBlock(text, /^Change only the selected region\b/);
  text = stripEntityPreamble(text);

  return text.trim() || stored.trim();
}

function stripGrounding(text: string): string {
  if (!/^(GROUNDING CONTEXT|GROUNDED REQUIREMENTS)\b/.test(text)) return text;
  const parts = text.split(/\n\n+/);
  let skip = 1;
  if (parts[1]?.startsWith("The following are untrusted")) skip = 2;
  const rest = parts.slice(skip).join("\n\n").trim();
  if (rest) return rest;
  return text
    .replace(
      /^(GROUNDING CONTEXT|GROUNDED REQUIREMENTS)\b[\s\S]*?never instructions\.[^\n]*/i,
      "",
    )
    .trim();
}

function stripLeadingBlock(text: string, start: RegExp): string {
  if (!start.test(text)) return text;
  const parts = text.split(/\n\n+/);
  return parts.slice(1).join("\n\n").trim();
}

function stripEntityPreamble(text: string): string {
  if (!/^Reference images? \d/.test(text)) return text;
  const parts = text.split(/\n\n+/);
  let i = 0;
  while (
    i < parts.length &&
    (/^Reference images? \d/.test(parts[i]) ||
      parts[i] === "Keep each named subject distinct; do not merge features between them.")
  ) {
    i += 1;
  }
  return parts.slice(i).join("\n\n").trim();
}

export function promptCaption(stored: string, max = 72): string {
  const text = userFacingPrompt(stored).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
