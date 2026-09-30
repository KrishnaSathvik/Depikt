import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

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

const supabase = createClient(
  env.SUPABASE_URL || env.VITE_SUPABASE_URL,
  env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

// Check total count
const { count } = await supabase
  .from("curated_prompts")
  .select("id", { count: "exact", head: true });

console.log("Total prompts in DB:", count);

// Check batch 5 specifically
const batch5Ids = [
  "curated-deconstructed-portrait-collage",
  "curated-choreography-sheet-infographic",
  "curated-uk-citizenship-card",
  "curated-jinx-arcane-poster",
  "curated-aot-eren-poster",
  "curated-business-leader-ink-portrait",
  "curated-instagram-breakout-3d",
  "curated-time-magazine-cover",
  "curated-luxury-skincare-ad",
  "curated-snack-brand-identity-system",
  "curated-imperial-anime-flame-character",
  "curated-printmaking-pastel-poster",
  "curated-convenience-store-storyboard",
  "curated-anime-pop-art-conversion",
  "curated-doodle-chibi-aesthetic",
  "curated-netflix-homepage-hero",
  "curated-character-breakdown-knolling",
  "curated-life-path-decoder",
  "curated-soul-purpose-discoverer",
  "curated-career-destiny-detector",
  "curated-relationship-destiny-map",
  "curated-wealth-abundance-code",
  "curated-future-timeline-guide",
];

const { data, error } = await supabase
  .from("curated_prompts")
  .select("id, title, thumbnail_url, created_at")
  .in("id", batch5Ids)
  .order("created_at", { ascending: false });

if (error) {
  console.error("Error:", error);
} else {
  console.log(`\nBatch 5 prompts found in DB: ${data.length} / ${batch5Ids.length}`);
  if (data.length > 0) {
    data.forEach((p) => console.log("  ✓", p.id, "|", p.created_at, "| thumb:", !!p.thumbnail_url));
  }
  const foundIds = new Set(data.map((p) => p.id));
  const missing = batch5Ids.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    console.log("\nMissing from DB:");
    missing.forEach((id) => console.log("  ✗", id));
  }
}
