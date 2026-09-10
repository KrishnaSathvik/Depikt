/**
 * og-images-run.ts — generates the six route-level OG cards for Depikt.
 *
 * Runs OUTSIDE the product (Depikt does not generate images). Prompts live in
 * research/og-images/depikt-og-prompts.md (shared block + one block per route)
 * and public/logo.png is the only reference image. Every raw attempt is kept
 * under research/og-images/runs/ (git-ignored); the approved 1200×630 crop is
 * written to public/og/<file>.
 *
 * Usage:
 *   node scripts/og-images-run.ts all
 *   node scripts/og-images-run.ts home|library|builder|critic|gallery|blog [--model sunburst] [--quality high] [--no-publish]
 *
 * Needs OPENAI_API_KEY in .env.local (or .env). Post-processing uses macOS `sips`.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { OG_ROUTE_IMAGES, type OgRouteKey } from "../src/lib/og-routes.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROMPTS = resolve(ROOT, "research/og-images/depikt-og-prompts.md");
const RUNS = resolve(ROOT, "research/og-images/runs");
const LOGO = resolve(ROOT, "public/logo.png");
const GEN_SIZE = "1536x864"; // 16:9, multiples of 16
const CROP_H = 806; // 1536 / 1.905 → same ratio as 1200×630

// ---------- env (.env.local wins over .env; both git-ignored) ----------
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
const API_KEY = process.env.OPENAI_API_KEY ?? env.OPENAI_API_KEY;
if (!API_KEY) throw new Error("OPENAI_API_KEY missing: add it to .env.local or .env");

// ---------- args ----------
const [, , target, ...rest] = process.argv;
const flags: Record<string, string> = {};
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a.startsWith("--"))
    flags[a.slice(2)] = rest[i + 1] && !rest[i + 1].startsWith("--") ? rest[++i] : "true";
}
const MODEL = `gpt-image-2.5-${flags.model ?? "sunburst"}`;
const QUALITY = flags.quality ?? "high";
const PUBLISH = flags["no-publish"] !== "true";

// ---------- prompts ----------
const SECTION_TITLES: Record<OgRouteKey, string> = {
  home: "## 1. Home",
  library: "## 2. Library",
  prompt: "## 3. Prompt",
  templates: "## 4. Templates",
  gallery: "## 5. Gallery",
  blog: "## 6. Blog",
  mcp: "## 7. MCP",
};

function codeBlockAfter(md: string, heading: string): string {
  const at = md.indexOf(heading);
  if (at < 0) throw new Error(`heading not found: ${heading}`);
  const start = md.indexOf("```text", at);
  const end = md.indexOf("```", start + 7);
  if (start < 0 || end < 0) throw new Error(`code block missing under ${heading}`);
  return md.slice(start + 7, end).trim();
}

export function buildPrompt(key: OgRouteKey, md = readFileSync(PROMPTS, "utf8")): string {
  return `${codeBlockAfter(md, "## Shared block")}\n\n${codeBlockAfter(md, SECTION_TITLES[key])}`;
}

// ---------- api ----------
async function edit(prompt: string): Promise<{ b64: string; ms: number; usage?: unknown }> {
  const t0 = Date.now();
  const form = new FormData();
  form.set("model", MODEL);
  form.set("prompt", prompt);
  form.set("size", GEN_SIZE);
  form.set("quality", QUALITY);
  form.set("n", "1");
  form.set("output_format", "png");
  form.append("image[]", new Blob([readFileSync(LOGO)], { type: "image/png" }), "logo.png");
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: form,
  });
  const json = (await res.json()) as {
    data?: Array<{ b64_json: string }>;
    usage?: unknown;
    error?: { message: string };
  };
  if (!res.ok || !json.data?.[0])
    throw new Error(`edit failed: ${json.error?.message ?? res.status}`);
  return { b64: json.data[0].b64_json, usage: json.usage, ms: Date.now() - t0 };
}

// ---------- post-process: center crop to 1.905:1, resize to 1200×630 ----------
function toOg(raw: string, out: string) {
  const tmp = `${out}.crop.png`;
  execFileSync("sips", ["-c", String(CROP_H), "1536", raw, "--out", tmp], { stdio: "ignore" });
  execFileSync("sips", ["-z", "630", "1200", tmp, "--out", out], { stdio: "ignore" });
  execFileSync("rm", [tmp]);
}

async function runOne(key: OgRouteKey) {
  mkdirSync(RUNS, { recursive: true });
  const prompt = buildPrompt(key);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const raw = resolve(RUNS, `${key}-${stamp}.png`);
  const out = resolve(RUNS, `${key}-${stamp}-1200x630.png`);
  console.log(`${key}: ${MODEL} ${QUALITY} ${GEN_SIZE} …`);
  const res = await edit(prompt);
  writeFileSync(raw, Buffer.from(res.b64, "base64"));
  toOg(raw, out);
  const logPath = resolve(RUNS, "log.json");
  const log = existsSync(logPath) ? JSON.parse(readFileSync(logPath, "utf8")) : [];
  log.push({
    at: new Date().toISOString(),
    key,
    model: MODEL,
    quality: QUALITY,
    size: GEN_SIZE,
    raw,
    out,
    ms: res.ms,
    usage: res.usage,
    prompt,
  });
  writeFileSync(logPath, JSON.stringify(log, null, 2));
  if (PUBLISH) {
    const dest = resolve(ROOT, "public", OG_ROUTE_IMAGES[key].replace(/^\//, ""));
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(out));
    console.log(`${key} → ${OG_ROUTE_IMAGES[key]} (${res.ms} ms)`);
  } else console.log(`${key} → ${out} (${res.ms} ms, not published)`);
}

async function main() {
  const keys = Object.keys(OG_ROUTE_IMAGES) as OgRouteKey[];
  if (!target || (target !== "all" && !keys.includes(target as OgRouteKey)))
    throw new Error(`usage: og-images-run.ts all|${keys.join("|")}`);
  for (const k of target === "all" ? keys : [target as OgRouteKey]) await runOne(k);
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
