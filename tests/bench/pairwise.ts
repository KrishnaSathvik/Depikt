// Offline pairwise judge: GPT-6 Astra compares the LEGACY and NEW builder
// prompts for the same user request, blind to which is which, A/B randomized.
//
//   node tests/bench/pairwise.ts --a <configDirLabel> --b <configDirLabel> [--tag pair] [--limit 15] [--out benchmark-results]
//
// Never used in production. Cost is bounded by --limit.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { z } from "zod";
import { createStructuredResponse } from "../../src/lib/openai/client.ts";
import { MODEL_ROLES } from "../../src/lib/openai/models.ts";
import { toStrictJsonSchema } from "../../src/lib/prompt-engine/schemas.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const args = process.argv.slice(2);
const arg = (n: string, d?: string) => {
  const i = args.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? "true" : v;
};
const outDir = resolve(ROOT, arg("out", "benchmark-results")!);
const aLabel = arg("a", "legacy-v2.9__builder-luna__critic-luna")!;
const bLabel = arg("b", "images-2.5-v3__intent-luna__builder-luna__critic-terra-medium")!;
const tag = arg("tag", "pair");
const limit = Number(arg("limit", "15"));

function loadEnvKey(): string {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const raw = readFileSync(resolve(ROOT, ".env"), "utf8");
  const line = raw.split("\n").find((l) => l.startsWith("OPENAI_API_KEY="));
  return line
    ? line
        .slice("OPENAI_API_KEY=".length)
        .trim()
        .replace(/^["']|["']$/g, "")
    : "";
}
const apiKey = loadEnvKey();
if (!apiKey) throw new Error("OPENAI_API_KEY missing");

interface RunFile {
  meta: { label: string };
  runs: Array<{ id: string; pipeline: string; ok: boolean; result: { prompt?: string } | null }>;
}
const A: RunFile = JSON.parse(readFileSync(resolve(outDir, aLabel, "latest.json"), "utf8"));
const B: RunFile = JSON.parse(readFileSync(resolve(outDir, bLabel, "latest.json"), "utf8"));
const cases = JSON.parse(readFileSync(resolve(__dirname, "cases/builder.json"), "utf8")) as Array<{
  id: string;
  input: string;
  tags?: string[];
  image?: string;
}>;

const Judgment = z.strictObject({
  winner: z.enum(["A", "B", "tie"]),
  confidence: z.enum(["low", "medium", "high"]),
  fidelity: z.enum(["A", "B", "tie"]),
  clarity: z.enum(["A", "B", "tie"]),
  fewer_contradictions: z.enum(["A", "B", "tie"]),
  edit_or_reference_handling: z.enum(["A", "B", "tie", "n/a"]),
  layout_text_control: z.enum(["A", "B", "tie", "n/a"]),
  less_unnecessary_detail: z.enum(["A", "B", "tie"]),
  reasons: z.string(),
});
type Judgment = z.infer<typeof Judgment>;
const contract = {
  pipeline: "builder" as const,
  name: "pairwise_judgment",
  zod: Judgment as z.ZodType<Judgment>,
  jsonSchema: toStrictJsonSchema(Judgment),
};

const INSTRUCTIONS = `You are an impartial judge of prompts written for OpenAI's current image generation model (ChatGPT Images 2.5 / GPT-Image-2.5). You will see the ORIGINAL USER REQUEST and two candidate prompts, A and B, written by two different systems to fulfill it. Judge which prompt would more reliably produce what the user asked for with the current image model.
Criteria: fidelity to the request (nothing added, nothing dropped); clarity for an image model; absence of contradictions; correct handling of edits or references when the request involves one; control of layout and exact text when relevant; absence of unnecessary detail, boilerplate, decorative camera jargon, and quality-word padding (longer is not better).
Do not reward length or technical vocabulary. Do not guess which system wrote which. Choose "tie" only when they are genuinely equivalent. Give two or three sentences of reasons.`;

function seededBool(s: string): boolean {
  return parseInt(createHash("sha256").update(s).digest("hex").slice(0, 2), 16) % 2 === 0;
}

async function main() {
  const byA = new Map(
    A.runs
      .filter((r) => r.pipeline === "builder" && r.ok && r.result?.prompt)
      .map((r) => [r.id, r.result!.prompt!]),
  );
  const byB = new Map(
    B.runs
      .filter((r) => r.pipeline === "builder" && r.ok && r.result?.prompt)
      .map((r) => [r.id, r.result!.prompt!]),
  );
  const selected = cases
    .filter((c) => (!tag || c.tags?.includes(tag)) && byA.has(c.id) && byB.has(c.id))
    .slice(0, limit);
  console.log(`▶ Astra pairwise: ${selected.length} pairs, A=${aLabel}, B=${bLabel}`);
  const rows: Array<{
    id: string;
    swapped: boolean;
    judgment: Judgment;
    winnerLabel: "A" | "B" | "tie";
    costUsd: number;
    latencyMs: number;
  }> = [];
  let totalCost = 0;
  for (const c of selected) {
    const swapped = seededBool(c.id);
    const first = swapped ? byB.get(c.id)! : byA.get(c.id)!;
    const second = swapped ? byA.get(c.id)! : byB.get(c.id)!;
    const note = c.image
      ? "\n(The user also attached a reference image; judge how each prompt instructs its use from the wording alone.)"
      : "";
    const input = `ORIGINAL USER REQUEST:\n${c.input}${note}\n\nPROMPT A:\n${first}\n\nPROMPT B:\n${second}`;
    try {
      const out = await createStructuredResponse<Judgment>({
        apiKey,
        config: MODEL_ROLES.BENCHMARK_JUDGE,
        instructions: INSTRUCTIONS,
        input: [{ role: "user", content: input }],
        contract,
      });
      const j = out.parsed;
      const winnerLabel: "A" | "B" | "tie" =
        j.winner === "tie" ? "tie" : (j.winner === "A") !== swapped ? "A" : "B";
      totalCost += out.estimatedCostUsd;
      rows.push({
        id: c.id,
        swapped,
        judgment: j,
        winnerLabel,
        costUsd: out.estimatedCostUsd,
        latencyMs: out.latencyMs,
      });
      console.log(
        `  ${c.id}: ${winnerLabel === "A" ? "LEGACY" : winnerLabel === "B" ? "NEW" : "tie"} (${j.confidence}) ${out.latencyMs}ms`,
      );
    } catch (e) {
      console.log(`  ${c.id}: ERROR ${(e as Error).message}`);
    }
  }
  const wins = {
    legacy: rows.filter((r) => r.winnerLabel === "A").length,
    new: rows.filter((r) => r.winnerLabel === "B").length,
    tie: rows.filter((r) => r.winnerLabel === "tie").length,
  };
  const summary = {
    judge: MODEL_ROLES.BENCHMARK_JUDGE.model,
    pairs: rows.length,
    aLabel,
    bLabel,
    wins,
    estimatedCostUsd: Number(totalCost.toFixed(4)),
  };
  const dir = resolve(outDir, "pairwise");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "latest.json"), JSON.stringify({ summary, rows }, null, 2));
  const md = [
    `# Astra pairwise (blind, A/B randomized)`,
    `- judge: ${summary.judge}; pairs: ${summary.pairs}; legacy wins ${wins.legacy}, new wins ${wins.new}, ties ${wins.tie}; est. cost $${summary.estimatedCostUsd}`,
    "",
    "| case | winner | confidence | fidelity | clarity | contradictions | edit/ref | layout/text | less detail | reasons |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...rows.map((r) => {
      const m = (v: string) =>
        v === "tie" || v === "n/a" ? v : (v === "A") !== r.swapped ? "legacy" : "new";
      const j = r.judgment;
      return `| ${r.id} | ${r.winnerLabel === "A" ? "legacy" : r.winnerLabel === "B" ? "new" : "tie"} | ${j.confidence} | ${m(j.fidelity)} | ${m(j.clarity)} | ${m(j.fewer_contradictions)} | ${m(j.edit_or_reference_handling)} | ${m(j.layout_text_control)} | ${m(j.less_unnecessary_detail)} | ${j.reasons.replace(/\|/g, "/")} |`;
    }),
  ].join("\n");
  writeFileSync(resolve(dir, "latest.md"), md);
  console.log("\n" + md);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
