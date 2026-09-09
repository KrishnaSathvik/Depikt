/**
 * images-2-5-run.ts — generation runner for the staged Images 2.5 records.
 *
 * Runs OUTSIDE the product (Depikt does not generate images). Uses the
 * OpenAI Images API with gpt-image-2.5-flare / gpt-image-2.5-sunburst and
 * writes every attempt plus a JSON log under
 *   research/images-2-5-community/runs/<slug>/
 *
 * Usage:
 *   node scripts/images-2-5-run.ts setup <slug> [--model flare] [--quality medium]
 *       generate the record's setup image → runs/<slug>/setup.png
 *   node scripts/images-2-5-run.ts run <slug> [--model flare|sunburst] [--quality medium]
 *       [--refs a.png,b.png] [--prompt-file path] [--label note]
 *       run the record prompt; refs default to runs/<slug>/setup.png when the
 *       record needs a reference; "Turn N:" prompts run as a chain.
 *   node scripts/images-2-5-run.ts fixture <name> "<prompt>" [--size WxH] [--model flare] [--quality medium] [--refs ...]
 *       generate a reusable fixture → runs/_fixtures/<name>.png
 *
 * Needs OPENAI_API_KEY in .env.local (or .env).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { stagedImages25Prompts, type StagedPrompt } from "../src/data/images-2-5-staged.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RUNS = resolve(ROOT, "research/images-2-5-community/runs");

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
const [, , command, target, ...rest] = process.argv;
const flags: Record<string, string> = {};
const positional: string[] = [];
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a.startsWith("--")) {
    flags[a.slice(2)] = rest[i + 1] && !rest[i + 1].startsWith("--") ? rest[++i] : "true";
  } else positional.push(a);
}
const MODEL = `gpt-image-2.5-${flags.model ?? "flare"}`;
const QUALITY = flags.quality ?? "medium";

// ---------- sizes per record (multiples of 16, aspect per prompt) ----------
const SIZES: Record<string, string> = {
  "showa-travel-poster-exact-title": "1152x1536",
  "nine-poster-grid": "1152x1536",
  "sticker-pack-poster": "1024x1536",
  "national-park-stamp-sheet": "1536x1024",
  "historical-illustrated-poster-silk-road": "1152x1536",
  "architectural-minimalist-poster-pavilion": "1024x1536",
  "aurora-explainer-slide": "1536x864",
  "three-step-rag-infographic": "1536x864",
  "ticket-localization-edit": "1024x1536",
  "multi-turn-infographic-edits": "1024x1536",
  "change-outfit-only": "1152x1536",
  "change-background-only": "1152x1536",
  "add-glasses-preserve-eyes": "1024x1280",
  "move-one-object-recompute-light": "1536x1024",
  "product-scene-background-only": "1024x1280",
  "identity-clothing-merge": "1152x1536",
  "product-style-reference-ugc": "1024x1280",
  "four-image-role-merge": "1536x1024",
  "sketch-to-garden-plan-render": "1536x1024",
  "recompose-to-new-aspect-ratio": "1920x1088",
  "80s-portrait-identity-lock": "1024x1024",
  "watercolor-ink-fashion-illustration": "1152x1536",
  "impressionist-san-francisco": "1152x1536",
  "mosaic-earth-and-stars": "1536x864",
};
// Setup images sometimes need a different size than the final (the recompose test starts square).
const SETUP_SIZES: Record<string, string> = {
  "recompose-to-new-aspect-ratio": "1024x1024",
  "ticket-localization-edit": "1024x1536",
};

// ---------- API ----------
interface ImageResult {
  b64: string;
  usage?: unknown;
  ms: number;
}

async function generate(
  prompt: string,
  size: string,
  model = MODEL,
  quality = QUALITY,
): Promise<ImageResult> {
  const t0 = Date.now();
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, size, quality, n: 1, output_format: "png" }),
  });
  const json = (await res.json()) as {
    data?: Array<{ b64_json: string }>;
    usage?: unknown;
    error?: { message: string };
  };
  if (!res.ok || !json.data?.[0])
    throw new Error(`generate failed: ${json.error?.message ?? res.status}`);
  return { b64: json.data[0].b64_json, usage: json.usage, ms: Date.now() - t0 };
}

async function edit(
  prompt: string,
  images: string[],
  size: string,
  model = MODEL,
  quality = QUALITY,
): Promise<ImageResult> {
  const t0 = Date.now();
  const form = new FormData();
  form.set("model", model);
  form.set("prompt", prompt);
  form.set("size", size);
  form.set("quality", quality);
  form.set("n", "1");
  form.set("output_format", "png");
  for (const p of images) {
    const buf = readFileSync(p);
    form.append("image[]", new Blob([buf], { type: "image/png" }), basename(p));
  }
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

// ---------- logging ----------
interface LogEntry {
  at: string;
  kind: "setup" | "run" | "turn" | "fixture";
  attempt?: number;
  turn?: number;
  model: string;
  quality: string;
  size: string;
  refs: string[];
  prompt: string;
  file: string;
  ms: number;
  usage?: unknown;
  label?: string;
}
function appendLog(dir: string, entry: LogEntry) {
  const p = resolve(dir, "log.json");
  const arr: LogEntry[] = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : [];
  arr.push(entry);
  writeFileSync(p, JSON.stringify(arr, null, 2));
}
function nextAttempt(dir: string): number {
  const p = resolve(dir, "log.json");
  if (!existsSync(p)) return 1;
  const arr: LogEntry[] = JSON.parse(readFileSync(p, "utf8"));
  return arr.filter((e) => e.kind === "run").length + 1;
}
function save(dir: string, name: string, b64: string): string {
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, name);
  writeFileSync(file, Buffer.from(b64, "base64"));
  return file;
}
function rel(p: string) {
  return p.replace(ROOT + "/", "");
}

function findRecord(key: string): StagedPrompt {
  const r = stagedImages25Prompts.find(
    (p) => p.slug === key || p.id === key || p.id === `images25-${key}`,
  );
  if (!r) throw new Error(`no staged record for ${key}`);
  return r;
}

// ---------- commands ----------
async function cmdSetup(key: string) {
  const r = findRecord(key);
  if (!r.setup_prompt) throw new Error(`${r.slug} has no setup_prompt`);
  const dir = resolve(RUNS, r.slug);
  const size = SETUP_SIZES[r.slug] ?? SIZES[r.slug];
  const out = await generate(r.setup_prompt, size);
  const file = save(dir, "setup.png", out.b64);
  appendLog(dir, {
    at: new Date().toISOString(),
    kind: "setup",
    model: MODEL,
    quality: QUALITY,
    size,
    refs: [],
    prompt: r.setup_prompt,
    file: rel(file),
    ms: out.ms,
    usage: out.usage,
  });
  console.log(`setup → ${rel(file)} (${out.ms} ms)`);
}

async function cmdRun(key: string) {
  const r = findRecord(key);
  const dir = resolve(RUNS, r.slug);
  mkdirSync(dir, { recursive: true });
  const size = flags.size ?? SIZES[r.slug];
  const prompt = flags["prompt-file"]
    ? readFileSync(resolve(ROOT, flags["prompt-file"]), "utf8").trim()
    : r.prompt;
  let refs: string[] = [];
  if (flags.refs) refs = flags.refs.split(",").map((p) => resolve(ROOT, p.trim()));
  else if (r.needs_reference_images && existsSync(resolve(dir, "setup.png")))
    refs = [resolve(dir, "setup.png")];
  if (r.needs_reference_images && refs.length === 0)
    throw new Error(`${r.slug} needs references; pass --refs or run setup`);
  const attempt = nextAttempt(dir);
  const label = flags.label;

  // Multi-turn chain: lines beginning "Turn N:".
  const turns = prompt
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^Turn \d+:/.test(l));
  if (turns.length > 1) {
    let current = refs;
    for (let i = 0; i < turns.length; i++) {
      const text = turns[i].replace(/^Turn \d+:\s*/, "");
      const out = await edit(text, current, size);
      const file = save(dir, `attempt-${attempt}-turn-${i + 1}.png`, out.b64);
      appendLog(dir, {
        at: new Date().toISOString(),
        kind: "turn",
        attempt,
        turn: i + 1,
        model: MODEL,
        quality: QUALITY,
        size,
        refs: current.map(rel),
        prompt: text,
        file: rel(file),
        ms: out.ms,
        usage: out.usage,
        label,
      });
      console.log(`attempt ${attempt} turn ${i + 1} → ${rel(file)} (${out.ms} ms)`);
      current = [file];
    }
    appendLog(dir, {
      at: new Date().toISOString(),
      kind: "run",
      attempt,
      model: MODEL,
      quality: QUALITY,
      size,
      refs: refs.map(rel),
      prompt,
      file: rel(current[0]),
      ms: 0,
      label: `${label ?? ""} chain of ${turns.length}`.trim(),
    });
    return;
  }

  const out = refs.length ? await edit(prompt, refs, size) : await generate(prompt, size);
  const file = save(dir, `attempt-${attempt}.png`, out.b64);
  appendLog(dir, {
    at: new Date().toISOString(),
    kind: "run",
    attempt,
    model: MODEL,
    quality: QUALITY,
    size,
    refs: refs.map(rel),
    prompt,
    file: rel(file),
    ms: out.ms,
    usage: out.usage,
    label,
  });
  console.log(`attempt ${attempt} → ${rel(file)} (${MODEL} ${QUALITY}, ${out.ms} ms)`);
}

async function cmdFixture(name: string, prompt: string) {
  const dir = resolve(RUNS, "_fixtures");
  const size = flags.size ?? "1024x1024";
  const refs = flags.refs ? flags.refs.split(",").map((p) => resolve(ROOT, p.trim())) : [];
  const out = refs.length ? await edit(prompt, refs, size) : await generate(prompt, size);
  const file = save(dir, `${name}.png`, out.b64);
  appendLog(dir, {
    at: new Date().toISOString(),
    kind: "fixture",
    model: MODEL,
    quality: QUALITY,
    size,
    refs: refs.map(rel),
    prompt,
    file: rel(file),
    ms: out.ms,
    usage: out.usage,
    label: name,
  });
  console.log(`fixture ${name} → ${rel(file)} (${out.ms} ms)`);
}

const main = async () => {
  if (command === "setup") return cmdSetup(target);
  if (command === "run") return cmdRun(target);
  if (command === "fixture") return cmdFixture(target, positional[0]);
  throw new Error("usage: setup <slug> | run <slug> | fixture <name> <prompt>");
};
main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
