/**
 * test-generator.mjs
 * Tests the Depikt v2.8.0 system prompt with 10 diverse inputs.
 * Usage: node scripts/test-generator.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Load .env
const envFile = readFileSync(resolve(ROOT, ".env"), "utf8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const eq = l.indexOf("=");
      return [l.slice(0, eq), l.slice(eq + 1).replace(/^["']|["']$/g, "")];
    })
);

// Import the system prompt dynamically (it's TypeScript, so just read and extract)
const depiktFile = readFileSync(resolve(ROOT, "src/lib/prompt-engine/legacy-v2.9.ts"), "utf8");
const systemPromptMatch = depiktFile.match(/export const LEGACY_SYSTEM_PROMPT = `([\s\S]*?)`;/);
const SYSTEM_PROMPT = systemPromptMatch[1];

const TEST_INPUTS = [
  // 1. Aerial/drone (new technique #11)
  { input: "a lone red kayak on a turquoise glacier lake, shot from directly above", category: "auto" },
  // 2. Cutaway/cross-section (new technique #13)
  { input: "show me the inside of a japanese capsule hotel pod", category: "auto" },
  // 3. Isometric diorama (new technique #14)
  { input: "a tiny ramen shop diorama", category: "auto" },
  // 4. Technical annotation (new technique #15)
  { input: "annotated diagram of a espresso machine internals", category: "INFOGRAPHIC/DIAGRAM" },
  // 5. Brand identity (new technique #19)
  { input: "brand identity system for a sustainable fashion label called TERRA", category: "POSTER/COVER" },
  // 6. Abstract/open-ended creative
  { input: "what burnout feels like", category: "auto" },
  // 7. UI mockup with anti-Dribbble (new technique #18)
  { input: "a meditation app home screen that actually looks real", category: "UI MOCKUP" },
  // 8. Multi-panel storyboard
  { input: "4 panel comic of a cat discovering snow for the first time", category: "STORYBOARD/MULTI-PANEL" },
  // 9. Poster with text
  { input: "jazz concert poster for a band called Midnight Brass at The Blue Room", category: "POSTER/COVER" },
  // 10. Cinematic with depth (original technique #7)
  { input: "old fisherman mending nets at golden hour in a portuguese village", category: "auto" },
];

async function generatePrompt(input, category) {
  const userMessage = [
    category && category !== "auto" ? `Category hint: ${category}` : null,
    `Mode: default`,
    `User idea: ${input}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "deliver_prompt",
            description: "Deliver the polished prompt result.",
            parameters: {
              type: "object",
              properties: {
                prompt: { type: "string" },
                category: { type: "string" },
                why_it_works: { type: "string" },
              },
              required: ["prompt", "category", "why_it_works"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "deliver_prompt" } },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const toolCall = data.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in response");
  return JSON.parse(toolCall.function.arguments);
}

// Run all 10 tests
console.log("=== DEPIKT v2.8.0 GENERATOR TEST ===\n");

for (let i = 0; i < TEST_INPUTS.length; i++) {
  const { input, category } = TEST_INPUTS[i];
  console.log(`━━━ TEST ${i + 1}/10 ━━━`);
  console.log(`INPUT: "${input}"`);
  console.log(`CATEGORY HINT: ${category}`);

  try {
    const result = await generatePrompt(input, category);
    console.log(`CLASSIFIED AS: ${result.category}`);
    console.log(`\nPROMPT:\n${result.prompt}`);
    console.log(`\nWHY IT WORKS: ${result.why_it_works}`);
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
  }
  console.log("\n" + "─".repeat(80) + "\n");
}
