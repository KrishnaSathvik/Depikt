// Explicit one-time authoring command. Never imported by benchmark runners.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
const manifestPath = "tests/image-evals/vnext-3/manifest.json";
if (existsSync(manifestPath) && JSON.parse(readFileSync(manifestPath, "utf8")).approval) {
  throw new Error("This corpus is human-approved and frozen. Author a new corpus version instead.");
}
const packs = JSON.parse(readFileSync("tests/image-evals/vnext-3/fixtures/prompts.json", "utf8"));
const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)),
    );
  });
if (process.argv.includes("--revise-brand")) {
  // Explicit pre-approval correction, never used by evaluation or normal authoring.
  const prompts = {
    logo: "Create ONLY a flat logo reference card on plain cream. Use the attached fictional beverage label as identity reference. Exact dark green wordmark VELORA, with the same lemon-and-leaves circle emblem above it. Centered orthographic graphic, sharp clean edges. No bottle, no packaging, no scene, no products, no mockup, no extra text. This is a flat brand logo reference image.",
    style_reference:
      "Create a fictional VELORA beverage brand visual reference board. Preserve EXACTLY the attached pale yellow beverage bottle, green cap, cream label, VELORA wordmark and lemon-and-leaves circle emblem. Show matching green, cream and pale yellow color swatches and clean editorial typography. No cosmetics, droppers or unrelated product categories. Same beverage identity, no extra slogans.",
    product_shot:
      "Create an editorial studio photograph of the EXACT fictional VELORA LEMON beverage bottle in the reference. Preserve its cylindrical pale yellow bottle, ribbed green cap, cream label, VELORA and LEMON wordmarks and lemon-and-leaves circle emblem. Standing on a cream plinth with soft natural side light. No cosmetics or droppers. One bottle, no extra text or products.",
  };
  for (const [role, prompt] of Object.entries(prompts)) {
    const name = `vnext3-brand-a-${role}-v2`;
    const raw = `research/images-2-5-community/runs/_fixtures/${name}.png`;
    if (!existsSync(raw))
      await run("node", [
        "scripts/images-2-5-run.ts",
        "fixture",
        name,
        prompt,
        "--model",
        "sunburst",
        "--quality",
        "high",
        "--refs",
        "research/images-2-5-community/runs/_fixtures/vnext3-product-a-front.png",
      ]);
    const target = `tests/image-evals/vnext-3/fixtures/brand-a/${role.replaceAll("_", "-")}.webp`;
    await run("cwebp", ["-quiet", "-q", "82", raw, "-o", target]);
    writeFileSync(`${target}.prompt.txt`, prompt + "\n");
  }
  process.exit(0);
}
for (const pack of packs) {
  for (const [i, role] of pack.roles.entries()) {
    const target = `tests/image-evals/vnext-3/fixtures/${pack.id}/${role.replaceAll("_", "-")}.webp`;
    if (existsSync(target)) continue;
    const name = `vnext3-${pack.id}-${role}`;
    const raw = `research/images-2-5-community/runs/_fixtures/${name}.png`;
    const primary = `research/images-2-5-community/runs/_fixtures/vnext3-${pack.id}-${pack.roles[0]}.png`;
    const framing = {
      primary: "front-facing head and shoulders portrait",
      full_body: "head-to-toe standing full body photograph, neutral simple clothing",
      three_quarter: "three-quarter view photograph",
      front: "straight-on full product photograph, entire bottle visible",
      detail: "close photograph of the product label and cap",
      logo: "flat logo on a clean cream card",
      style_reference: "brand visual style board with typography and color swatches",
      product_shot: "editorial product shot of the pale yellow beverage bottle",
    }[role];
    const prompt = `Create a high-fidelity reference fixture. ${pack.description} ${framing}. Neutral studio light, clean background, crisp detail. Entirely fictional; no real person, celebrity, real-world brand or watermark. ${i ? "Preserve precisely the identity, colors and all defining features in the attached primary reference. Change only the framing to the requested view." : ""}`;
    if (!existsSync(raw))
      await run("node", [
        "scripts/images-2-5-run.ts",
        "fixture",
        name,
        prompt,
        "--model",
        "sunburst",
        "--quality",
        "high",
        ...(i ? ["--refs", primary] : []),
      ]);
    mkdirSync(`tests/image-evals/vnext-3/fixtures/${pack.id}`, { recursive: true });
    await run("cwebp", ["-quiet", "-q", "82", raw, "-o", target]);
    writeFileSync(`${target}.prompt.txt`, prompt + "\n");
  }
}
