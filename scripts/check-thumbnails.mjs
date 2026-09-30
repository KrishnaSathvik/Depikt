import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

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
  env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

const { data, error } = await supabase.from("curated_prompts").select("id, thumbnail_url");
if (error) {
  console.error(error);
  process.exit(1);
}

const withThumb = data.filter((p) => p.thumbnail_url);
const withoutThumb = data.filter((p) => !p.thumbnail_url);

console.log("Total:", data.length);
console.log("With thumbnail_url:", withThumb.length);
console.log("Without thumbnail_url:", withoutThumb.length);
if (withoutThumb.length > 0) {
  console.log("\nMissing thumbnails:");
  withoutThumb.forEach((p) => console.log(" ", p.id));
}
