import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import OpenAI from "openai";
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

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const supabase = createClient(
  env.SUPABASE_URL || env.VITE_SUPABASE_URL,
  env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

const prompt =
  "A dramatic movie montage collage showing 6 scenes of an original armored space warrior with a glowing blue energy shield. Scenes include: flying through an asteroid field, standing atop a futuristic tower, deflecting laser beams, a portrait shot with glowing visor, a silhouette against a purple nebula, and a wide shot overlooking an alien landscape. Cinematic blockbuster style with deep blues and warm oranges, high contrast dramatic lighting. Each scene in its own panel arranged in a 2x3 grid.";

async function main() {
  process.stdout.write("Generating curated-superman-collage... ");
  const response = await openai.images.generate({
    model: "gpt-image-2",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "medium",
  });
  const image = response.data[0];
  const raw = image.b64_json
    ? Buffer.from(image.b64_json, "base64")
    : Buffer.from(await (await fetch(image.url)).arrayBuffer());
  const webp = await sharp(raw).resize(400).webp({ quality: 80 }).toBuffer();
  writeFileSync(resolve(__dirname, "thumbnails/curated-superman-collage.webp"), webp);

  const { error: upErr } = await supabase.storage
    .from("prompt-thumbnails")
    .upload("curated-superman-collage.webp", webp, {
      contentType: "image/webp",
      upsert: true,
    });
  if (upErr) throw new Error("Upload: " + upErr.message);

  const { data } = supabase.storage
    .from("prompt-thumbnails")
    .getPublicUrl("curated-superman-collage.webp");
  const { error: dbErr } = await supabase
    .from("curated_prompts")
    .update({ thumbnail_url: data.publicUrl })
    .eq("id", "curated-superman-collage");
  if (dbErr) throw new Error("DB: " + dbErr.message);

  console.log(`OK (${(webp.length / 1024).toFixed(0)}KB)`);
}

main().catch((e) => {
  console.log("FAILED: " + e.message);
  process.exit(1);
});
