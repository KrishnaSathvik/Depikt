// Depikt prompt-engine benchmark runner (Phase 2).
//
//   node tests/bench/runner.ts --config <name> [--repeat N] [--concurrency N]
//        [--filter <id-substring|group>] [--tag <tag>] [--pipeline builder|critic]
//        [--limit N] [--dry] [--out dir]
//
// Runs either the frozen legacy v2.9 engine or the Images 2.5 v3 engine over
// the case set, scores deterministic checks, records latency (incl. TTFT and
// the v3 intent stage), tokens, cost, and writes JSON + Markdown to
// benchmark-results/<label>/.

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import {
  LEGACY_PROMPT_VERSION,
  LEGACY_SYSTEM_PROMPT,
} from "../../src/lib/prompt-engine/legacy-v2.9.ts";
import { buildPromptRequest, type PromptMode } from "../../src/lib/prompt-request.ts";
import { sanitizeResultFields } from "../../src/lib/sanitize.ts";
import { streamStructuredResponse, type InputMessage } from "../../src/lib/openai/client.ts";
import { OpenAIRequestError } from "../../src/lib/openai/errors.ts";
import { selectContract, parseResult } from "../../src/lib/openai/schemas.ts";
import { resolveRequestParams, type TokenUsage } from "../../src/lib/openai/models.ts";
import { PROMPT_VERSION, runBuilder, CORE_RULES } from "../../src/lib/prompt-engine/builder.ts";
import { runCritic, CRITIC_INSTRUCTIONS } from "../../src/lib/prompt-engine/critic.ts";
import { INTENT_INSTRUCTIONS } from "../../src/lib/prompt-engine/intent.ts";
import { isReferenceIntent } from "../../src/lib/prompt-engine/reference.ts";
import { MODEL_ROLES } from "../../src/lib/openai/models.ts";
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
const pipelineFilter = (arg("pipeline") ?? cfg.pipeline) as "builder" | "critic" | undefined;
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
      out[line.slice(0, eq).trim()] = line
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
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

// ---------- cases & fixtures ----------
interface LoadedCase extends BenchCase {
  pipeline: "builder" | "critic";
  mode: PromptMode;
  imageDataUrl?: string;
}
const fixtureCache = new Map<string, string>();
function loadFixture(rel: string): string {
  const cached = fixtureCache.get(rel);
  if (cached) return cached;
  const p = rel.startsWith("public/") ? resolve(ROOT, rel) : resolve(__dirname, rel);
  const ext = extname(p).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  const url = `data:${mime};base64,${readFileSync(p).toString("base64")}`;
  fixtureCache.set(rel, url);
  return url;
}
function loadCases(): LoadedCase[] {
  const builder = JSON.parse(
    readFileSync(resolve(__dirname, "cases/builder.json"), "utf8"),
  ) as BenchCase[];
  const critic = JSON.parse(
    readFileSync(resolve(__dirname, "cases/critic.json"), "utf8"),
  ) as BenchCase[];
  let all: LoadedCase[] = [
    ...builder.map((c) => ({ ...c, pipeline: "builder" as const, mode: "default" as const })),
    ...critic.map((c) => ({ ...c, pipeline: "critic" as const, mode: "CRITIQUE" as const })),
  ];
  if (pipelineFilter) all = all.filter((c) => c.pipeline === pipelineFilter);
  if (tag) all = all.filter((c) => c.tags?.includes(tag));
  if (filter) all = all.filter((c) => c.id.includes(filter) || c.group === filter);
  if (limit) all = all.slice(0, limit);
  for (const c of all) if (c.image) c.imageDataUrl = loadFixture(c.image);
  return all;
}

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

// ---------- run record ----------
interface CaseRun {
  id: string;
  group: string;
  pipeline: "builder" | "critic";
  edge: boolean;
  hasImage: boolean;
  run: number;
  ok: boolean;
  failureKind?: string;
  error?: string;
  /** end-to-end wall time for the case */
  totalMs: number;
  /** v3 builder: intent stage; else 0 */
  intentMs: number;
  /** time to first writer/critic delta (streaming) */
  ttftMs: number | null;
  /** writer/critic call time */
  writerMs: number;
  usage: TokenUsage;
  costUsd: number;
  attempts: number;
  category?: string;
  score?: number | null;
  intent?: Record<string, unknown>;
  overrides?: string[];
  imageDetail?: string | null;
  checks: CheckResult[];
  passed: number;
  total: number;
  exampleIds: string[];
  outputWords: number;
  result: unknown;
}

const zeroUsage = (): TokenUsage => ({
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
});
const addUsage = (a: TokenUsage, b: TokenUsage): TokenUsage => ({
  inputTokens: a.inputTokens + b.inputTokens,
  cachedInputTokens: a.cachedInputTokens + b.cachedInputTokens,
  outputTokens: a.outputTokens + b.outputTokens,
  reasoningTokens: a.reasoningTokens + b.reasoningTokens,
});

function finish(
  c: LoadedCase,
  run: number,
  partial: Partial<CaseRun> & { result: unknown; ok: boolean },
): CaseRun {
  const result = partial.result as Record<string, unknown> | null;
  const checks = scoreCase(c.pipeline, c, (result as never) ?? null, cfg.engine);
  const passed = checks.filter((k) => k.pass).length;
  const text =
    c.pipeline === "critic"
      ? String(result?.rewritten_prompt ?? "")
      : String(
          result?.prompt ??
            (Array.isArray(result?.prompts) ? (result!.prompts as string[]).join(" ") : ""),
        );
  return {
    id: c.id,
    group: c.group,
    pipeline: c.pipeline,
    edge: !!c.edge,
    hasImage: !!c.imageDataUrl,
    run,
    totalMs: 0,
    intentMs: 0,
    ttftMs: null,
    writerMs: 0,
    usage: zeroUsage(),
    costUsd: 0,
    attempts: 1,
    exampleIds: [],
    ...partial,
    category: (result?.category as string) ?? undefined,
    score:
      (typeof result?.overall_score === "number"
        ? result.overall_score
        : (result?.score as number | null | undefined)) ?? undefined,
    intent: (result?.intent as Record<string, unknown>) ?? partial.intent,
    checks,
    passed,
    total: checks.length,
    outputWords: text.trim() ? text.trim().split(/\s+/).length : 0,
  };
}

function fail(c: LoadedCase, run: number, e: unknown, extra: Partial<CaseRun> = {}): CaseRun {
  const err = e as OpenAIRequestError | Error;
  const kind = err instanceof OpenAIRequestError ? err.kind : "unknown";
  const detail =
    err instanceof OpenAIRequestError ? (err.detail ?? err.message) : (err as Error).message;
  return finish(c, run, { ok: false, result: null, failureKind: kind, error: detail, ...extra });
}

// ---------- legacy engine ----------
async function runLegacy(c: LoadedCase, run: number): Promise<CaseRun> {
  const t0 = Date.now();
  const req = buildPromptRequest({
    userInput: c.input,
    mode: c.mode,
    category: "auto",
    referenceImageUrl: c.imageDataUrl ?? null,
    remixRef: c.remixRef ?? null,
    random: seededRandom(`${c.id}#${run}`),
  });
  const contract = selectContract(c.mode);
  if (dry) return finish(c, run, { ok: true, result: null, exampleIds: req.exampleIds });
  try {
    if (cfg.api === "chat") {
      const out = await legacyChatCompletion({
        apiKey: apiKey!,
        config: cfg.model,
        systemPrompt: LEGACY_SYSTEM_PROMPT,
        userMessage: req.userMessage,
        mode: c.mode,
      });
      const parsed = parseResult(contract, out.rawText);
      const result = parsed.ok
        ? sanitizeResultFields({ ...(parsed.value as Record<string, unknown>) })
        : null;
      return finish(c, run, {
        ok: parsed.ok,
        result,
        error: parsed.ok ? undefined : parsed.error,
        failureKind: parsed.ok ? undefined : "malformed_output",
        totalMs: Date.now() - t0,
        writerMs: out.latencyMs,
        usage: out.usage,
        costUsd: out.estimatedCostUsd,
        exampleIds: req.exampleIds,
      });
    }
    const content: InputMessage["content"] = c.imageDataUrl
      ? [
          { type: "input_image", image_url: c.imageDataUrl, detail: "low" },
          { type: "input_text", text: req.userMessage },
        ]
      : req.userMessage;
    const tw = Date.now();
    let ttft: number | null = null;
    let outcome = null as null | {
      parsed: unknown;
      usage: TokenUsage;
      estimatedCostUsd: number;
      latencyMs: number;
      attempts: number;
    };
    for await (const evt of streamStructuredResponse({
      apiKey: apiKey!,
      config: cfg.model,
      instructions: LEGACY_SYSTEM_PROMPT,
      input: [{ role: "user", content }],
      contract,
    })) {
      if (evt.type === "delta") ttft ??= Date.now() - tw;
      else if (evt.type === "done") outcome = evt.outcome;
      else throw new OpenAIRequestError(evt.kind, evt.message);
    }
    if (!outcome) throw new Error("no result");
    const result = sanitizeResultFields({ ...(outcome.parsed as Record<string, unknown>) });
    return finish(c, run, {
      ok: true,
      result,
      totalMs: Date.now() - t0,
      ttftMs: ttft,
      writerMs: outcome.latencyMs,
      usage: outcome.usage,
      costUsd: outcome.estimatedCostUsd,
      attempts: outcome.attempts,
      exampleIds: req.exampleIds,
      imageDetail: c.imageDataUrl ? "low" : null,
    });
  } catch (e) {
    return fail(c, run, e, { totalMs: Date.now() - t0, exampleIds: req.exampleIds });
  }
}

// ---------- v3 engine ----------
async function runV3(c: LoadedCase, run: number): Promise<CaseRun> {
  const t0 = Date.now();
  if (dry) return finish(c, run, { ok: true, result: null });
  const referenceIntent =
    c.referenceIntent && isReferenceIntent(c.referenceIntent) ? c.referenceIntent : "auto";
  try {
    if (c.pipeline === "critic") {
      const tw = Date.now();
      let ttft: number | null = null;
      for await (const evt of runCritic({
        apiKey: apiKey!,
        prompt: c.input,
        referenceImageUrl: c.imageDataUrl ?? null,
        referenceIntent,
        model: cfg.criticModel ?? MODEL_ROLES.CRITIC,
        stream: true,
      })) {
        if (evt.type === "delta") ttft ??= Date.now() - tw;
        else if (evt.type === "done") {
          return finish(c, run, {
            ok: true,
            result: evt.result,
            totalMs: Date.now() - t0,
            ttftMs: ttft,
            writerMs: evt.telemetry.latencyMs,
            usage: evt.telemetry.usage,
            costUsd: evt.telemetry.costUsd,
            attempts: evt.telemetry.attempts,
            imageDetail: c.imageDataUrl ? "high" : null,
          });
        } else throw new OpenAIRequestError(evt.kind, evt.message);
      }
      throw new Error("no result");
    }
    let intent: Record<string, unknown> | undefined;
    let ttft: number | null = null;
    let tw = 0;
    for await (const evt of runBuilder({
      apiKey: apiKey!,
      userInput: c.input,
      mode: c.mode,
      referenceImageUrl: c.imageDataUrl ?? null,
      referenceIntent,
      remixRef: c.remixRef ?? null,
      intentModel: cfg.intentModel,
      writerModel: cfg.model,
      stream: true,
    })) {
      if (evt.type === "intent") {
        intent = evt.intent as unknown as Record<string, unknown>;
        tw = Date.now();
      } else if (evt.type === "delta") ttft ??= Date.now() - tw;
      else if (evt.type === "done") {
        const t = evt.telemetry;
        return finish(c, run, {
          ok: true,
          result: evt.result,
          totalMs: t.totalMs,
          intentMs: t.intent.latencyMs,
          ttftMs: t.writer.ttftMs ?? ttft,
          writerMs: t.writer.latencyMs,
          usage: addUsage(t.intent.usage, t.writer.usage),
          costUsd: t.totalCostUsd,
          attempts: t.intent.attempts + t.writer.attempts - 1,
          intent,
          overrides: t.overrides,
          imageDetail: t.imageDetail,
        });
      } else throw new OpenAIRequestError(evt.kind, `${evt.stage}: ${evt.message}`);
    }
    throw new Error("no result");
  } catch (e) {
    return fail(c, run, e, { totalMs: Date.now() - t0 });
  }
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
const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${((100 * n) / d).toFixed(1)}%`);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
function quantile(xs: number[], q: number): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
function familyRate(runs: CaseRun[], fam: CheckResult["family"]): string {
  const ks = runs.flatMap((r) => r.checks).filter((k) => k.family === fam);
  return pct(ks.filter((k) => k.pass).length, ks.length);
}

export function summarize(runs: CaseRun[]) {
  const ok = runs.filter((r) => r.ok);
  const builders = runs.filter((r) => r.pipeline === "builder");
  const critics = runs.filter((r) => r.pipeline === "critic");
  const checks = runs.flatMap((r) => r.checks);
  const core = runs.filter((r) => !r.edge).flatMap((r) => r.checks);
  const edge = runs.filter((r) => r.edge).flatMap((r) => r.checks);
  const ttft = ok.map((r) => r.ttftMs).filter((x): x is number => typeof x === "number");
  const failureKinds: Record<string, number> = {};
  for (const r of runs)
    if (!r.ok)
      failureKinds[r.failureKind ?? "unknown"] =
        (failureKinds[r.failureKind ?? "unknown"] ?? 0) + 1;
  const criticScores = critics
    .filter((r) => typeof r.score === "number")
    .map((r) => r.score as number);
  return {
    runs: runs.length,
    builderRuns: builders.length,
    criticRuns: critics.length,
    validResults: ok.length,
    validRate: pct(ok.length, runs.length),
    failureKinds,
    checksPassed: checks.filter((k) => k.pass).length,
    checksTotal: checks.length,
    checkPassRate: pct(checks.filter((k) => k.pass).length, checks.length),
    coreCheckPassRate: pct(core.filter((k) => k.pass).length, core.length),
    edgeCheckPassRate: pct(edge.filter((k) => k.pass).length, edge.length),
    casesAllPassed: runs.filter((r) => r.ok && r.passed === r.total).length,
    categoryAccuracy: familyRate(runs, "category"),
    intentChecks: familyRate(runs, "intent"),
    referenceIntentAccuracy: familyRate(runs, "reference"),
    ratioChecks: familyRate(runs, "ratio"),
    textChecks: familyRate(runs, "text"),
    countChecks: familyRate(runs, "count"),
    editChecks: familyRate(runs, "edit"),
    factualChecks: familyRate(runs, "factual"),
    efficiencyChecks: familyRate(runs, "efficiency"),
    criticChecks: familyRate(runs, "critic"),
    criticScoreMean: criticScores.length ? Number(mean(criticScores).toFixed(2)) : null,
    criticScores: Object.fromEntries(
      critics.map((r) => [r.id + (r.run > 1 ? `#${r.run}` : ""), r.score ?? null]),
    ),
    builderOutputWordsMean: Math.round(
      mean(builders.filter((r) => r.ok).map((r) => r.outputWords)),
    ),
    latencyMeanMs: Math.round(mean(ok.map((r) => r.totalMs))),
    latencyP50Ms: Math.round(
      quantile(
        ok.map((r) => r.totalMs),
        0.5,
      ),
    ),
    latencyP95Ms: Math.round(
      quantile(
        ok.map((r) => r.totalMs),
        0.95,
      ),
    ),
    intentMeanMs: Math.round(
      mean(ok.filter((r) => r.pipeline === "builder").map((r) => r.intentMs)),
    ),
    writerMeanMs: Math.round(mean(ok.map((r) => r.writerMs))),
    ttftMeanMs: ttft.length ? Math.round(mean(ttft)) : null,
    ttftP50Ms: ttft.length ? Math.round(quantile(ttft, 0.5)) : null,
    /** user-perceived time to first visible output = intent stage + writer TTFT */
    perceivedFirstOutputMeanMs: ttft.length
      ? Math.round(
          mean(
            ok
              .filter((r) => typeof r.ttftMs === "number")
              .map((r) => r.intentMs + (r.ttftMs as number)),
          ),
        )
      : null,
    usageMean: {
      input: Math.round(mean(ok.map((r) => r.usage.inputTokens))),
      cached: Math.round(mean(ok.map((r) => r.usage.cachedInputTokens))),
      output: Math.round(mean(ok.map((r) => r.usage.outputTokens))),
      reasoning: Math.round(mean(ok.map((r) => r.usage.reasoningTokens))),
    },
    costMeanUsd: Number(mean(runs.map((r) => r.costUsd)).toFixed(6)),
    costMeanBuilderUsd: Number(mean(builders.map((r) => r.costUsd)).toFixed(6)),
    costMeanCriticUsd: Number(mean(critics.map((r) => r.costUsd)).toFixed(6)),
    costPer1kUsd: Number((mean(runs.map((r) => r.costUsd)) * 1000).toFixed(3)),
    costTotalUsd: Number(runs.reduce((a, r) => a + r.costUsd, 0).toFixed(4)),
  };
}
type Summary = ReturnType<typeof summarize>;

// ---------- main ----------
async function main() {
  const cases = loadCases();
  const jobs = cases.flatMap((c) => Array.from({ length: repeat }, (_, i) => ({ c, run: i + 1 })));
  const promptText =
    cfg.engine === "legacy"
      ? LEGACY_SYSTEM_PROMPT
      : CORE_RULES + INTENT_INSTRUCTIONS + CRITIC_INSTRUCTIONS;
  const meta = {
    label: cfg.label,
    config: configName,
    note: cfg.note ?? null,
    engine: cfg.engine,
    api: cfg.engine === "legacy" ? cfg.api : "responses",
    model: cfg.model.model,
    requestParams:
      cfg.api === "chat"
        ? { temperature: cfg.model.temperature ?? null }
        : resolveRequestParams(cfg.model),
    intentModel: cfg.engine === "v3" ? (cfg.intentModel ?? MODEL_ROLES.INTENT).model : null,
    criticModel:
      cfg.engine === "v3" ? (cfg.criticModel ?? MODEL_ROLES.CRITIC).model : cfg.model.model,
    promptVersion: cfg.engine === "legacy" ? LEGACY_PROMPT_VERSION : PROMPT_VERSION,
    promptSha256: createHash("sha256").update(promptText).digest("hex"),
    cases: cases.length,
    withImages: cases.filter((c) => c.imageDataUrl).length,
    repeat,
    tag: tag ?? null,
    pipeline: pipelineFilter ?? null,
    filter: filter ?? null,
    startedAt: new Date().toISOString(),
    node: process.version,
  };
  console.log(`▶ ${cfg.label}`);
  console.log(
    `  ${cases.length} cases (${meta.withImages} with images) × ${repeat} run(s), concurrency ${concurrency}${dry ? " (DRY RUN)" : ""}`,
  );

  const t0 = Date.now();
  let doneCount = 0;
  const runs = await pool(jobs, concurrency, async ({ c, run }) => {
    const r = cfg.engine === "legacy" ? await runLegacy(c, run) : await runV3(c, run);
    doneCount++;
    const flag = r.ok ? (r.passed === r.total ? "✓" : "~") : "✗";
    process.stdout.write(
      `  ${flag} ${String(doneCount).padStart(3)}/${jobs.length} ${c.id}${run > 1 ? `#${run}` : ""} ${r.ok ? `${r.passed}/${r.total} ${r.totalMs}ms` : `FAIL ${r.failureKind} ${(r.error ?? "").slice(0, 80)}`}\n`,
    );
    return r;
  });
  const wallMs = Date.now() - t0;
  const summary = summarize(runs);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = resolve(outDir, cfg.label);
  mkdirSync(dir, { recursive: true });
  const payload = {
    meta: { ...meta, wallMs, finishedAt: new Date().toISOString() },
    summary,
    runs,
  };
  writeFileSync(resolve(dir, `${stamp}.json`), JSON.stringify(payload, null, 2));
  writeFileSync(resolve(dir, "latest.json"), JSON.stringify(payload, null, 2));
  const md = renderMarkdown(meta, summary, runs, wallMs);
  writeFileSync(resolve(dir, `${stamp}.md`), md);
  console.log("\n" + md);
  console.log(`\nwrote ${resolve(dir, "latest.json")}`);
}

function renderMarkdown(
  meta: Record<string, unknown>,
  s: Summary,
  runs: CaseRun[],
  wallMs: number,
): string {
  const L: string[] = [];
  L.push(`# ${meta.label}`, "");
  L.push(
    `- engine: ${meta.engine}, prompt: ${meta.promptVersion} (sha256 ${String(meta.promptSha256).slice(0, 12)}…)`,
  );
  L.push(
    `- writer/model: ${meta.model} ${JSON.stringify(meta.requestParams)}; intent: ${meta.intentModel ?? "n/a"}; critic: ${meta.criticModel}`,
  );
  L.push(
    `- cases: ${meta.cases} (${meta.withImages} with images) × ${meta.repeat}, wall ${(wallMs / 1000).toFixed(1)}s`,
    "",
  );
  L.push("| metric | value |", "|---|---|");
  L.push(`| valid structured results | ${s.validResults}/${s.runs} (${s.validRate}) |`);
  L.push(`| failure kinds | ${JSON.stringify(s.failureKinds)} |`);
  L.push(
    `| deterministic checks | ${s.checksPassed}/${s.checksTotal} (${s.checkPassRate}); core ${s.coreCheckPassRate}; edge ${s.edgeCheckPassRate} |`,
  );
  L.push(`| cases with all checks passed | ${s.casesAllPassed}/${s.runs} |`);
  L.push(`| category accuracy (result) | ${s.categoryAccuracy} |`);
  L.push(`| intent checks (v3) | ${s.intentChecks} |`);
  L.push(`| reference-intent accuracy (v3) | ${s.referenceIntentAccuracy} |`);
  L.push(`| ratio checks (explicit + false-positive) | ${s.ratioChecks} |`);
  L.push(`| exact-text checks | ${s.textChecks} |`);
  L.push(`| page/panel/series counts | ${s.countChecks} |`);
  L.push(`| edit-preservation checks | ${s.editChecks} |`);
  L.push(`| factual-integrity checks | ${s.factualChecks} |`);
  L.push(`| efficiency / overprompting checks | ${s.efficiencyChecks} |`);
  L.push(`| critic checks | ${s.criticChecks} (mean score ${s.criticScoreMean ?? "n/a"}) |`);
  L.push(`| builder output length (mean words) | ${s.builderOutputWordsMean} |`);
  L.push(
    `| latency end-to-end mean / p50 / p95 | ${s.latencyMeanMs} / ${s.latencyP50Ms} / ${s.latencyP95Ms} ms |`,
  );
  L.push(`| intent stage mean | ${s.intentMeanMs} ms |`);
  L.push(
    `| writer/critic TTFT mean / p50 | ${s.ttftMeanMs ?? "n/a"} / ${s.ttftP50Ms ?? "n/a"} ms |`,
  );
  L.push(
    `| perceived first output (intent + TTFT) | ${s.perceivedFirstOutputMeanMs ?? "n/a"} ms |`,
  );
  L.push(
    `| tokens mean in / cached / out / reasoning | ${s.usageMean.input} / ${s.usageMean.cached} / ${s.usageMean.output} / ${s.usageMean.reasoning} |`,
  );
  L.push(
    `| est. cost per request (builder / critic) | $${s.costMeanBuilderUsd} / $${s.costMeanCriticUsd} |`,
  );
  L.push(`| est. cost per 1k / this run | $${s.costPer1kUsd} / $${s.costTotalUsd} |`, "");
  L.push(
    "| case | ok | checks | category | ref | score | intent+ttft / total | words | failed checks |",
    "|---|---|---|---|---|---|---|---|---|",
  );
  for (const r of runs) {
    const failed = r.checks
      .filter((k) => !k.pass)
      .map((k) => k.name + (k.detail ? ` (${k.detail})` : ""))
      .join("; ");
    const ref = (r.intent?.reference_intent as string) ?? "";
    L.push(
      `| ${r.id}${r.edge ? " *" : ""}${r.run > 1 ? `#${r.run}` : ""} | ${r.ok ? "✓" : `✗ ${r.failureKind}`} | ${r.passed}/${r.total} | ${r.category ?? ""} | ${ref} | ${r.score ?? ""} | ${r.intentMs}+${r.ttftMs ?? "-"} / ${r.totalMs}ms | ${r.outputWords} | ${failed || (r.error ? r.error.slice(0, 120) : "")} |`,
    );
  }
  L.push(
    "",
    "`*` = edge case encoding desired (post-migration) behavior; the legacy engine is expected to fail some.",
  );
  return L.join("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
