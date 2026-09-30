/**
 * retry-failed.mjs
 * Re-uploads 2 timed-out thumbnails and regenerates 3 safety-filtered ones with sanitized prompts.
 * Usage: node scripts/retry-failed.mjs
 */

import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(__dirname, "thumbnails");

// Load .env
const envFile = readFileSync(resolve(ROOT, ".env"), "utf8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const eq = l.indexOf("=");
      return [l.slice(0, eq), l.slice(eq + 1).replace(/^["']|["']$/g, "")];
    }),
);

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const supabase = createClient(
  env.SUPABASE_URL || env.VITE_SUPABASE_URL,
  env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

// ─── Sanitized prompts for safety-filtered items ─────────────────────────────

const REGENERATE = [
  {
    id: "curated-tv-character-diagram",
    // Original referenced "Breaking Bad" — use a generic fictional drama instead
    prompt:
      "A detailed character relationship diagram for a fictional TV crime drama. Clean white background with circular character portraits connected by labeled relationship lines (ally, rival, mentor, betrayal). Use a muted color palette with earth tones. Include 8-10 characters arranged in a radial layout with a central protagonist. Each portrait is a simple illustrated avatar. Typography: clean sans-serif labels. Style: editorial infographic.",
  },
  {
    id: "curated-minimal-design-collection",
    // Original had brand names including one flagged — use generic design objects
    prompt:
      "A grid of 9 minimalist product design mockups on a pure white background. Include: a matte black speaker, a white ceramic mug, a glass water bottle, a wooden desk lamp, a leather notebook, a concrete planter, a brass pen holder, a linen tote bag, and a walnut phone stand. Each item photographed from a 3/4 angle with soft diffused lighting. Ultra-clean, Dieter Rams inspired aesthetic. No text, no logos.",
  },
  {
    id: "curated-superman-collage",
    // Original referenced a specific superhero IP — use generic sci-fi hero
    prompt:
      "A cinematic movie montage collage of a fictional sci-fi hero in a flowing red cape against a futuristic cityscape. The collage includes 6 different dramatic scenes: hero flying through clouds, standing on a rooftop at sunset, rescuing civilians from a burning building, facing a storm, a close-up portrait with determined expression, and a wide shot of the hero silhouetted against a giant moon. Blockbuster movie poster style, dramatic lighting, rich saturated colors.",
  },
];

// ─── Re-upload IDs (files already exist locally) ─────────────────────────────

const REUPLOAD = ["curated-cyberpunk-angel-megacity", "example-openended-abstract"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function generateImage(prompt) {
  const response = await openai.images.generate({
    model: "gpt-image-2",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "medium",
  });
  const image = response.data[0];
  if (image.b64_json) return Buffer.from(image.b64_json, "base64");
  const res = await fetch(image.url);
  return Buffer.from(await res.arrayBuffer());
}

async function resizeToWebP(buffer) {
  return sharp(buffer).resize(400).webp({ quality: 80 }).toBuffer();
}

async function uploadToSupabase(id, webpBuffer) {
  const path = `${id}.webp`;
  const { error } = await supabase.storage
    .from("prompt-thumbnails")
    .upload(path, webpBuffer, { contentType: "image/webp", upsert: true });
  if (error) throw new Error(`Upload failed for ${id}: ${error.message}`);
  const { data } = supabase.storage.from("prompt-thumbnails").getPublicUrl(path);
  return data.publicUrl;
}

async function updatePromptUrl(id, url) {
  const { error } = await supabase
    .from("curated_prompts")
    .update({ thumbnail_url: url })
    .eq("id", id);
  if (error) throw new Error(`DB update failed for ${id}: ${error.message}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== RETRY: Re-uploading 2 timed-out thumbnails ===\n");

  for (const id of REUPLOAD) {
    const filePath = resolve(OUT_DIR, `${id}.webp`);
    if (!existsSync(filePath)) {
      console.log(`  ${id}: LOCAL FILE MISSING, skipping`);
      continue;
    }
    process.stdout.write(`  ${id}... `);
    try {
      const buffer = readFileSync(filePath);
      const url = await uploadToSupabase(id, buffer);
      await updatePromptUrl(id, url);
      console.log("OK");
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }

  console.log("\n=== RETRY: Regenerating 3 safety-filtered thumbnails ===\n");

  for (const { id, prompt } of REGENERATE) {
    const outPath = resolve(OUT_DIR, `${id}.webp`);
    process.stdout.write(`  ${id}... `);
    try {
      const raw = await generateImage(prompt);
      const webp = await resizeToWebP(raw);
      writeFileSync(outPath, webp);
      const url = await uploadToSupabase(id, webp);
      await updatePromptUrl(id, url);
      console.log(`OK (${(webp.length / 1024).toFixed(0)}KB)`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
    // Rate limit pause
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
