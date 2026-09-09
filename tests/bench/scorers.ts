// Deterministic scorers for benchmark cases. Each check is independent and
// reports pass/fail plus a short detail so failures are diagnosable.

export interface IntentExpectation {
  task?: string;
  category?: string;
  category_any?: string[];
  reference_intent?: string;
  reference_intent_any?: string[];
  aspect_ratio_value?: string;
  /** Expect no ratio at all (value null / source none). */
  aspect_ratio_none?: boolean;
  transparent_background?: boolean;
  series_count?: number;
  series_unit?: string;
  series_continuation?: boolean;
  placeholders_required?: boolean;
  exact_text_includes?: string[];
}

export interface Expectation {
  category?: string;
  category_any?: string[];
  ratio?: string;
  must_contain?: string[];
  must_contain_any?: string[];
  must_not_contain?: string[];
  must_match?: string[];
  must_not_match?: string[];
  page_count?: number;
  panel_count?: number;
  /** Max words in the primary text (overprompting guard). */
  max_words?: number;
  score_range?: [number, number];
  /** Regex matched against weaknesses + improvements (critic). */
  feedback_match?: string[];
  rewritten_must_contain?: string[];
  rewritten_must_not_contain?: string[];
  /** Critic: rewritten prompt must be shorter than the input (overprompting). */
  rewritten_shorter?: boolean;
  /** Critic v3: dimensions expected non-applicable. */
  not_applicable?: string[];
  /** Critic v3: dimensions expected applicable. */
  applicable?: string[];
  /** Critic v3: per-dimension score ranges. */
  dimension_range?: Record<string, [number, number]>;
  /** v3 only: checks on the intent object. */
  intent?: IntentExpectation;
}

export interface BenchCase {
  id: string;
  group: string;
  input: string;
  tags?: string[];
  /** Desired-behavior case that v2.9 is expected to fail. Reported separately. */
  edge?: boolean;
  /** Fixture image path relative to tests/bench/ (e.g. "fixtures/x.png"). */
  image?: string;
  /** Explicit UI reference-intent override to send. */
  referenceIntent?: string;
  /** Remix reference prompt to send. */
  remixRef?: string;
  expect: Expectation;
}

export interface CheckResult {
  name: string;
  pass: boolean;
  /** Which family the check belongs to, for aggregate metrics. */
  family:
    | "category"
    | "ratio"
    | "text"
    | "count"
    | "edit"
    | "factual"
    | "efficiency"
    | "critic"
    | "intent"
    | "reference"
    | "other";
  detail?: string;
}

interface ResultLike {
  prompt?: string;
  prompts?: string[];
  category?: string;
  score?: number | null;
  overall_score?: number | null;
  weaknesses?: string[];
  improvements?: string[];
  rewritten_prompt?: string;
  dimensions?: Array<{ id: string; applicable: boolean; score: number | null }>;
  intent?: Record<string, unknown>;
}

/** The main text a case's text checks run against. */
export function primaryText(pipeline: "builder" | "critic", r: ResultLike): string {
  if (pipeline === "critic") return r.rewritten_prompt ?? "";
  if (typeof r.prompt === "string") return r.prompt;
  if (Array.isArray(r.prompts)) return r.prompts.join("\n\n");
  return "";
}

function norm(s: string): string {
  return s.toLowerCase();
}

export function countPages(text: string): number {
  const nums = new Set<number>();
  for (const m of text.matchAll(/\b(?:PAGE|SLIDE)\s+(\d{1,3})\b/gi)) nums.add(Number(m[1]));
  return nums.size;
}

export function countPanels(text: string): number {
  const nums = new Set<number>();
  for (const m of text.matchAll(/\bPanel\s+(\d{1,3})\b/gi)) nums.add(Number(m[1]));
  return nums.size;
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function familyForName(name: string): CheckResult["family"] {
  if (
    name.startsWith("contains:PRESERVE") ||
    name.startsWith("contains:CHANGE") ||
    name.startsWith("contains:MATCH") ||
    name === "contains_any:preserve"
  )
    return "edit";
  if (name.startsWith("contains:") || name.startsWith("match:") || name.startsWith("contains_any"))
    return "text";
  return "other";
}

export function scoreCase(
  pipeline: "builder" | "critic",
  c: BenchCase,
  result: ResultLike | null,
  engine: "legacy" | "v3",
): CheckResult[] {
  const out: CheckResult[] = [];
  const e = c.expect;
  if (!result) {
    out.push({ name: "result", pass: false, family: "other", detail: "no valid result" });
    return out;
  }
  const text = primaryText(pipeline, result);
  const ntext = norm(text);

  if (e.category)
    out.push({
      name: "category",
      pass: result.category === e.category,
      family: "category",
      detail: `got ${result.category}`,
    });
  if (e.category_any)
    out.push({
      name: "category_any",
      pass: e.category_any.includes(result.category ?? ""),
      family: "category",
      detail: `got ${result.category}`,
    });
  if (e.ratio)
    out.push({
      name: "ratio",
      pass: text.includes(e.ratio),
      family: "ratio",
      detail: `expect ${e.ratio}`,
    });
  for (const s of e.must_contain ?? [])
    out.push({
      name: `contains:${s}`,
      pass: ntext.includes(norm(s)),
      family: familyForName(`contains:${s}`),
    });
  if (e.must_contain_any)
    out.push({
      name: "contains_any",
      pass: e.must_contain_any.some((s) => ntext.includes(norm(s))),
      family: "text",
      detail: e.must_contain_any.join("|"),
    });
  for (const s of e.must_not_contain ?? []) {
    const fam: CheckResult["family"] = /^\d{1,2}(\.\d+)?:\d{1,2}$/.test(s)
      ? "ratio"
      : /^--/.test(s)
        ? "efficiency"
        : "text";
    out.push({ name: `not_contains:${s}`, pass: !ntext.includes(norm(s)), family: fam });
  }
  for (const re of e.must_match ?? [])
    out.push({
      name: `match:${re}`,
      pass: new RegExp(re, "i").test(text),
      family: familyForName(`match:${re}`),
    });
  for (const re of e.must_not_match ?? [])
    out.push({
      name: `not_match:${re}`,
      pass: !new RegExp(re, "i").test(text),
      family: "efficiency",
    });
  if (e.page_count !== undefined) {
    const n = countPages(text);
    out.push({ name: "page_count", pass: n === e.page_count, family: "count", detail: `got ${n}` });
  }
  if (e.panel_count !== undefined) {
    const n = countPanels(text);
    out.push({
      name: "panel_count",
      pass: n === e.panel_count,
      family: "count",
      detail: `got ${n}`,
    });
  }
  if (e.max_words !== undefined) {
    const n = wordCount(text);
    out.push({
      name: "max_words",
      pass: n <= e.max_words,
      family: "efficiency",
      detail: `${n} words`,
    });
  }

  // ---- critic ----
  const overall =
    typeof result.overall_score === "number"
      ? result.overall_score
      : typeof result.score === "number"
        ? result.score
        : NaN;
  if (e.score_range)
    out.push({
      name: "score_range",
      pass: overall >= e.score_range[0] && overall <= e.score_range[1],
      family: "critic",
      detail: `got ${overall}`,
    });
  if (e.feedback_match) {
    const fb = [...(result.weaknesses ?? []), ...(result.improvements ?? [])].join("\n");
    for (const re of e.feedback_match)
      out.push({
        name: `feedback:${re.slice(0, 30)}`,
        pass: new RegExp(re, "i").test(fb),
        family: "critic",
      });
  }
  const rw = norm(result.rewritten_prompt ?? "");
  for (const s of e.rewritten_must_contain ?? [])
    out.push({
      name: `rewritten_contains:${s}`,
      pass: rw.includes(norm(s)),
      family: s === "PRESERVE" || s === "CHANGE" ? "edit" : "text",
    });
  for (const s of e.rewritten_must_not_contain ?? [])
    out.push({
      name: `rewritten_not_contains:${s}`,
      pass: !rw.includes(norm(s)),
      family: "efficiency",
    });
  if (e.rewritten_shorter) {
    const a = wordCount(c.input);
    const b = wordCount(result.rewritten_prompt ?? "");
    out.push({
      name: "rewritten_shorter",
      pass: b < a,
      family: "efficiency",
      detail: `${a} → ${b} words`,
    });
  }
  if (engine === "v3" && pipeline === "critic") {
    const dims = new Map((result.dimensions ?? []).map((d) => [d.id, d]));
    for (const id of e.not_applicable ?? []) {
      const d = dims.get(id);
      out.push({
        name: `n/a:${id}`,
        pass: !!d && !d.applicable,
        family: "critic",
        detail: d ? `applicable=${d.applicable}` : "missing",
      });
    }
    for (const id of e.applicable ?? []) {
      const d = dims.get(id);
      out.push({
        name: `applicable:${id}`,
        pass: !!d && d.applicable && typeof d.score === "number",
        family: "critic",
      });
    }
    for (const [id, [lo, hi]] of Object.entries(e.dimension_range ?? {})) {
      const d = dims.get(id);
      const s = d && typeof d.score === "number" ? d.score : NaN;
      out.push({
        name: `dim:${id}`,
        pass: s >= lo && s <= hi,
        family: "critic",
        detail: `got ${s}`,
      });
    }
  }

  // ---- intent (v3 only) ----
  if (engine === "v3" && e.intent) {
    const it = (result.intent ?? {}) as Record<string, unknown>;
    const ar = (it.aspect_ratio ?? {}) as { value?: string | null; source?: string };
    const series = (it.series ?? {}) as {
      count?: number | null;
      unit?: string | null;
      continuation?: boolean;
    };
    const fr = (it.factual_requirements ?? {}) as { placeholders_required?: boolean };
    const et = (it.exact_text ?? []) as Array<{ text: string }>;
    const x = e.intent;
    if (x.task)
      out.push({
        name: "intent.task",
        pass: it.task === x.task,
        family: "intent",
        detail: `got ${it.task}`,
      });
    if (x.category)
      out.push({
        name: "intent.category",
        pass: it.category === x.category,
        family: "intent",
        detail: `got ${it.category}`,
      });
    if (x.category_any)
      out.push({
        name: "intent.category_any",
        pass: x.category_any.includes(String(it.category)),
        family: "intent",
        detail: `got ${it.category}`,
      });
    if (x.reference_intent)
      out.push({
        name: "intent.reference",
        pass: it.reference_intent === x.reference_intent,
        family: "reference",
        detail: `got ${it.reference_intent}`,
      });
    if (x.reference_intent_any)
      out.push({
        name: "intent.reference_any",
        pass: x.reference_intent_any.includes(String(it.reference_intent)),
        family: "reference",
        detail: `got ${it.reference_intent}`,
      });
    if (x.aspect_ratio_value)
      out.push({
        name: "intent.ratio",
        pass: ar.value === x.aspect_ratio_value,
        family: "ratio",
        detail: `got ${ar.value}`,
      });
    if (x.aspect_ratio_none)
      out.push({
        name: "intent.ratio_none",
        pass: ar.value === null || ar.value === undefined,
        family: "ratio",
        detail: `got ${ar.value} (${ar.source})`,
      });
    if (x.transparent_background !== undefined)
      out.push({
        name: "intent.transparent",
        pass: it.transparent_background === x.transparent_background,
        family: "intent",
        detail: `got ${it.transparent_background}`,
      });
    if (x.series_count !== undefined)
      out.push({
        name: "intent.series_count",
        pass: series.count === x.series_count,
        family: "count",
        detail: `got ${series.count}`,
      });
    if (x.series_unit)
      out.push({
        name: "intent.series_unit",
        pass: series.unit === x.series_unit,
        family: "count",
        detail: `got ${series.unit}`,
      });
    if (x.series_continuation !== undefined)
      out.push({
        name: "intent.series_continuation",
        pass: series.continuation === x.series_continuation,
        family: "intent",
        detail: `got ${series.continuation}`,
      });
    if (x.placeholders_required !== undefined)
      out.push({
        name: "intent.placeholders",
        pass: fr.placeholders_required === x.placeholders_required,
        family: "factual",
        detail: `got ${fr.placeholders_required}`,
      });
    for (const t of x.exact_text_includes ?? [])
      out.push({
        name: `intent.text:${t}`,
        pass: et.some((s) => s.text.includes(t)),
        family: "text",
      });
  }
  return out;
}
