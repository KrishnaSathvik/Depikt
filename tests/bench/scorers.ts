// Deterministic scorers for benchmark cases. Each check is independent and
// reports pass/fail plus a short detail so failures are diagnosable.

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
  score_range?: [number, number];
  /** Regex matched against weaknesses + improvements (critic). */
  feedback_match?: string[];
  rewritten_must_contain?: string[];
  rewritten_must_not_contain?: string[];
}

export interface BenchCase {
  id: string;
  group: string;
  input: string;
  tags?: string[];
  /** Desired-behavior case that v2.9 is expected to fail. Reported separately. */
  edge?: boolean;
  expect: Expectation;
}

export interface CheckResult {
  name: string;
  pass: boolean;
  detail?: string;
}

interface ResultLike {
  prompt?: string;
  prompts?: string[];
  category?: string;
  score?: number;
  weaknesses?: string[];
  improvements?: string[];
  rewritten_prompt?: string;
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

/** Count distinct "PAGE N" blocks (multi-page storyboards). */
export function countPages(text: string): number {
  const nums = new Set<number>();
  for (const m of text.matchAll(/\bPAGE\s+(\d{1,3})\b/gi)) nums.add(Number(m[1]));
  return nums.size;
}

/** Count distinct "Panel N" blocks (single-page multi-panel). */
export function countPanels(text: string): number {
  const nums = new Set<number>();
  for (const m of text.matchAll(/\bPanel\s+(\d{1,3})\b/gi)) nums.add(Number(m[1]));
  return nums.size;
}

export function scoreCase(
  pipeline: "builder" | "critic",
  c: BenchCase,
  result: ResultLike | null,
): CheckResult[] {
  const out: CheckResult[] = [];
  const e = c.expect;
  if (!result) {
    out.push({ name: "result", pass: false, detail: "no valid result" });
    return out;
  }
  const text = primaryText(pipeline, result);
  const ntext = norm(text);

  if (e.category)
    out.push({
      name: "category",
      pass: result.category === e.category,
      detail: `got ${result.category}`,
    });
  if (e.category_any)
    out.push({
      name: "category_any",
      pass: e.category_any.includes(result.category ?? ""),
      detail: `got ${result.category}`,
    });
  if (e.ratio)
    out.push({ name: "ratio", pass: text.includes(e.ratio), detail: `expect ${e.ratio}` });
  for (const s of e.must_contain ?? [])
    out.push({ name: `contains:${s}`, pass: ntext.includes(norm(s)) });
  if (e.must_contain_any)
    out.push({
      name: "contains_any",
      pass: e.must_contain_any.some((s) => ntext.includes(norm(s))),
      detail: e.must_contain_any.join("|"),
    });
  for (const s of e.must_not_contain ?? [])
    out.push({ name: `not_contains:${s}`, pass: !ntext.includes(norm(s)) });
  for (const re of e.must_match ?? [])
    out.push({ name: `match:${re}`, pass: new RegExp(re, "i").test(text) });
  for (const re of e.must_not_match ?? [])
    out.push({ name: `not_match:${re}`, pass: !new RegExp(re, "i").test(text) });
  if (e.page_count !== undefined) {
    const n = countPages(text);
    out.push({ name: "page_count", pass: n === e.page_count, detail: `got ${n}` });
  }
  if (e.panel_count !== undefined) {
    const n = countPanels(text);
    out.push({ name: "panel_count", pass: n === e.panel_count, detail: `got ${n}` });
  }
  if (e.score_range) {
    const s = typeof result.score === "number" ? result.score : NaN;
    out.push({
      name: "score_range",
      pass: s >= e.score_range[0] && s <= e.score_range[1],
      detail: `got ${s}`,
    });
  }
  if (e.feedback_match) {
    const fb = [...(result.weaknesses ?? []), ...(result.improvements ?? [])].join("\n");
    for (const re of e.feedback_match)
      out.push({ name: `feedback:${re.slice(0, 30)}`, pass: new RegExp(re, "i").test(fb) });
  }
  const rw = norm(result.rewritten_prompt ?? "");
  for (const s of e.rewritten_must_contain ?? [])
    out.push({ name: `rewritten_contains:${s}`, pass: rw.includes(norm(s)) });
  for (const s of e.rewritten_must_not_contain ?? [])
    out.push({ name: `rewritten_not_contains:${s}`, pass: !rw.includes(norm(s)) });
  return out;
}
