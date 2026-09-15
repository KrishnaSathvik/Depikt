import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeIntent } from "../../src/lib/prompt-engine/builder.ts";
import { buildGenerationPlan } from "../../src/lib/generation/plan.ts";
import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const eq = l.indexOf("=");
        return [
          l.slice(0, eq).trim(),
          l
            .slice(eq + 1)
            .trim()
            .replace(/^["']|["']$/g, ""),
        ];
      }),
  );
}

const env = { ...readEnvFile(resolve(ROOT, ".env")), ...readEnvFile(resolve(ROOT, ".env.local")) };
if (!process.env.OPENAI_API_KEY && env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
}
const hasKey = Boolean(process.env.OPENAI_API_KEY);

test("release gate: live analyzeIntent → plan is 11/11", { skip: !hasKey }, async () => {
  const failures: string[] = [];
  for (const c of loadVnext1Cases()) {
    const { intent } = await analyzeIntent({
      apiKey: process.env.OPENAI_API_KEY!,
      userInput: c.prompt,
      mode: "default",
      referenceImageUrl: null,
    });
    const plan = buildGenerationPlan(intent, c.prompt);
    if (
      plan.mode !== c.expected.mode ||
      plan.desiredCount !== c.expected.desiredCount ||
      plan.searchNeeded !== c.expected.search_needed
    ) {
      failures.push(
        `${c.id}: got ${plan.mode}/${plan.desiredCount}/search=${plan.searchNeeded} expected ${c.expected.mode}/${c.expected.desiredCount}/search=${c.expected.search_needed}`,
      );
    }
  }
  assert.deepEqual(failures, []);
});
