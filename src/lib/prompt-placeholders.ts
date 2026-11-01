/**
 * Template slots a Library prompt may still contain — "[SUBJECT]",
 * "[COLOR1]", "{character_name}". Generating with them left in spends a
 * credit on literal bracket text, so Generate asks for them first.
 * Only ALL-CAPS square-bracket tokens and snake_case curly tokens count, so
 * ordinary brackets in a prompt are left alone.
 */
export function findPromptPlaceholders(prompt: string): string[] {
  const found = prompt.match(/\[[A-Z][A-Z0-9 _-]{0,30}\]|\{[a-z][a-z0-9_]{0,30}\}/g) ?? [];
  return [...new Set(found)];
}
