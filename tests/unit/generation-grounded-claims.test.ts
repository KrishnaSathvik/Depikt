import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  compileGroundedValidationClaims,
  groundedValidationRequirements,
} from "../../src/lib/generation/grounding/claims.ts";
import {
  GroundingBundleSchema,
  type GroundingBundle,
  type SourceQuality,
} from "../../src/lib/generation/grounding/contract.ts";
import {
  normalizeResults,
  groundingBrief,
  resolveGrounding,
  verifyGroundingSnapshot,
} from "../../src/lib/generation/grounding/service.ts";
import { buildValidationPlan } from "../../src/lib/generation/validation/contract.ts";
import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";
const intent = loadVnext1Cases()[0]!.fixture_intent;
function bundle(text: string, quality: SourceQuality = "official_documentation"): GroundingBundle {
  return GroundingBundleSchema.parse({
    contextFacts: [{ text, sourceId: "s1" }],
    validationClaims: [],
    visualReferences: [],
    sources: [{ id: "s1", title: "Evidence", url: "https://example.com/evidence", quality }],
    queries: [],
    createdAt: "2026-09-18T00:00:00Z",
  });
}
const fixtures = JSON.parse(
  readFileSync(new URL("../fixtures/grounding/claim-compilation.json", import.meta.url), "utf8"),
) as Array<{
  name: string;
  prompt: string;
  evidence: string;
  absent: string[];
  present: string[];
  checkable: boolean;
}>;
for (const f of fixtures)
  test(`user-origin claims: ${f.name}`, () => {
    const b = bundle(f.evidence);
    const compiled = compileGroundedValidationClaims({ prompt: f.prompt, intent, bundle: b });
    const text = compiled.validationClaims!.map((c) => c.requirement).join(";");
    assert.ok(compiled.validationClaims!.length);
    for (const word of f.absent) assert.ok(!text.includes(word), word);
    for (const word of f.present) assert.ok(text.includes(word), word);
    for (const c of compiled.validationClaims!) {
      assert.equal(c.origin, "user");
      assert.ok(f.prompt.includes(c.requirement));
      assert.deepEqual(c.supportedBy, ["s1"]);
      assert.equal(c.checkableVisually, f.checkable);
    }
    const plan = buildValidationPlan({
      intent,
      prompt: f.prompt,
      entities: [],
      selectedCount: 1,
      hasMask: false,
      groundingBundle: { ...b, ...compiled },
    });
    assert.deepEqual(
      plan.checks.filter((c) => c.kind === "grounding_consistency").map((c) => c.target),
      f.checkable ? compiled.validationClaims!.map((c) => c.requirement) : [],
    );
    const brief = groundingBrief({ key: "unused", seal: "unused", bundle: b });
    assert.ok(brief.includes(f.evidence)); // generation context remains rich
    assert.ok(!brief.includes("GROUNDED REQUIREMENTS"));
  });

test("missing official evidence is recorded but creates no unavailable/failing check", () => {
  const prompt = "Research current official references, then show the Acme camera on a table";
  const b = bundle("Acme camera on a table", "community");
  const compiled = compileGroundedValidationClaims({ prompt, bundle: b });
  assert.equal(compiled.authorityStatus, "official evidence unavailable");
  assert.equal(compiled.validationClaims!.length, 1);
  assert.equal(compiled.validationClaims![0].checkableVisually, false);
  assert.deepEqual(groundedValidationRequirements(b, prompt), []);
  const plan = buildValidationPlan({
    intent,
    prompt,
    groundingBundle: b,
    entities: [],
    selectedCount: 1,
    hasMask: false,
  });
  assert.deepEqual(
    plan.checks.map((c) => c.kind),
    ["dimensions", "series_count"],
  );
  const official = compileGroundedValidationClaims({
    prompt,
    bundle: bundle("Acme camera on a table"),
  });
  assert.equal(official.authorityStatus, "available");
  assert.equal(official.validationClaims![0].checkableVisually, true);
});

test("empty, irrelevant and research-only evidence yields no grounding validation checks", () => {
  for (const b of [
    bundle("Unrelated milk carton"),
    { ...bundle("Acme camera body"), contextFacts: [] },
  ]) {
    assert.deepEqual(groundedValidationRequirements(b, "Show an Acme camera"), []);
  }
  assert.deepEqual(
    groundedValidationRequirements(bundle("Acme camera body"), "Research Acme camera references"),
    [],
  );
});

test("intent paraphrases and persisted claims cannot introduce obligations", () => {
  const b = bundle("Acme camera body and fireworks");
  b.validationClaims = [
    {
      requirement: "Fireworks required",
      origin: "user",
      supportedBy: ["s1"],
      checkableVisually: true,
    },
  ];
  const claims = compileGroundedValidationClaims({
    prompt: "Show the Acme camera",
    intent: { ...intent, requested_changes: ["Fireworks required"], must_preserve: ["122 parts"] },
    bundle: b,
  });
  assert.deepEqual(
    claims.validationClaims!.map((c) => c.requirement),
    ["Show the Acme camera"],
  );
  assert.deepEqual(groundedValidationRequirements(b, "Show the Acme camera"), [
    "Show the Acme camera",
  ]);
  assert.equal(
    GroundingBundleSchema.safeParse({
      ...b,
      validationClaims: [{ ...b.validationClaims[0], origin: "retrieval" }],
    }).success,
    false,
  );
  assert.equal(
    GroundingBundleSchema.safeParse({
      ...b,
      validationClaims: [{ ...b.validationClaims[0], supportedBy: ["missing"] }],
    }).success,
    false,
  );
});

test("source preference ranks trusted official/institutional/secondary above community", () => {
  const sources = (
    [
      "community",
      "secondary",
      "institutional",
      "official_product",
      "official_documentation",
    ] as const
  ).map((quality) => ({
    quality,
    url: `https://example.com/${quality}`,
    title: "Acme camera",
    excerpt: "Acme camera has an amber body",
  }));
  const selected = normalizeResults(sources, [], [], new Date(), "Show the Acme camera");
  assert.deepEqual(
    selected.sources.map((s) => s.quality),
    ["official_documentation", "official_product", "institutional", "secondary"],
  );
});

test("compiled claims are signed and cached; changing a claim invalidates the signature", async () => {
  const cache = new Map<string, string>();
  let searches = 0;
  const args = {
    prompt: "Research official references, then show the Acme camera",
    intent,
    plan: {
      needed: true,
      mode: "web" as const,
      queries: ["Acme camera"],
      factualNeeds: [],
      visualNeeds: [],
    },
    userId: "qa",
    secret: "fixture-secret",
    cache: {
      get: async (k: string) => cache.get(k) ?? null,
      set: async (k: string, v: string) => {
        cache.set(k, v);
      },
    },
    provider: {
      cacheNamespace: "fixture",
      searchImages: async () => [],
      searchWeb: async () => {
        searches++;
        return [
          {
            title: "Acme camera",
            excerpt: "Acme camera amber body",
            url: "https://example.com/camera",
            quality: "official_product" as const,
          },
        ];
      },
    },
  };
  const first = (await resolveGrounding(args))!;
  const second = (await resolveGrounding(args))!;
  assert.equal(searches, 1);
  assert.deepEqual(first, second);
  assert.equal(first.bundle.authorityStatus, "available");
  assert.equal(first.bundle.validationClaims![0].requirement, "show the Acme camera");
  const tampered = structuredClone(first);
  tampered.bundle.validationClaims![0].requirement = "Add fireworks";
  assert.throws(() => verifyGroundingSnapshot(tampered, args.userId, args.secret), /signature/);
});

test("international institutional namespaces are trusted, commercial official-looking pages are not", async () => {
  const { createBraveGroundingProvider } =
    await import("../../src/lib/generation/grounding/brave-provider.ts");
  const urls = [
    "https://parks.nsw.gov.au/viewpoint",
    "https://www.gov.uk/place",
    "https://museum.edu.au/gallery",
    "https://official.example.com/docs",
    "https://gov.au.example.com/docs",
  ];
  const provider = createBraveGroundingProvider(
    { BRAVE_SEARCH_API_KEY: "fixture" },
    async () =>
      new Response(
        JSON.stringify({
          web: {
            results: urls.map((url) => ({
              url,
              title: "Official documentation",
              description: "Acme camera references",
            })),
          },
        }),
      ),
  );
  assert.deepEqual(
    (await provider.searchWeb("Acme camera")).map((s) => s.quality),
    ["institutional", "institutional", "institutional", "community", "community"],
  );
});

test("legacy signed snapshots retain their seal and never turn excerpts into claims", async () => {
  const { createHmac } = await import("node:crypto");
  const b = bundle("Acme camera photographed during fireworks");
  const legacy = {
    facts: b.contextFacts!,
    visualReferences: b.visualReferences,
    sources: b.sources,
    queries: b.queries,
    createdAt: b.createdAt,
  };
  function canonical(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (value && typeof value === "object")
      return `{${Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
        .join(",")}}`;
    return JSON.stringify(value);
  }
  const key = "a".repeat(64);
  const seal = createHmac("sha256", "fixture")
    .update(canonical(["grounding-v1", "qa", key, legacy]))
    .digest("hex");
  const verified = verifyGroundingSnapshot({ key, seal, bundle: legacy }, "qa", "fixture");
  assert.deepEqual(verified.bundle, legacy);
  assert.deepEqual(groundedValidationRequirements(verified.bundle, "Show the Acme camera"), [
    "Show the Acme camera",
  ]);
});
