import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authorityDomains,
  authorityFallbackQuery,
  AuthorityDomainRulesSchema,
  classifySourceDomain,
  wantsAuthority,
} from "../../src/lib/generation/grounding/authority.ts";
import { resolveGrounding, normalizeResults } from "../../src/lib/generation/grounding/service.ts";
import { planGrounding } from "../../src/lib/generation/grounding/planner.ts";
import { type SearchResult } from "../../src/lib/generation/grounding/contract.ts";
import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";
const intent = loadVnext1Cases()[0]!.fixture_intent;
const prompt = "Research current official references, then show the Acme camera on a table";
const row = (quality: SearchResult["quality"], suffix = "one"): SearchResult => ({
  title: "Acme camera",
  excerpt: "Acme camera has a square lens mount. Maker Z displayed it with 122 fireworks.",
  url: `https://example.com/${suffix}`,
  quality,
});
function setup(
  options: {
    authorityOnFirst?: boolean;
    noAuthority?: boolean;
    visualAuthority?: boolean;
    visualOnly?: boolean;
  } = {},
) {
  const calls: { kind: string; query: string }[] = [];
  const store = new Map<string, string>();
  const args = {
    prompt,
    intent,
    userId: "fixture",
    secret: "fixture",
    plan: {
      ...planGrounding(intent, prompt),
      ...(options.visualOnly ? { mode: "visual" as const } : {}),
    },
    cache: {
      get: async (k: string) => store.get(k) ?? null,
      set: async (k: string, v: string) => {
        store.set(k, v);
      },
    },
    provider: {
      cacheNamespace: "fixture-authority",
      authorityDomains: () => ["acme.example.com"],
      searchWeb: async (query: string) => {
        calls.push({ kind: "web", query });
        const authoritative =
          !options.noAuthority &&
          (options.authorityOnFirst || query.includes("site:acme.example.com"));
        return [
          row(
            authoritative ? "official_product" : "community",
            authoritative ? "official" : "community",
          ),
        ];
      },
      searchImages: async (query: string) => {
        calls.push({ kind: "visual", query });
        return [
          {
            ...row(options.visualAuthority ? "official_product" : "community", "photo"),
            imageUrl: "https://example.com/photo.png",
          },
        ];
      },
    },
  };
  return { calls, args };
}

test("official/current requests obtain one targeted authority fallback within caps and cache it", async () => {
  const { calls, args } = setup();
  const first = (await resolveGrounding(args))!;
  assert.equal(calls.filter((c) => c.kind === "web").length, 3);
  assert.equal(calls.filter((c) => c.kind === "visual").length, 2);
  assert.equal(calls.filter((c) => c.kind === "web" && c.query.includes("site:")).length, 1);
  assert.ok(first.bundle.retrieval!.authorityFallbackQuery!.includes("site:acme.example.com"));
  assert.equal(first.bundle.retrieval!.authoritativeWebFound, true);
  assert.equal(first.bundle.authorityStatus, "available");
  assert.ok(
    first.bundle.contextFacts!.every(
      (f) => first.bundle.sources.find((s) => s.id === f.sourceId)!.quality === "official_product",
    ),
  );
  assert.ok(first.bundle.sources.length <= 8);
  assert.deepEqual(
    first.bundle.validationClaims!.map((c) => c.requirement),
    ["show the Acme camera on a table"],
  );
  assert.equal(first.bundle.validationClaims![0].checkableVisually, true);
  const before = calls.length;
  assert.deepEqual(await resolveGrounding(args), first);
  assert.equal(calls.length, before);
});

test("first search authority avoids an extra web query", async () => {
  const { calls, args } = setup({ authorityOnFirst: true, visualAuthority: true });
  const result = (await resolveGrounding(args))!;
  assert.equal(calls.filter((c) => c.kind === "web").length, 2);
  assert.equal(result.bundle.retrieval!.authorityFallbackQuery, undefined);
  assert.equal(result.bundle.retrieval!.authoritativeVisualFound, true);
});

test("community fallback is retained only when authority is unavailable, without invented claims", async () => {
  const { calls, args } = setup({ noAuthority: true });
  const result = (await resolveGrounding(args))!;
  assert.equal(result.bundle.authorityStatus, "official evidence unavailable");
  assert.equal(result.bundle.retrieval!.authoritativeWebFound, false);
  assert.ok(result.bundle.sources.every((s) => s.quality === "community"));
  assert.equal(result.bundle.validationClaims![0].checkableVisually, false);
  assert.ok(!JSON.stringify(result.bundle.validationClaims).match(/122|fireworks|Maker Z/));
  assert.equal(calls.length, 5);
});

test("ordinary grounding is unchanged and visual-only requests never search the web", async () => {
  const ordinary = setup();
  ordinary.args.prompt = "Show the Acme camera using visual references";
  const result = (await resolveGrounding(ordinary.args))!;
  assert.equal(result.bundle.retrieval!.authorityRequested, false);
  assert.equal(ordinary.calls.length, 4);
  assert.ok(!ordinary.calls.some((c) => c.query.includes("site:")));
  const visual = setup({ visualOnly: true });
  await resolveGrounding(visual.args);
  assert.equal(visual.calls.filter((c) => c.kind === "web").length, 0);
  assert.equal(visual.calls.filter((c) => c.kind === "visual").length, 2);
});

test("fallback reserves capacity even with three planned queries, and records every actual query", async () => {
  const { calls, args } = setup({ noAuthority: true });
  args.plan.queries = ["Acme camera first", "Acme camera second", "Acme camera third"];
  const result = (await resolveGrounding(args))!;
  assert.equal(calls.filter((c) => c.kind === "web").length, 3);
  assert.equal(calls.filter((c) => c.kind === "visual").length, 2);
  assert.ok(!calls.some((c) => c.query === "Acme camera third"));
  assert.deepEqual(new Set(result.bundle.queries), new Set(calls.map((c) => c.query)));
});

test("irrelevant official snippets cannot prevent authority fallback", async () => {
  const { calls, args } = setup();
  const original = args.provider.searchWeb;
  args.provider.searchWeb = async (query) => {
    const rows = await original(query);
    return query.includes("site:")
      ? rows
      : [{ ...row("official_product"), excerpt: "Unrelated railway schedules and buses" }];
  };
  const result = (await resolveGrounding(args))!;
  assert.ok(result.bundle.retrieval!.authorityFallbackQuery);
  assert.equal(calls.filter((c) => c.kind === "web").length, 3);
});

test("authority-aware visual selection excludes community when better visual evidence exists", () => {
  const community = {
    ...row("community", "community"),
    imageUrl: "https://example.com/community.png",
  };
  const official = {
    ...row("official_product", "official"),
    imageUrl: "https://example.com/official.png",
  };
  const b = normalizeResults([row("institutional")], [community, official], [], new Date(), prompt);
  assert.equal(b.visualReferences.length, 1);
  assert.equal(b.visualReferences[0].imageUrl, official.imageUrl);
  const fallback = normalizeResults([row("institutional")], [community], [], new Date(), prompt);
  assert.equal(fallback.visualReferences.length, 1); // no authoritative visual available
});

test("trusted namespace/registry classification cannot be spoofed by titles or hostname substrings", () => {
  for (const host of [
    "culture.gouv.fr",
    "museum.go.jp",
    "tourism.gov.in",
    "city.gov.br",
    "library.edu.sg",
    "iso.org",
    "britishmuseum.org",
  ])
    assert.equal(classifySourceDomain(`https://${host}/page`), "institutional", host);
  for (const host of [
    "official.example.com",
    "gov.au.evil.com",
    "fakegov.au",
    "museum.example.org",
    "iso.org.evil.com",
  ])
    assert.equal(classifySourceDomain(`https://${host}/official`), "community", host);
  const rules = AuthorityDomainRulesSchema.parse([
    { host: "acme.example.com", quality: "official_product", subjects: ["Acme camera"] },
    {
      host: "docs.project.example.com",
      quality: "official_documentation",
      subjects: ["Example game"],
    },
    { host: "tourism.example.com", quality: "institutional", subjects: ["Example region"] },
    { host: "reviews.example.com", quality: "secondary", subjects: ["Acme camera"] },
    { host: "forum.acme.example.com", quality: "community" },
  ]);
  assert.equal(classifySourceDomain("https://acme.example.com/camera", rules), "official_product");
  assert.equal(
    classifySourceDomain("https://docs.project.example.com/start", rules),
    "official_documentation",
  );
  assert.equal(classifySourceDomain("https://tourism.example.com/maps", rules), "institutional");
  assert.equal(classifySourceDomain("https://reviews.example.com/camera", rules), "secondary");
  assert.equal(classifySourceDomain("https://forum.acme.example.com/post", rules), "community");
  assert.deepEqual(authorityDomains(prompt, rules), ["acme.example.com"]);
  assert.ok(
    !AuthorityDomainRulesSchema.safeParse([
      { host: "example.com OR evil", quality: "institutional" },
    ]).success,
  );
});

test("authority query is derived from the subject, not a frozen scenario or guessed brand domain", () => {
  for (const keyword of [
    "official",
    "current",
    "as of",
    "today",
    "accurate",
    "present-day",
    "first-party",
    "authoritative",
  ])
    assert.equal(wantsAuthority(`Research ${keyword} Acme camera`), true);
  const q = authorityFallbackQuery(
    "Research current official references, then show the Acme camera",
  );
  assert.ok(q.includes("Acme camera"));
  assert.ok(q.includes("site:gov"));
  assert.ok(!q.includes("acme.com"));
  assert.ok(!q.includes("Sydney"));
  assert.ok(q.length <= 400);
  const plan = planGrounding(intent, prompt);
  assert.ok(plan.queries.every((q) => q.includes("Acme camera") && !q.includes("then show")));
});

test("targeted fallback already in the plan is not searched twice", async () => {
  const { calls, args } = setup({ noAuthority: true });
  const fallback = authorityFallbackQuery(prompt, ["acme.example.com"]);
  args.plan.queries = ["Acme camera", fallback];
  await resolveGrounding(args);
  assert.equal(calls.filter((c) => c.kind === "web" && c.query === fallback).length, 1);
});
