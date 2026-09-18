import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";
import { planGrounding } from "../../src/lib/generation/grounding/planner.ts";
import {
  normalizeResults,
  resolveGrounding,
  verifyGroundingSnapshot,
  groundingBrief,
} from "../../src/lib/generation/grounding/service.ts";
import {
  isPublicHttpsUrl,
  type SearchResult,
} from "../../src/lib/generation/grounding/contract.ts";
import { createGroundingProvider } from "../../src/lib/generation/grounding/provider.ts";
import {
  validateCreatePlanBody,
  validateCreateJobsFromPlanBody,
} from "../../src/lib/generation/job-request.ts";
import { signPlanToken, verifyPlanToken } from "../../src/lib/generation/plan-token.ts";
import { buildGenerationPlan } from "../../src/lib/generation/plan.ts";
const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/grounding/search.json", import.meta.url), "utf8"),
) as { web: SearchResult[]; images: SearchResult[] };
const intent = loadVnext1Cases()[0]!.fixture_intent;
for (const [prompt, expected, category] of [
  [
    "Create a California Cities: Skylines 1 layout using relevant DLCs and research what can actually be built",
    true,
    "creative",
  ],
  ["A current real-world location photograph", true, "creative"],
  ["A real product with exact appearance", true, "product"],
  ["A generic dragon illustration", false, "creative"],
  ["Generic Milky Way art", false, "creative"],
  ["Yosemite Milky Way tonight", true, "creative"],
  ["A portrait of Superman", false, "creative"],
  ["Research Superman's costume", true, "creative"],
] as const)
  test(`grounding decision: ${prompt}`, () => {
    const plan = planGrounding({ ...intent, category }, prompt);
    assert.equal(plan.needed, expected);
    assert.equal(plan.mode, expected ? "web_and_visual" : "none");
    assert.ok(plan.queries.every((q) => q.length <= 500));
  });
test("ranking, source deduplication, provenance and safe URLs", () => {
  const b = normalizeResults([...fixture.web, ...fixture.web], fixture.images, ["query"]);
  assert.equal(b.facts.length, 2);
  assert.equal(b.sources[0].quality, "official_documentation");
  assert.ok(
    b.facts.every((f) => b.sources.some((s) => s.id === f.sourceId && s.quality !== "community")),
  );
  for (const u of [
    "http://example.com",
    "https://127.0.0.1",
    "https://[::1]",
    "https://localhost",
    "https://user:pass@example.com",
    "javascript:alert(1)",
  ])
    assert.equal(isPublicHttpsUrl(u), false);
});
test("persistent cache reuse, explicit refresh, owner binding and snapshot tampering", async () => {
  let calls = 0;
  const store = new Map<string, string>();
  const args = {
    plan: planGrounding(intent, "research a real location"),
    prompt: "research a real location",
    userId: "u",
    secret: "test",
    provider: {
      cacheNamespace: "fixture",
      searchWeb: async () => {
        calls++;
        return fixture.web;
      },
      searchImages: async () => {
        calls++;
        return fixture.images;
      },
    },
    cache: {
      get: async (k: string) => store.get(k) ?? null,
      set: async (k: string, v: string) => {
        store.set(k, v);
      },
    },
  };
  const first = await resolveGrounding(args);
  assert.ok(first);
  assert.equal(calls, 4);
  assert.deepEqual(await resolveGrounding(args), first);
  assert.equal(calls, 4);
  await resolveGrounding({ ...args, refresh: true });
  assert.equal(calls, 8);
  assert.throws(() => verifyGroundingSnapshot(first, "other", "test"));
  assert.throws(() =>
    verifyGroundingSnapshot(
      { ...first, bundle: { ...first.bundle, facts: [{ sourceId: "s1", text: "Injected fact" }] } },
      "u",
      "test",
    ),
  );
  assert.ok(!groundingBrief(first).includes("https://"));
  const payload = {
    userId: "u",
    prompt: args.prompt,
    userInput: args.prompt,
    intent,
    plan: buildGenerationPlan(intent, args.prompt),
    referenceAssetIds: [],
    sourceVersionId: null,
    maskAssetId: null,
    maskPath: null,
    exp: Date.now() + 60000,
    grounding: first,
  };
  const token = signPlanToken(payload, "test");
  assert.deepEqual(verifyPlanToken(token, "test", "u").grounding, first);
  const [body, mac] = token.split(".");
  const changed = JSON.parse(Buffer.from(body, "base64url").toString());
  changed.grounding.bundle.facts[0].text = "tampered";
  assert.throws(() =>
    verifyPlanToken(
      `${Buffer.from(JSON.stringify(changed)).toString("base64url")}.${mac}`,
      "test",
      "u",
    ),
  );
  assert.equal(
    await resolveGrounding({ ...args, plan: planGrounding(intent, "a dragon") }),
    undefined,
  );
  assert.equal(calls, 8);
});
test("untrusted request bodies cannot supply research", () => {
  for (const field of ["grounding", "facts", "sources", "visualReferences"]) {
    assert.equal(validateCreatePlanBody({ prompt: "x", [field]: [] }).ok, false);
    assert.equal(
      validateCreateJobsFromPlanBody({ planToken: "x", idempotencyKey: "x", [field]: [] }).ok,
      false,
    );
  }
});
test("gateway uses fixed endpoint, disables redirects and validates responses without live network", async () => {
  const requests: unknown[] = [];
  const provider = createGroundingProvider(
    {
      GROUNDING_PROVIDER_URL: "https://search.example.com/api",
      GROUNDING_PROVIDER_TOKEN: "fixture",
    },
    async (url, init) => {
      assert.equal(url, "https://search.example.com/api");
      assert.equal(init?.redirect, "error");
      requests.push(JSON.parse(init?.body as string));
      return new Response(JSON.stringify(fixture.web), {
        headers: { "content-type": "application/json" },
      });
    },
  );
  assert.deepEqual(await provider.searchWeb("query"), fixture.web);
  assert.equal(requests.length, 1);
  const bad = createGroundingProvider(
    {
      GROUNDING_PROVIDER_URL: "https://search.example.com/api",
      GROUNDING_PROVIDER_TOKEN: "fixture",
    },
    async () => new Response("x".repeat(65000)),
  );
  await assert.rejects(() => bad.searchWeb("query"));
});

test("concrete Brave adapter maps recorded-shape responses and fetches only its image proxy", async () => {
  const { createBraveGroundingProvider } =
    await import("../../src/lib/generation/grounding/brave-provider.ts");
  const urls: string[] = [];
  const provider = createBraveGroundingProvider(
    {
      BRAVE_SEARCH_API_KEY: "fixture",
      GROUNDING_SOURCE_RULES_JSON: JSON.stringify([
        { host: "product.example.com", quality: "official_product" },
      ]),
    },
    async (url, init) => {
      const address = String(url);
      urls.push(address);
      assert.equal(init?.redirect, "error");
      if (address.startsWith("https://imgs.search.brave.com/")) {
        assert.equal(new Headers(init?.headers).get("X-Subscription-Token"), null);
        return new Response(new Uint8Array([1, 2, 3]), {
          headers: { "Content-Type": "image/png" },
        });
      }
      assert.equal(new Headers(init?.headers).get("X-Subscription-Token"), "fixture");
      return new Response(
        JSON.stringify(
          address.includes("/images/")
            ? {
                results: [
                  {
                    url: "https://product.example.com/gallery",
                    title: "Actual reference",
                    thumbnail: { src: "https://imgs.search.brave.com/example" },
                  },
                ],
              }
            : {
                web: {
                  results: [
                    {
                      url: "https://product.example.com/docs",
                      title: "Product docs",
                      description: "Official capabilities",
                    },
                  ],
                },
              },
        ),
      );
    },
  );
  const web = await provider.searchWeb("current location");
  const images = await provider.searchImages("actual appearance");
  assert.equal(web[0].quality, "official_product");
  assert.ok(urls[0].includes("freshness=pw"));
  const bundle = normalizeResults(web, images, ["query"]);
  assert.equal((await provider.loadImages(bundle)).length, 1);
  await assert.rejects(() =>
    provider.loadImages({
      ...bundle,
      visualReferences: [
        { ...bundle.visualReferences[0], imageUrl: "https://evil.example.com/private" },
      ],
    }),
  );
  assert.equal(urls.length, 3);
});

test("grounded resume preserves original request and research sources, and is owner-scoped", async () => {
  const { saveGroundingResume, readGroundingResume } =
    await import("../../src/lib/generation/grounding/resume.ts");
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  };
  saveGroundingResume(
    {
      userId: "u",
      sessionId: "s",
      input: { prompt: "research location", refreshGrounding: true },
      referenceAssetIds: [],
      grounding: {
        sources: [{ id: "s1", url: "https://example.com/source", title: "Source" }],
        createdAt: "2026-09-17T00:00:00Z",
      },
    },
    storage,
  );
  assert.equal(readGroundingResume("u", storage)?.input.prompt, "research location");
  assert.equal(readGroundingResume("u", storage)?.input.refreshGrounding, undefined);
  assert.equal(readGroundingResume("other", storage), null);
});
