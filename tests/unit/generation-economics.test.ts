import { test } from "node:test";
import assert from "node:assert/strict";
import {
  automaticRepairEnabled,
  INCLUDED_REPAIR_POLICY,
  LAUNCH_ECONOMIC_POLICY,
} from "../../src/lib/generation/economic-policy.ts";
import {
  buildValidationPlan,
  type CheckKind,
  type ValidationResult,
} from "../../src/lib/generation/validation/contract.ts";
import {
  selectRepairCandidate,
  repairIsBetter,
} from "../../src/lib/generation/validation/repair.ts";
import {
  signAssessment,
  verifyAssessment,
} from "../../src/lib/generation/validation/assessment.ts";
import {
  resolveGrounding,
  type GroundingUsage,
} from "../../src/lib/generation/grounding/service.ts";
import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";
import { encodeRgbaPng } from "../../src/lib/generation/png-mask.ts";
import { validateResult } from "../../src/lib/generation/validation/engine.ts";

const failure = (kind: CheckKind, confidence = 0.95): ValidationResult => ({
  verdict: "repairable",
  checks: [
    {
      id: kind,
      kind,
      target: "requirement",
      status: "fail",
      confidence,
      evidence: "fixture",
      method: "visual_judge",
    },
  ],
});
const candidate = (kind: CheckKind, confidence = 0.95) => ({
  jobId: kind,
  result: failure(kind, confidence),
  hasMask: true,
  hasReferences: true,
});

test("launch prices and repair activation require the new explicit policy", () => {
  assert.equal(LAUNCH_ECONOMIC_POLICY.creditsPerRequestedImage, 1);
  assert.equal(LAUNCH_ECONOMIC_POLICY.maxAutomaticRepairsPerRequest, 1);
  assert.equal(
    LAUNCH_ECONOMIC_POLICY.validationExtraCredits +
      LAUNCH_ECONOMIC_POLICY.groundingExtraCredits +
      LAUNCH_ECONOMIC_POLICY.automaticRepairExtraCredits,
    0,
  );
  assert.equal(automaticRepairEnabled({}), false);
  assert.equal(
    automaticRepairEnabled({
      VALIDATION_REPAIR_ENABLED: "true",
      AUTO_REPAIR_POLICY: "platform_absorbs_one",
    }),
    false,
  );
  assert.equal(automaticRepairEnabled({ AUTO_REPAIR_POLICY: INCLUDED_REPAIR_POLICY }), false);
  assert.equal(
    automaticRepairEnabled({
      VALIDATION_REPAIR_ENABLED: "true",
      AUTO_REPAIR_POLICY: INCLUDED_REPAIR_POLICY,
    }),
    true,
  );
});

test("series selection prioritizes hard failures and rejects uncertain candidates", () => {
  const priority: CheckKind[] = [
    "product_identity",
    "exact_text",
    "edit_preservation",
    "object_count",
    "grounding_consistency",
    "composition",
  ];
  for (let i = 0; i < priority.length; i++) {
    const candidates = priority
      .slice(i)
      .reverse()
      .map((k) => candidate(k));
    assert.equal(selectRepairCandidate(candidates)?.jobId, priority[i]);
  }
  assert.equal(
    selectRepairCandidate([candidate("product_identity", 0.85), candidate("exact_text")])?.jobId,
    "exact_text",
  );
  assert.equal(selectRepairCandidate([candidate("product_identity", 0.85)]), null);
  const unavailable = candidate("exact_text");
  unavailable.result.checks[0].status = "unavailable";
  assert.equal(selectRepairCandidate([unavailable]), null);
  assert.equal(
    selectRepairCandidate([{ ...candidate("product_identity"), hasReferences: false }]),
    null,
  );
});

test("best-result selection keeps original on ties, regressions and uncertain repairs", () => {
  assert.equal(repairIsBetter(failure("exact_text"), failure("exact_text")), false);
  assert.equal(repairIsBetter(failure("exact_text"), failure("product_identity")), false);
  assert.equal(repairIsBetter(failure("product_identity"), failure("exact_text")), true);
  const uncertain = failure("composition");
  uncertain.checks[0].status = "unavailable";
  assert.equal(repairIsBetter(failure("product_identity"), uncertain), false);
  assert.equal(repairIsBetter(failure("product_identity"), failure("dimensions")), false);
});

test("assessment signatures prevent cross-child replay and owner-edited free repair evidence", () => {
  const result = failure("exact_text");
  const signed = signAssessment(result, "u", "s", "j", "secret");
  assert.deepEqual(verifyAssessment(signed, "u", "s", "j", "secret"), result);
  for (const [u, s, j] of [
    ["other", "s", "j"],
    ["u", "other", "j"],
    ["u", "s", "other"],
  ])
    assert.throws(() => verifyAssessment(signed, u, s, j, "secret"));
  assert.throws(() =>
    verifyAssessment(
      signed.slice(0, -1) + (signed.endsWith("0") ? "1" : "0"),
      "u",
      "s",
      "j",
      "secret",
    ),
  );
});

test("generic dragon uses deterministic tier; strict instructions add targeted checks", async () => {
  const intent = {
    ...loadVnext1Cases()[0]!.fixture_intent,
    exact_text: [],
    reference_intent: "none" as const,
    must_preserve: [],
  };
  const args = {
    intent,
    entities: [],
    selectedCount: 1,
    prompt: "cute watercolor dragon",
    hasMask: false,
  };
  const plan = buildValidationPlan(args);
  const image = {
    bytes: encodeRgbaPng(new Uint8Array([1, 2, 3, 255]), 1, 1),
    mimeType: "image/png",
    filename: "fixture.png",
  };
  const result = await validateResult(plan, {
    image,
    width: 1,
    height: 1,
    seriesCount: 1,
    references: [],
    entityIds: [],
    judge: {
      judge: async () => {
        throw new Error("Trivial image must not call judge");
      },
    },
    ocr: {
      read: async () => {
        throw new Error("Trivial image must not call OCR");
      },
    },
  });
  assert.equal(result.verdict, "pass");
  assert.deepEqual(
    plan.checks.map((c) => c.kind),
    ["dimensions", "series_count"],
  );
  assert.ok(
    buildValidationPlan({ ...args, prompt: "Preserve the same room" }).checks.some(
      (c) => c.kind === "strict_preservation",
    ),
  );
  assert.ok(
    buildValidationPlan({
      ...args,
      prompt: "Show the bottle with a square cap",
      groundingBundle: {
        facts: [{ text: "The bottle has a square cap", sourceId: "s1" }],
        sources: [
          {
            id: "s1",
            url: "https://example.com/bottle",
            title: "Bottle",
            quality: "official_product",
          },
        ],
        visualReferences: [],
        queries: [],
        createdAt: "2026-09-18T00:00:00Z",
      },
    }).checks.some((c) => c.kind === "grounding_consistency"),
  );
  assert.ok(
    buildValidationPlan({ ...args, hasMask: true }).checks.some((c) => c.kind === "requested_edit"),
  );
});

test("grounding caps three web/two visual queries, eight sources, and reuses cached research", async () => {
  let web = 0,
    visual = 0;
  const cache = new Map<string, string>();
  const usage: GroundingUsage[] = [];
  const results = Array.from({ length: 12 }, (_, i) => ({
    url: `https://example.com/source-${i}`,
    title: `Source ${i}`,
    excerpt: `Subject fact ${i}`,
    quality: "official_documentation" as const,
  }));
  const args = {
    plan: {
      needed: true,
      mode: "web_and_visual" as const,
      queries: ["a", "b", "c", "d"],
      factualNeeds: [],
      visualNeeds: [],
    },
    prompt: "Research subject",
    userId: "u",
    secret: "s",
    provider: {
      cacheNamespace: "fixture",
      searchWeb: async () => {
        web++;
        return results;
      },
      searchImages: async () => {
        visual++;
        return results.map((r, i) => ({
          ...r,
          url: `https://example.com/visual-${i}`,
          imageUrl: `https://example.com/${i}.png`,
        }));
      },
    },
    cache: {
      get: async (k: string) => cache.get(k) ?? null,
      set: async (k: string, v: string) => {
        cache.set(k, v);
      },
    },
    queryCosts: { web: 0.01, visual: 0.02 },
    onUsage: (u: GroundingUsage) => usage.push(u),
  };
  const first = await resolveGrounding(args);
  assert.equal(web, 3);
  assert.equal(visual, 2);
  assert.equal(first?.bundle.sources.length, 8);
  assert.equal(usage[0].costUsd, 0.07);
  assert.deepEqual(await resolveGrounding(args), first);
  assert.equal(web, 3);
  assert.equal(visual, 2);
  assert.equal(usage[1].costUsd, 0);
  await resolveGrounding({ ...args, refresh: true });
  assert.equal(web, 6);
  assert.equal(visual, 4);
});
