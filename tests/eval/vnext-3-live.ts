// Explicit billable release gate. Never generates or modifies fixture identities.
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { loadVnext3Cases } from "../image-evals/vnext-3/load-cases.ts";
import { fixtureEntity, fixturePath } from "../image-evals/vnext-3/fixture-entities.ts";
import { resolveEntityReferences } from "../../src/lib/generation/entity-reference-resolver.ts";
import { buildEntityPreamble } from "../../src/lib/generation/entity-preamble.ts";
import { entityReferenceIntent } from "../../src/lib/generation/entities.ts";
import { analyzeIntent } from "../../src/lib/prompt-engine/builder.ts";
import { buildGenerationPlan, resolveOperation } from "../../src/lib/generation/plan.ts";
import { resolveGenerationModel } from "../../src/lib/generation/model-router.ts";
import { decomposeSeries } from "../../src/lib/generation/decompose-series.ts";
import { resolveModelId, GENERATION_QUALITY } from "../../src/lib/generation/models.ts";
import { generateImage, editImage } from "../../src/lib/generation/openai-images.ts";
const root = new URL("../image-evals/vnext-3/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", root), "utf8")) as {
  approval: null | { approvedBy: string; approvedAt: string };
  files: Record<string, string>;
};
for (const [path, expected] of Object.entries(manifest.files)) {
  const actual = createHash("sha256")
    .update(readFileSync(new URL(path, root)))
    .digest("hex");
  if (actual !== expected) throw new Error(`Frozen corpus hash mismatch: ${path}`);
}
if (process.argv.includes("--check")) {
  console.log(
    `Corpus hashes verified (${Object.keys(manifest.files).length} files); human approval: ${manifest.approval ? "recorded" : "pending"}`,
  );
  process.exit(0);
}
if (!manifest.approval)
  throw new Error(
    "Human approval of this exact fixture manifest is required before running the release benchmark.",
  );
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const apiKey = process.env.OPENAI_API_KEY ?? "";
if (!apiKey) throw new Error("OPENAI_API_KEY required");
const resumeArg = process.argv.indexOf("--resume");
const out =
  resumeArg >= 0
    ? resolve(process.argv[resumeArg + 1])
    : resolve("benchmark-results", `vnext-3-${new Date().toISOString().replaceAll(":", "-")}`);
mkdirSync(out, { recursive: true });
const cases = loadVnext3Cases();
const series = {
  id: "brand-series-four",
  entities: ["brand-a"],
  prompt:
    "Create four separate VELORA brand advertisements: studio, beach, pool, and city at night. Keep the brand identity consistent.",
  expected: { operation: "edit", model: "sunburst", maxImages: 8, distinct: false },
} as const;
// Additional owner-requested stress scenario; approved fixture/case hashes stay untouched.
const stress = {
  id: "two-characters-one-product-cafe",
  entities: ["character-a", "character-b", "product-a"],
  prompt:
    "Maya and Sofia sitting together at an outdoor café. Maya is holding the VELORA Lemon bottle. Keep both people distinct and preserve the product identity.",
  expected: { operation: "edit", model: "sunburst", maxImages: 8, distinct: true },
} as const;
const caseArg = process.argv.indexOf("--cases");
const selectedIds = caseArg < 0 ? null : new Set((process.argv[caseArg + 1] ?? "").split(","));
const allCases = [...cases, series, stress];
if (selectedIds && [...selectedIds].some((id) => !allCases.some((c) => c.id === id)))
  throw new Error("Unknown --cases ID; no provider requests sent");
if (resumeArg >= 0 && out.endsWith("vnext-3-2026-09-16T20-05-27.006Z"))
  throw new Error("The original release baseline is immutable; use a new run directory");
const resultsFile = resolve(out, "results.json");
const previous = existsSync(resultsFile) ? JSON.parse(readFileSync(resultsFile, "utf8")) : null;
if (previous && JSON.stringify(previous.manifest.files) !== JSON.stringify(manifest.files))
  throw new Error("Resume corpus mismatch");
const results: Record<string, unknown>[] = previous?.results ?? [];
async function runCase(c: (typeof cases)[number] | typeof series | typeof stress) {
  if (results.some((r) => r.id === c.id && r.error)) return;
  const expectedChildren = c.id === series.id ? 4 : 1;
  if (
    results.filter((r) => r.id === c.id && typeof r.filename === "string").length ===
    expectedChildren
  )
    return;
  const entities = resolveEntityReferences({
    entities: c.entities.map(fixtureEntity),
    prompt: c.prompt,
    budget: 8,
  });
  const references = entities.flatMap((e) =>
    e.resolvedReferences.map((r) => ({
      bytes: new Uint8Array(readFileSync(fixturePath(e.id, r.assetId))),
      filename: r.assetId + ".webp",
      mimeType: "image/webp",
    })),
  );
  const preview = references[0]
    ? `data:image/webp;base64,${Buffer.from(references[0].bytes).toString("base64")}`
    : null;
  let requestEvidence: Record<string, unknown> = {};
  try {
    const { intent } = await analyzeIntent({
      apiKey,
      userInput: c.prompt,
      mode: "default",
      referenceImageUrl: preview,
      referenceIntent: entities.length ? entityReferenceIntent(entities[0].type) : "auto",
    });
    const plan = buildGenerationPlan(intent, c.prompt);
    const operation = resolveOperation(plan, [], null, entities.length);
    const model = resolveGenerationModel({
      operation,
      promptText: c.prompt,
      referenceCount: 0,
      lockedEntityCount: entities.length,
      hints: {
        category: intent.category,
        exactTextCount: intent.exact_text.length,
        referenceIntent: intent.reference_intent,
      },
    });
    if (operation !== c.expected.operation || model !== c.expected.model)
      throw new Error(`Routing mismatch: ${operation}/${model}`);
    if (c.id === series.id && (plan.mode !== "series" || plan.desiredCount !== 4))
      throw new Error("Brand series plan mismatch");
    const children =
      c.id === series.id
        ? (
            await decomposeSeries({
              apiKey,
              userInput: c.prompt,
              intent,
              selectedCount: 4,
              entities,
            })
          ).children
        : [{ label: null, prompt: c.prompt }];
    for (const [index, child] of children.entries()) {
      if (results.some((r) => r.id === c.id && r.index === index && typeof r.filename === "string"))
        continue;
      const preamble = buildEntityPreamble(entities, 0);
      const prompt = preamble ? `${preamble}\n\n${child.prompt}` : child.prompt;
      const args = {
        apiKey,
        model,
        prompt,
        width: 1024,
        height: 1024,
        fetchImpl: async (input: string | URL | Request, init?: RequestInit) => {
          const response = await fetch(input, init);
          requestEvidence.requestId = response.headers.get("x-request-id");
          requestEvidence.status = response.status;
          writeFileSync(
            resolve(out, `${c.id}-${index + 1}.request.json`),
            JSON.stringify(requestEvidence, null, 2),
          );
          return response;
        },
      };
      requestEvidence = {
        index,
        prompt,
        childPrompt: child.prompt,
        preamble,
        intent,
        entities,
        model,
        operation,
        providerParameters: {
          model: resolveModelId(model),
          size: "1024x1024",
          quality: GENERATION_QUALITY,
          n: 1,
          output_format: "png",
        },
        imageOrder: references.map((r) => ({
          filename: r.filename,
          sha256: createHash("sha256").update(r.bytes).digest("hex"),
        })),
      };
      writeFileSync(
        resolve(out, `${c.id}-${index + 1}.request.json`),
        JSON.stringify(requestEvidence, null, 2),
      );
      const result =
        operation === "edit"
          ? await editImage({ ...args, referenceImages: references })
          : await generateImage(args);
      const filename = `${c.id}-${index + 1}.png`;
      writeFileSync(resolve(out, filename), Buffer.from(result.b64, "base64"));
      results.push({
        id: c.id,
        index,
        filename,
        requestId: requestEvidence.requestId,
        model,
        operation,
        plan,
        intent,
        prompt,
        entities,
        ms: result.ms,
        usage: result.usage,
        score: { identity: null, productFidelity: null, nonMerging: null, labelIntegrity: null },
        notes: "Pending visual inspection: PASS / SOFT FAIL / FAIL. No automated pixel judge.",
      });
      writeFileSync(resolve(out, "results.json"), JSON.stringify({ manifest, results }, null, 2));
      console.log(
        `${c.id} ${index + 1}: ${model} ${operation} ${references.length} refs → ${filename}`,
      );
    }
  } catch (error) {
    results.push({ id: c.id, ...requestEvidence, error: (error as Error).message });
    writeFileSync(resolve(out, "results.json"), JSON.stringify({ manifest, results }, null, 2));
    console.error(`${c.id}: failed`);
  }
}
const queue = allCases.filter((c) => !selectedIds || selectedIds.has(c.id));
// Three independent cases at a time; fixture selection and each series stay deterministic.
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (queue.length) {
      const c = queue.shift();
      if (c) await runCase(c);
    }
  }),
);
console.log(`Review outputs and record scores in ${out}/results.json`);

if (results.some((result) => result && typeof result === "object" && "error" in result))
  process.exitCode = 1;
