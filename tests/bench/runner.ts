// Depikt prompt-engine benchmark runner.
//
//   node tests/bench/runner.ts --config baseline [--repeat 1] [--concurrency 4]
//        [--filter <substring>] [--tag subset] [--limit N] [--dry]
//
// Runs the v2.9 engine (system prompt + server-side request construction +
// sanitizer) against a named model/API configuration, scores each case with
// deterministic checks, and writes JSON + Markdown to benchmark-results/.
// Example selection is seeded per case so every configuration sees the same
// curated examples.

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import { SYSTEM_PROMPT, PROMPT_VERSION } from "../../src/lib/depikt.ts";
import { buildPromptRequest, type PromptMode } from "../../src/lib/prompt-request.ts";
import { sanitizeResultFields } from "../../src/lib/sanitize.ts";
import { createStructuredResponse } from "../../src/lib/openai/client.ts";
import { OpenAIRequestError } from "../../src/lib/openai/errors.ts";
import { selectContract, parseResult } from "../../src/lib/openai/schemas.ts";
import { resolveRequestParams, type TokenUsage } from "../../src/lib/openai/models.ts";
import { CONFIGS, type BenchConfig } from "./configs.ts";
import { legacyChatCompletion } from "./legacy-chat.ts";
import { scoreCase, type BenchCase, type CheckResult } from "./scorers.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

// ---------- args ----------
const args = process.argv.slice(2);
function arg(name: string, def?: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  const next = args[i + 1];
  // Boolean flag when followed by nothing or by another --flag.
  if (next === undefined || next.startsWith("--")) return "true";
  return next;
}
const configName = arg("config");
if (!configName || !CONFIGS[configName]) {
  console.error(`--config required. One of: ${Object.keys(CONFIGS).join(", ")}`);
  process.exit(2);
}
const cfg: BenchConfig = CONFIGS[configName];
const repeat = Number(arg("repeat", "1"));
const concurrency = Number(arg("concurrency", "4"));
const filter = arg("filter");
const tag = arg("tag") ?? cfg.tag;
const limit = arg("limit") ? Number(arg("limit")) : undefined;
const dry = arg("dry") === "true";
const outDir = resolve(ROOT, arg("out", "benchmark-results")!);

// ---------- env ----------
function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const raw = readFileSync(resolve(ROOT, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env */
  }
  return { ...out, ...(process.env as Record<string, string>) };
}
const env = loadEnv();
const apiKey = env.OPENAI_API_KEY;
if (!apiKey && !dry) {
  console.error("OPENAI_API_KEY missing (set in .env or environment)");
  process.exit(2);
}

// ---------- cases ----------
interface LoadedCase extends BenchCase {
  pipeline: "builder" | "critic";
  mode: PromptMode;
}
function loadCases(): LoadedCase[] {
  const builder = JSON.parse(readFileSync(resolve(__dirname, "cases/builder.json"), "utf8")) as BenchCase[];
  const critic = JSON.parse(readFileSync(resolve(__dirname, "cases/critic.json"), "utf8")) as BenchCase[];
  let all: LoadedCase[] = [
    ...builder.map((c) => ({ ...c, pipeline: "builder" as const, mode: "default" as const })),
    ...critic.map((c) => ({ ...c, pipeline: "critic" as const, mode: "CRITIQUE" as const })),
  ];
  if (tag) all = all.filter((c) => c.tags?.includes(tag));
  if (filter) all = all.filter((c) => c.id.includes(filter) || c.group === filter);
  if (limit) all = all.slice(0, limit);
  return all;
}

// Seeded RNG (mulberry32) so example injection is reproducible per case.
function seededRandom(seed: string): () => number {
  let a = parseInt(createHash("sha256").update(seed).digest("hex").slice(0, 8), 16) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- one call ----------
interface CaseRun {
  id: string;
  group: string;
  pipeline: "builder" | "critic";
  edge: boolean;
  run: number;
  ok: boolean;
  schemaValid: boolean;
  failureKind?: string;
  error?: string;
  latencyMs: number;
  usage: TokenUsage;
  costUsd: number;
  attempts: number;
  category?: string;
  score?: number;
  checks: CheckResult[];
  passed: number;
  total: number;
  exampleIds: string[];
  lockedRatio: string | null;
  cinematicForced: boolean;
  outputText: string;
  result: unknown;
}

async function runOne(c: LoadedCase, run: number): Promise<CaseRun> {
  const req = buildPromptRequest({
    userInput: c.input,
    mode: c.mode,
    category: "auto",
    random: seededRandom(`${c.id}#${run}`),
  });
  const contract = selectContract(c.mode);
  const base = {
    id: c.id,
    group: c.group,
    pipeline: c.pipeline,
    edge: !!c.edge,
    run,
    exampleIds: req.exampleIds,
    lockedRatio: req.lockedRatio,
    cinematicForced: req.cinematicForced,
  };
  if (dry) {
    return { ...base, ok: true, schemaValid: true, latencyMs: 0, usage: zeroUsage(), costUsd: 0, attempts: 0, checks: [], passed: 0, total: 0, outputText: req.userMessage, result: null };
  }
  try {
    let rawText: string;
    let usage: TokenUsage;
    let costUsd: number;
    let latencyMs: number;
    let attempts = 1;
    if (cfg.api === "chat") {
      const out = await legacyChatCompletion({ apiKey: apiKey!, config: cfg.model, systemPrompt: SYSTEM_PROMPT, userMessage: req.userMessage, mode: c.mode });
      rawText = out.rawText;
      usage = out.usage;
      costUsd = out.estimatedCostUsd;
      latencyMs = out.latencyMs;
    } else {
      const out = await createStructuredResponse({
        apiKey: apiKey!,
        config: cfg.model,
        instructions: SYSTEM_PROMPT,
        input: [{ role: "user", content: req.userMessage }],
        contract,
        maxAttempts: 2,
      });
      rawText = out.rawText;
      usage = out.usage;
      costUsd = out.estimatedCostUsd;
      latencyMs = out.latencyMs;
      attempts = out.attempts;
    }
    // Validate against the STRICT contract regardless of transport, so the
    // baseline's loose tool output is measured against the new bar too.
    const parsed = parseResult(contract, rawText);
    const result = parsed.ok ? sanitizeResultFields({ ...(parsed.value as Record<string, unknown>) }) : null;
    const checks = scoreCase(c.pipeline, c, result as never);
    const passed = checks.filter((k) => k.pass).length;
    const r = result as { category?: string; score?: number } | null;
    return {
      ...base,
      ok: parsed.ok,
      schemaValid: parsed.ok,
      error: parsed.ok ? undefined : parsed.error,
      failureKind: parsed.ok ? undefined : "malformed_output",
      latencyMs,
      usage,
      costUsd,
      attempts,
      category: r?.category,
      score: r?.score,
      checks,
      passed,
      total: checks.length,
      outputText: rawText,
      result,
    };
  } catch (e) {
    const err = e as OpenAIRequestError | Error;
    const kind = err instanceof OpenAIRequestError ? err.kind : "unknown";
    const detail = err instanceof OpenAIRequestError ? (err.detail ?? err.message) : err.message;
    const checks = scoreCase(c.pipeline, c, null);
    return {
      ...base,
      ok: false,
      schemaValid: false,
      failureKind: kind,
      error: detail,
      latencyMs: 0,
      usage: zeroUsage(),
      costUsd: 0,
      attempts: err instanceof OpenAIRequestError ? 2 : 1,
      checks,
      passed: 0,
      total: checks.length,
      outputText: "",
      result: null,
    };
  }
}

function zeroUsage(): TokenUsage {
  return { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0 };
}

// ---------- pool ----------
async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

// ---------- summary ----------
function pct(n: number, d: number): string {
  return d === 0 ? "n/a" : `${((100 * n) / d).toFixed(1)}%`;
}
function quantile(xs: number[], q: number): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function summarize(runs: CaseRun[]) {
  const okRuns = runs.filter((r) => r.ok);
  const lat = okRuns.map((r) => r.latencyMs);
  const checks = runs.flatMap((r) => r.checks);
  const coreRuns = runs.filter((r) => !r.edge);
  const edgeRuns = runs.filter((r) => r.edge);
  const coreChecks = coreRuns.flatMap((r) => r.checks);
  const edgeChecks = edgeRuns.flatMap((r) => r.checks);
  const catChecks = checks.filter((k) => k.name === "category" || k.name === "category_any");
  const ratioChecks = checks.filter((k) => k.name === "ratio");
  const textChecks = checks.filter((k) => k.name.startsWith("contains:") || k.name.startsWith("rewritten_contains:"));
  const countChecks = checks.filter((k) => k.name === "page_count" || k.name === "panel_count");
  const scoreChecks = checks.filter((k) => k.name === "score_range");
  const criticScores = runs.filter((r) => r.pipeline === "critic" && typeof r.score === "number").map((r) => r.score as number);
  const cost = runs.map((r) => r.costUsd);
  const usage = {
    input: mean(okRuns.map((r) => r.usage.inputTokens)),
    cached: mean(okRuns.map((r) => r.usage.cachedInputTokens)),
    output: mean(okRuns.map((r) => r.usage.outputTokens)),
    reasoning: mean(okRuns.map((r) => r.usage.reasoningTokens)),
  };
  const failureKinds: Record<string, number> = {};
  for (const r of runs) if (!r.ok) failureKinds[r.failureKind ?? "unknown"] = (failureKinds[r.failureKind ?? "unknown"] ?? 0) + 1;
  return {
    runs: runs.length,
    validResults: okRuns.length,
    validRate: pct(okRuns.length, runs.length),
    failureKinds,
    checksPassed: checks.filter((k) => k.pass).length,
    checksTotal: checks.length,
    checkPassRate: pct(checks.filter((k) => k.pass).length, checks.length),
    coreCheckPassRate: pct(coreChecks.filter((k) => k.pass).length, coreChecks.length),
    edgeCheckPassRate: pct(edgeChecks.filter((k) => k.pass).length, edgeChecks.length),
    casesAllPassed: runs.filter((r) => r.ok && r.passed === r.total).length,
    categoryAccuracy: pct(catChecks.filter((k) => k.pass).length, catChecks.length),
    ratioCompliance: pct(ratioChecks.filter((k) => k.pass).length, ratioChecks.length),
    exactTextChecks: pct(textChecks.filter((k) => k.pass).length, textChecks.length),
    countChecks: pct(countChecks.filter((k) => k.pass).length, countChecks.length),
    criticScoreRange: pct(scoreChecks.filter((k) => k.pass).length, scoreChecks.length),
    criticScoreMean: criticScores.length ? Number(mean(criticScores).toFixed(2)) : null,
    criticScores,
    latencyMeanMs: Math.round(mean(lat)),
    latencyP50Ms: Math.round(quantile(lat, 0.5)),
    latencyP95Ms: Math.round(quantile(lat, 0.95)),
    usageMean: { input: Math.round(usage.input), cached: Math.round(usage.cached), output: Math.round(usage.output), reasoning: Math.round(usage.reasoning) },
    costMeanUsd: Number(mean(cost).toFixed(6)),
    costPer1kUsd: Number((mean(cost) * 1000).toFixed(3)),
    costTotalUsd: Number(cost.reduce((a, b) => a + b, 0).toFixed(4)),
  };
}

// ---------- main ----------
async function main() {
  const cases = loadCases();
  const jobs = cases.flatMap((c) => Array.from({ length: repeat }, (_, i) => ({ c, run: i + 1 })));
  const systemPromptSha = createHash("sha256").update(SYSTEM_PROMPT).digest("hex");
  const meta = {
    label: cfg.label,
    config: configName,
    note: cfg.note ?? null,
    api: cfg.api,
    model: cfg.model.model,
    requestParams: cfg.api === "chat" ? { temperature: cfg.model.temperature ?? null } : resolveRequestParams(cfg.model),
    promptVersion: PROMPT_VERSION,
    systemPromptSha256: systemPromptSha,
    systemPromptChars: SYSTEM_PROMPT.length,
    cases: cases.length,
    repeat,
    tag: tag ?? null,
    filter: filter ?? null,
    startedAt: new Date().toISOString(),
    node: process.version,
  };
  console.log(`▶ ${cfg.label}`);
  console.log(`  ${cases.length} cases × ${repeat} run(s), concurrency ${concurrency}${dry ? " (DRY RUN)" : ""}`);

  const t0 = Date.now();
  let doneCount = 0;
  const runs = await pool(jobs, concurrency, async ({ c, run }) => {
    const r = await runOne(c, run);
    doneCount++;
    const flag = r.ok ? (r.passed === r.total ? "✓" : "~") : "✗";
    process.stdout.write(`  ${flag} ${String(doneCount).padStart(3)}/${jobs.length} ${c.id}${run > 1 ? `#${run}` : ""} ${r.ok ? `${r.passed}/${r.total} ${r.latencyMs}ms` : `FAIL ${r.failureKind}`}\n`);
    return r;
  });
  const wallMs = Date.now() - t0;
  const summary = summarize(runs);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = resolve(outDir, cfg.label);
  mkdirSync(dir, { recursive: true });
  const jsonPath = resolve(dir, `${stamp}.json`);
  writeFileSync(jsonPath, JSON.stringify({ meta: { ...meta, wallMs, finishedAt: new Date().toISOString() }, summary, runs }, null, 2));

  const md = renderMarkdown(meta, summary, runs, wallMs);
  const mdPath = resolve(dir, `${stamp}.md`);
  writeFileSync(mdPath, md);
  writeFileSync(resolve(dir, "latest.json"), JSON.stringify({ meta: { ...meta, wallMs }, summary, runs }, null, 2));

  console.log("\n" + md);
  console.log(`\nwrote ${jsonPath}\n      ${mdPath}`);
}

function renderMarkdown(meta: Record<string, unknown>, s: ReturnType<typeof summarize>, runs: CaseRun[], wallMs: number): string {
  const lines: string[] = [];
  lines.push(`# ${meta.label}`);
  lines.push("");
  lines.push(`- prompt: ${meta.promptVersion} (sha256 ${String(meta.systemPromptSha256).slice(0, 12)}…)`);
  lines.push(`- api: ${meta.api}, model: ${meta.model}, params: ${JSON.stringify(meta.requestParams)}`);
  lines.push(`- cases: ${meta.cases} × ${meta.repeat}, wall ${(wallMs / 1000).toFixed(1)}s`);
  lines.push("");
  lines.push("| metric | value |");
  lines.push("|---|---|");
  lines.push(`| valid structured results | ${s.validResults}/${s.runs} (${s.validRate}) |`);
  lines.push(`| failure kinds | ${JSON.stringify(s.failureKinds)} |`);
  lines.push(`| deterministic checks passed | ${s.checksPassed}/${s.checksTotal} (${s.checkPassRate}) |`);
  lines.push(`| core (non-edge) check pass rate | ${s.coreCheckPassRate} |`);
  lines.push(`| edge (desired-behavior) check pass rate | ${s.edgeCheckPassRate} |`);
  lines.push(`| cases with all checks passed | ${s.casesAllPassed}/${s.runs} |`);
  lines.push(`| category accuracy | ${s.categoryAccuracy} |`);
  lines.push(`| ratio compliance | ${s.ratioCompliance} |`);
  lines.push(`| exact-text checks | ${s.exactTextChecks} |`);
  lines.push(`| page/panel count checks | ${s.countChecks} |`);
  lines.push(`| critic score-range checks | ${s.criticScoreRange} (mean score ${s.criticScoreMean ?? "n/a"}) |`);
  lines.push(`| latency mean / p50 / p95 | ${s.latencyMeanMs} / ${s.latencyP50Ms} / ${s.latencyP95Ms} ms |`);
  lines.push(`| tokens mean in / cached / out / reasoning | ${s.usageMean.input} / ${s.usageMean.cached} / ${s.usageMean.output} / ${s.usageMean.reasoning} |`);
  lines.push(`| est. cost per request / per 1k | $${s.costMeanUsd} / $${s.costPer1kUsd} |`);
  lines.push(`| est. cost this run | $${s.costTotalUsd} |`);
  lines.push("");
  lines.push("| case | ok | checks | category | score | latency | failed checks |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const r of runs) {
    const failed = r.checks.filter((k) => !k.pass).map((k) => k.name + (k.detail ? ` (${k.detail})` : "")).join("; ");
    lines.push(`| ${r.id}${r.edge ? " *" : ""}${r.run > 1 ? `#${r.run}` : ""} | ${r.ok ? "✓" : `✗ ${r.failureKind}`} | ${r.passed}/${r.total} | ${r.category ?? ""} | ${r.score ?? ""} | ${r.latencyMs}ms | ${failed || (r.error ? r.error.slice(0, 120) : "")} |`);
  }
  lines.push("");
  lines.push("`*` = edge case encoding desired (post-migration) behavior; v2.9 is expected to fail some.");
  return lines.join("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
