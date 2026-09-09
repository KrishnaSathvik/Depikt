// Print a side-by-side table from the latest.json of each configuration.
//   node tests/bench/compare.ts [--out benchmark-results] [--md path]

import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const args = process.argv.slice(2);
const arg = (n: string, d?: string) => {
  const i = args.indexOf(`--${n}`);
  return i === -1 ? d : args[i + 1];
};
const outDir = resolve(ROOT, arg("out", "benchmark-results")!);

interface Run {
  meta: {
    label: string;
    model: string;
    api: string;
    requestParams: unknown;
    cases: number;
    repeat: number;
    promptVersion: string;
  };
  summary: Record<string, unknown> & {
    latencyMeanMs: number;
    latencyP50Ms: number;
    latencyP95Ms: number;
    costMeanUsd: number;
    costPer1kUsd: number;
    usageMean: { input: number; cached: number; output: number; reasoning: number };
    failureKinds: Record<string, number>;
  };
  runs: Array<{
    id: string;
    ok: boolean;
    passed: number;
    total: number;
    checks: Array<{ name: string; pass: boolean; detail?: string }>;
    edge: boolean;
  }>;
}

const rows: Run[] = [];
if (existsSync(outDir)) {
  for (const d of readdirSync(outDir)) {
    const p = resolve(outDir, d, "latest.json");
    if (existsSync(p)) {
      const parsed = JSON.parse(readFileSync(p, "utf8")) as Partial<Run>;
      if (parsed.meta && parsed.summary && parsed.runs) rows.push(parsed as Run);
    }
  }
}
rows.sort((a, b) => a.meta.label.localeCompare(b.meta.label));

const cols = [
  ["configuration", (r: Run) => r.meta.label],
  ["cases", (r: Run) => `${r.meta.cases}×${r.meta.repeat}`],
  ["intent (v3)", (r: Run) => `${r.summary.intentChecks ?? "n/a"}`],
  ["reference (v3)", (r: Run) => `${r.summary.referenceIntentAccuracy ?? "n/a"}`],
  ["edit", (r: Run) => `${r.summary.editChecks ?? "n/a"}`],
  ["factual", (r: Run) => `${r.summary.factualChecks ?? "n/a"}`],
  ["efficiency", (r: Run) => `${r.summary.efficiencyChecks ?? "n/a"}`],
  ["words", (r: Run) => `${r.summary.builderOutputWordsMean ?? "n/a"}`],
  ["intent ms", (r: Run) => `${r.summary.intentMeanMs ?? "n/a"}`],
  [
    "TTFT / perceived",
    (r: Run) =>
      `${r.summary.ttftMeanMs ?? "n/a"} / ${r.summary.perceivedFirstOutputMeanMs ?? "n/a"} ms`,
  ],
  ["valid results", (r: Run) => `${r.summary.validRate}`],
  ["checks (all)", (r: Run) => `${r.summary.checkPassRate}`],
  ["checks (core)", (r: Run) => `${r.summary.coreCheckPassRate}`],
  ["checks (edge)", (r: Run) => `${r.summary.edgeCheckPassRate}`],
  ["category acc", (r: Run) => `${r.summary.categoryAccuracy}`],
  ["ratio", (r: Run) => `${r.summary.ratioChecks ?? r.summary.ratioCompliance}`],
  ["exact text", (r: Run) => `${r.summary.textChecks ?? r.summary.exactTextChecks}`],
  ["counts", (r: Run) => `${r.summary.countChecks}`],
  [
    "critic",
    (r: Run) =>
      `${r.summary.criticChecks ?? r.summary.criticScoreRange} (μ ${r.summary.criticScoreMean ?? "n/a"})`,
  ],
  [
    "latency mean/p50/p95",
    (r: Run) => `${r.summary.latencyMeanMs}/${r.summary.latencyP50Ms}/${r.summary.latencyP95Ms} ms`,
  ],
  [
    "tokens in/cached/out/reason",
    (r: Run) =>
      `${r.summary.usageMean.input}/${r.summary.usageMean.cached}/${r.summary.usageMean.output}/${r.summary.usageMean.reasoning}`,
  ],
  ["$/request", (r: Run) => `$${r.summary.costMeanUsd}`],
  ["$/1k", (r: Run) => `$${r.summary.costPer1kUsd}`],
  ["failures", (r: Run) => JSON.stringify(r.summary.failureKinds)],
] as const;

const lines: string[] = [];
lines.push(`| ${cols.map((c) => c[0]).join(" | ")} |`);
lines.push(`| ${cols.map(() => "---").join(" | ")} |`);
for (const r of rows) lines.push(`| ${cols.map((c) => c[1](r)).join(" | ")} |`);

// Per-case matrix of failed checks
lines.push("");
lines.push("## Failed checks per case");
lines.push("");
const ids = [...new Set(rows.flatMap((r) => r.runs.map((x) => x.id)))].sort();
lines.push(
  `| case | ${rows.map((r) => r.meta.label.replace("v2.9__", "").replace("__responses", "")).join(" | ")} |`,
);
lines.push(`| --- | ${rows.map(() => "---").join(" | ")} |`);
for (const id of ids) {
  const cells = rows.map((r) => {
    const runs = r.runs.filter((x) => x.id === id);
    if (runs.length === 0) return "";
    return runs
      .map((x) =>
        !x.ok
          ? "✗"
          : x.passed === x.total
            ? "✓"
            : x.checks
                .filter((k) => !k.pass)
                .map((k) => k.name.split(":")[0])
                .join(","),
      )
      .join(" / ");
  });
  const edge = rows.some((r) => r.runs.find((x) => x.id === id)?.edge);
  lines.push(`| ${id}${edge ? " *" : ""} | ${cells.join(" | ")} |`);
}
const out = lines.join("\n");
console.log(out);
const mdPath = arg("md");
if (mdPath) writeFileSync(resolve(ROOT, mdPath), out + "\n");
