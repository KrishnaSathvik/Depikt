// Four individually approved, one-shot development checks. No database, retries or deployment.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  generateImage,
  editImage,
  estimateApiCostUsd,
} from "../src/lib/generation/openai-images.ts";
import { validateGeneratedMedia } from "../src/lib/generation/media.ts";
import { encodeRgbaPng, parsePngHeader } from "../src/lib/generation/png-mask.ts";

const check = process.argv[2];
if (
  !["image", "markup", "svg", "gif"].includes(check ?? "") ||
  !process.argv.includes("--approve-paid")
) {
  throw new Error(
    "Choose image, markup, svg or gif and explicitly pass --approve-paid. Each invocation makes at most one paid request.",
  );
}
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY is required; do not put it in source or arguments.");
const directory = "/tmp/depikt-2-6-verification";
await mkdir(directory, { recursive: true });
// Refuse a second call for a case, including after a provider failure.
await writeFile(`${directory}/${check}.attempt`, "One approved attempt started.\n", { flag: "wx" });
const format = check === "svg" ? "svg" : check === "gif" ? "gif" : "png";
const input = {
  model: check === "image" ? ("flare" as const) : ("sunburst" as const),
  family: "2.6" as const,
  width: 1024,
  height: 1024,
  apiKey,
  prompt:
    check === "image"
      ? "A single red ceramic teapot on a pale gray table, centered, daylight, plain background, no text."
      : check === "svg"
        ? "A simple editable vector illustration of a green leaf, using only SVG paths and presentation attributes, no CSS, scripts, external resources or embedded raster images."
        : "A simple seamless four-frame animation of a red circle gently bouncing on a plain white background. Keep all four frames distinct.",
  outputFormat: format,
  ...(check === "gif" ? { gif: { frameCount: 4, frameDurationMs: 200 } } : {}),
};
try {
  let result;
  if (check === "markup") {
    const source = new Uint8Array(await readFile(`${directory}/image.png`));
    const header = parsePngHeader(source);
    if (!header.ok) throw new Error("The standard-image check must first save a valid PNG.");
    const { width, height } = header.header;
    const rgba = new Uint8Array(width * height * 4);
    // A transparent red rectangle marks the body of the generated teapot.
    for (let y = Math.floor(height * 0.3); y < height * 0.7; y++) {
      for (let x = Math.floor(width * 0.3); x < width * 0.7; x++) {
        if (x > width * 0.31 && x < width * 0.69 && y > height * 0.31 && y < height * 0.69)
          continue;
        const at = (y * width + x) * 4;
        rgba[at] = 255;
        rgba[at + 3] = 255;
      }
    }
    result = await editImage({
      ...input,
      width,
      height,
      prompt:
        "Change only the teapot marked by the red rectangle to blue. Preserve the table, composition and lighting. Do not render the annotation.",
      referenceImages: [{ bytes: source, filename: "source.png", mimeType: "image/png" }],
      markup: {
        bytes: encodeRgbaPng(rgba, width, height),
        filename: "markup.png",
        mimeType: "image/png",
      },
    });
  } else result = await generateImage(input);
  const bytes = new Uint8Array(Buffer.from(result.b64, "base64"));
  const validated = validateGeneratedMedia(bytes, format, input.width, input.height);
  if (format === "png") {
    const header = parsePngHeader(bytes);
    if (!header.ok) throw new Error(header.error);
  }
  await writeFile(`${directory}/${check}.${format}`, validated.bytes);
  const costUsd = estimateApiCostUsd(result.usage);
  const report = {
    check,
    model: input.model,
    family: input.family,
    valid: true,
    metadata: validated.metadata,
    usage: result.usage ?? null,
    costUsd,
    elapsedMs: result.ms,
  };
  await writeFile(`${directory}/${check}.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (error) {
  // No retry, no alternative endpoint/model, no secret response or headers.
  console.error("Check stopped; no further provider request will be made.");
  throw error;
}
