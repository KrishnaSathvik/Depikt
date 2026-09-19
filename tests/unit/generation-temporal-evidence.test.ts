import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  temporalSupport,
  temporalRequests,
  visualRequirement,
} from "../../src/lib/generation/grounding/temporal.ts";
import {
  GroundingBundleSchema,
  type GroundingBundle,
} from "../../src/lib/generation/grounding/contract.ts";
import {
  buildValidationPlan,
  signValidationPlan,
  verifyValidationPlan,
} from "../../src/lib/generation/validation/contract.ts";
import {
  signAssessment,
  verifyAssessment,
} from "../../src/lib/generation/validation/assessment.ts";
import { validateAndRepair } from "../../src/lib/generation/validation/runtime.ts";
import { validateResult } from "../../src/lib/generation/validation/engine.ts";
import { planRepair } from "../../src/lib/generation/validation/repair.ts";
import { encodeRgbaPng } from "../../src/lib/generation/png-mask.ts";
import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";
import {
  saveGroundingResume,
  readGroundingResume,
} from "../../src/lib/generation/grounding/resume.ts";
const fixture = JSON.parse(
  readFileSync(
    new URL("../fixtures/grounding/recorded-location-authority.json", import.meta.url),
    "utf8",
  ),
);
const intent = loadVnext1Cases()[0]!.fixture_intent;
const now = new Date("2026-09-19T12:00:00Z");
const image = {
  bytes: encodeRgbaPng(new Uint8Array([20, 20, 20, 255]), 1, 1),
  mimeType: "image/png",
  filename: "fixture.png",
};
const context = {
  image,
  width: 1,
  height: 1,
  seriesCount: 1,
  references: [],
  entityIds: [],
  ocr: { read: async () => ({ text: "", confidence: 1 }) },
  judge: {
    judge: async ({ checks }: { checks: Array<{ id: string; target: string }> }) =>
      checks.map((c) => {
        assert.ok(!/today|current|as of|latest|present.day/i.test(c.target));
        return { id: c.id, passed: true, confidence: 0.95, evidence: "Visual placement matches" };
      }),
  },
};
function certified(): GroundingBundle {
  const b = structuredClone(fixture.bundle) as GroundingBundle;
  b.sources[0].appearanceEvidence = {
    basis: "verified_appearance",
    coverage: visualRequirement(b.validationClaims![0].requirement),
    validFrom: "2026-09-19T00:00:00.000Z",
    validThrough: "2026-09-19T23:59:59.999Z",
  };
  return GroundingBundleSchema.parse(b);
}

test("recorded Sydney visual pass plus historical/undated sources is pass_with_limitation, not PASS", async () => {
  const plan = buildValidationPlan({
    prompt: fixture.prompt,
    intent: fixture.intent,
    groundingBundle: fixture.bundle,
    entities: [],
    selectedCount: 1,
    hasMask: false,
  });
  assert.equal(plan.temporalSupport!.status, "unverified");
  assert.match(
    plan.temporalSupport!.message,
    /authoritative references.*could not be independently verified/,
  );
  const result = await validateResult(plan, context);
  assert.ok(result.checks.every((c) => c.status === "pass"));
  assert.equal(result.verdict, "pass_with_limitation");
  assert.equal(planRepair(result, { hasMask: false, hasReferences: true }), null);
  const signed = signValidationPlan(plan, "qa", "secret");
  assert.deepEqual(verifyValidationPlan(signed, "qa", "secret"), plan);
  assert.deepEqual(
    verifyAssessment(
      signAssessment(result, "qa", "session", "job", "secret"),
      "qa",
      "session",
      "job",
      "secret",
    ),
    result,
  );
  const outcome = await validateAndRepair(
    { image },
    {
      plan,
      context,
      repairPolicy: "platform_absorbs_one_per_request",
      claimRepair: async () => {
        throw Error("Temporal uncertainty must not claim repair");
      },
      save: async () => {},
    },
    async () => {
      throw Error("No image repair permitted");
    },
  );
  assert.equal(outcome.attempts, 0);
  assert.equal(outcome.result.verdict, "pass_with_limitation");
});

test("strong current authoritative support requires trusted coverage and full requested period", () => {
  const b = certified();
  const support = temporalSupport(fixture.prompt, b, fixture.intent, now)!;
  assert.equal(support.status, "verified");
  assert.equal(support.message, "Grounded with current authoritative sources");
  assert.deepEqual(support.supportedBy, ["s1"]);
  for (const modify of [
    (b: GroundingBundle) => {
      b.sources[0].quality = "community";
    },
    (b: GroundingBundle) => {
      b.sources[0].appearanceEvidence!.coverage = "A different landmark";
    },
    (b: GroundingBundle) => {
      b.sources[0].appearanceEvidence!.validThrough = "2026-09-18T23:59:59.999Z";
    },
    (b: GroundingBundle) => {
      b.sources[0].appearanceEvidence!.validFrom = "2026-09-20T00:00:00.000Z";
    },
    (b: GroundingBundle) => {
      b.sources[0].appearanceEvidence = undefined;
      b.createdAt = now.toISOString();
    },
  ]) {
    const changed = certified();
    modify(changed);
    assert.equal(
      temporalSupport(fixture.prompt, changed, fixture.intent, now)!.status,
      "unverified",
    );
  }
  assert.equal(
    temporalSupport(fixture.prompt, b, fixture.intent, new Date("2026-09-20T12:00:00Z"))!.status,
    "unverified",
  );
});

test("all temporal phrasings are separated from visual claims; exact text TODAY is not evidence", () => {
  for (const phrase of [
    "current",
    "today",
    "latest",
    "present-day",
    "as of 2026",
    "as they appear today",
  ])
    assert.equal(
      temporalSupport(`Show ${phrase} harbour architecture`, undefined, intent, now)!.status,
      "unverified",
    );
  assert.equal(temporalSupport("Show a harbour", undefined, intent, now), undefined);
  assert.deepEqual(
    temporalRequests('A poster saying "TODAY"', {
      ...intent,
      exact_text: [{ role: "headline", text: "TODAY" }],
    }),
    [],
  );
  assert.equal(visualRequirement("Create a view as they appear today"), "Create a view");
});

test("as-of-year claims require support covering that year; source dates do not invent support", () => {
  const b = certified();
  const prompt = "Show this harbour as of 2026";
  b.validationClaims = [
    { origin: "user", requirement: prompt, supportedBy: ["s1"], checkableVisually: true },
  ];
  b.sources[0].appearanceEvidence!.coverage = "Show this harbour";
  assert.equal(temporalSupport(prompt, b, intent, now)!.status, "unverified");
  b.sources[0].appearanceEvidence!.validFrom = "2026-01-01T00:00:00.000Z";
  b.sources[0].appearanceEvidence!.validThrough = "2026-12-31T23:59:59.999Z";
  assert.equal(temporalSupport(prompt, b, intent, now)!.status, "verified");
});

test("qualified temporal label persists through grounding refresh/resume storage", () => {
  const state = new Map<string, string>();
  const store = {
    getItem: (k: string) => state.get(k) ?? null,
    setItem: (k: string, v: string) => {
      state.set(k, v);
    },
    removeItem: (k: string) => {
      state.delete(k);
    },
  };
  const support = temporalSupport(fixture.prompt, fixture.bundle, fixture.intent, now)!;
  const grounding = {
    sources: fixture.bundle.sources,
    createdAt: fixture.bundle.createdAt,
    temporalSupport: support,
  };
  saveGroundingResume(
    {
      userId: "qa",
      sessionId: "session",
      input: { prompt: fixture.prompt },
      referenceAssetIds: [],
      grounding,
    },
    store,
  );
  assert.deepEqual(readGroundingResume("qa", store)!.grounding.temporalSupport, support);
});

test("visual failures remain failures/repairable with temporal limitation retained", async () => {
  const plan = buildValidationPlan({
    prompt: fixture.prompt,
    intent: fixture.intent,
    groundingBundle: fixture.bundle,
    entities: [],
    selectedCount: 1,
    hasMask: false,
  });
  const result = await validateResult(plan, {
    ...context,
    judge: {
      judge: async ({ checks }) =>
        checks.map((c) => ({
          id: c.id,
          passed: false,
          confidence: 0.99,
          evidence: "Missing requested landmark",
        })),
    },
  });
  assert.equal(result.verdict, "repairable");
  assert.equal(result.temporalSupport!.status, "unverified");
  assert.ok(planRepair(result, { hasMask: false, hasReferences: true }));
});

test("verified temporal support permits PASS, while uncertainty does not hide visual failure", async () => {
  const base = buildValidationPlan({
    prompt: fixture.prompt,
    intent: fixture.intent,
    groundingBundle: fixture.bundle,
    entities: [],
    selectedCount: 1,
    hasMask: false,
  });
  const plan = {
    ...base,
    temporalSupport: temporalSupport(fixture.prompt, certified(), fixture.intent, now)!,
  };
  assert.equal((await validateResult(plan, context)).verdict, "pass");
  const uncertain = {
    ...base,
    temporalSupport: temporalSupport(fixture.prompt, fixture.bundle, fixture.intent, now)!,
  };
  const result = await validateResult(uncertain, { ...context, judge: undefined });
  assert.equal(result.verdict, "fail");
  assert.equal(result.temporalSupport!.status, "unverified");
});
