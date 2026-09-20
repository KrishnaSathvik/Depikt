import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";
import { planGrounding } from "../../src/lib/generation/grounding/planner.ts";
import { resolveGrounding } from "../../src/lib/generation/grounding/service.ts";
import { buildGenerationPlan } from "../../src/lib/generation/plan.ts";
import type { Intent } from "../../src/lib/prompt-engine/intent.ts";

const intent = loadVnext1Cases()[0]!.fixture_intent;

function decide(
  prompt: string,
  opts: { owned?: number; category?: Intent["category"]; searchNeeded?: boolean } = {},
) {
  return planGrounding(
    { ...intent, category: opts.category ?? intent.category },
    prompt,
    opts.searchNeeded ?? false,
    opts.owned ?? 0,
  );
}

const SEARCH = [
  "Show the Sydney Opera House from Mrs Macquarie’s Point accurately.",
  "Create a faithful KSP Mun lander using real stock-game visual concepts.",
  "Show what the iPhone 18 Pro currently looks like.",
  "Create an accurate 2026 F1 car livery.",
  "Recreate this historic building as it appeared in 1920.",
  "Create an accurate present-day view of Shibuya Crossing.",
  "Show the current uniform used by this sports team.",
  "Use the latest NASA Artemis hardware configuration.",
  "Research KSP stock-game parts before generating.",
  "Use current official sources for the Sydney skyline.",
  "Verify the correct relative placement of these real landmarks.",
  "Look up reference photographs of the real building.",
  "Show Times Square as it appears today.",
  "Show the iPhone 18 Pro as it looks today.",
  "Accurate present-day Shibuya Crossing at night.",
  "research what this camera currently looks like",
  "check whether this uniform is current",
  "look up official reference photos",
  "search for current examples of the real station",
  "Apollo launch pad configuration in 1969",
  "Times Square in 1975 accurately",
  "photorealistic view from this named public viewpoint with accurate landmarks",
  "authentic real-world camera body layout",
] as const;

const NO_SEARCH = [
  "Cinematic portrait of a woman in red light.",
  "Blue ceramic teapot on a walnut table.",
  "Make this logo more minimal.",
  "Sofia in a research laboratory.",
  "Sofia works in a research laboratory",
  "a research scientist in a clean room",
  "research notes scattered on a desk",
  "Check the lighting on this portrait.",
  "checkerboard floor",
  "Create three poster concepts.",
  "A fantasy city on Mars.",
  "A 1920s-inspired hotel lobby.",
  "Tokyo-inspired cyberpunk street.",
  "A futuristic train station at sunset.",
  "Make the composition more accurate and centered.",
  "Faithful to my uploaded sketch.",
  "Maya at a café.",
  "current mood: cinematic",
  "New York-style skyline",
  "Mediterranean coastal town",
  "a 1980s-style sci-fi magazine cover",
  "turn this photo into a rainy evening",
  "a bowl of blood oranges on linen",
  '3:4 product still. Label in one line, exact spelling: "HALO".',
] as const;

for (const prompt of SEARCH) {
  test(`grounds factual visual fidelity: ${prompt}`, () => {
    const plan = decide(prompt);
    assert.equal(plan.needed, true, prompt);
    assert.notEqual(plan.mode, "none", prompt);
  });
}

for (const prompt of NO_SEARCH) {
  test(`does not ground ordinary creative wording: ${prompt}`, () => {
    const plan = decide(prompt, { searchNeeded: true });
    assert.equal(plan.needed, false, prompt);
    assert.equal(plan.mode, "none", prompt);
    assert.equal(buildGenerationPlan(intent, prompt).searchNeeded, false, prompt);
  });
}

test("exact spelling on a product label is not public-product grounding", () => {
  const prompt = '3:4 product still. Label in one line, exact spelling: "HALO".';
  assert.equal(decide(prompt, { category: "product" }).needed, false);
  assert.equal(buildGenerationPlan({ ...intent, category: "product" }, prompt).searchNeeded, false);
});

test("Maya pack + café does not ground", () => {
  assert.equal(decide("Maya at a café.", { owned: 1 }).needed, false);
});

test("Maya pack + present-day Shibuya Crossing grounds the external place", () => {
  assert.equal(decide("Maya at present-day Shibuya Crossing", { owned: 1 }).needed, true);
});

test("Maya pack + fictional Tokyo-inspired crossing does not ground", () => {
  assert.equal(decide("Maya in a fictional Tokyo-inspired crossing", { owned: 1 }).needed, false);
});

test("Maya pack remains authority for Maya's own appearance", () => {
  assert.equal(decide("Show what Maya currently looks like", { owned: 1 }).needed, false);
});

test("NEMORI pack + beach table does not ground", () => {
  assert.equal(
    decide("Put my NEMORI bottle on a beach table.", { owned: 1, category: "product" }).needed,
    false,
  );
});

test("NEMORI pack + current Sydney Opera House grounds the external place", () => {
  assert.equal(
    decide("NEMORI beside the current Sydney Opera House", { owned: 1, category: "product" })
      .needed,
    true,
  );
});

test("VELORA pack + 2026 campaign copy does not ground", () => {
  assert.equal(
    decide("VELORA 2026 summer campaign.", { owned: 1, category: "product" }).needed,
    false,
  );
});

test("VELORA pack + Times Square as it appears today grounds the external place", () => {
  assert.equal(
    decide("VELORA campaign in Times Square as it appears today", {
      owned: 1,
      category: "product",
    }).needed,
    true,
  );
});

test("Maya pack still grounds explicit current runway research", () => {
  assert.equal(
    decide("Research current Paris Fashion Week runway references and place Maya there.", {
      owned: 1,
    }).needed,
    true,
  );
});

test("NEMORI pack still grounds comparison to current Sony packaging", () => {
  assert.equal(
    decide("Compare this product with current Sony packaging.", {
      owned: 1,
      category: "product",
    }).needed,
    true,
  );
});

test("explicit decline suppresses even accurate present-day skyline", () => {
  assert.equal(
    decide("Accurate present-day Sydney skyline, but do not search the web.").needed,
    false,
  );
  assert.equal(decide("Use only my uploaded references; no external research.").needed, false);
  assert.equal(decide("don't use external references for this skyline").needed, false);
});

test("ordinary creative prompts never reach retrieval", async () => {
  let calls = 0;
  const prompt = "a bowl of blood oranges on linen";
  const plan = decide(prompt);
  assert.equal(plan.needed, false);
  assert.equal(plan.mode, "none");
  assert.equal(
    await resolveGrounding({
      plan,
      prompt,
      intent,
      userId: "u",
      secret: "test",
      provider: {
        cacheNamespace: "need-detector",
        searchWeb: async () => {
          calls += 1;
          return [];
        },
        searchImages: async () => {
          calls += 1;
          return [];
        },
      },
      cache: {
        get: async () => null,
        set: async () => undefined,
      },
    }),
    undefined,
  );
  assert.equal(calls, 0);
});

test("plan creation copy does not claim research is occurring", () => {
  const workspace = readFileSync(
    resolve(import.meta.dirname, "../../src/components/generate/GenerateWorkspace.tsx"),
    "utf8",
  );
  assert.match(workspace, /Preparing your request…/);
  assert.equal(workspace.includes("researching references when needed"), false);
});
