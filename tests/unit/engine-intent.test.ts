import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INTENT_CONTRACT,
  IntentSchema,
  applyIntentOverrides,
  buildIntentUserMessage,
  type Intent,
} from "../../src/lib/prompt-engine/intent.ts";
import { parseExplicitRatio, normalizeRatio } from "../../src/lib/prompt-engine/ratio.ts";
import {
  toCategoryId,
  toCategoryLabel,
  CATEGORY_IDS,
} from "../../src/lib/prompt-engine/categories.ts";
import {
  detailForIntent,
  isReferenceIntent,
  prefersLossless,
} from "../../src/lib/prompt-engine/reference.ts";

function baseIntent(over: Partial<Intent> = {}): Intent {
  return {
    task: "create",
    category: "cinematic",
    reference_intent: "none",
    aspect_ratio: { source: "none", value: null },
    exact_text: [],
    requested_changes: [],
    must_preserve: [],
    transparent_background: false,
    creative_freedom: "medium",
    series: {
      enabled: false,
      continuation: false,
      count: null,
      unit: null,
      consistency_requirements: [],
    },
    factual_requirements: {
      user_supplied_facts: [],
      missing_facts: [],
      placeholders_required: false,
    },
    ambiguity: { blocking: false, reason: null },
    ...over,
  };
}

test("intent schema is strict and its JSON schema uses type:[X,null] for nullables", () => {
  assert.equal(IntentSchema.safeParse(baseIntent()).success, true);
  assert.equal(IntentSchema.safeParse({ ...baseIntent(), extra: 1 }).success, false);
  const js = INTENT_CONTRACT.jsonSchema as {
    additionalProperties: boolean;
    properties: Record<string, unknown>;
    required: string[];
  };
  assert.equal(js.additionalProperties, false);
  assert.deepEqual([...js.required].sort(), Object.keys(js.properties).sort());
  const ar = (js.properties.aspect_ratio as { properties: { value: { type: unknown } } }).properties
    .value;
  assert.deepEqual(ar.type, ["string", "null"]);
  assert.equal(JSON.stringify(js).includes('"anyOf"'), false, "no anyOf left in strict schema");
});

test("explicit ratio parsing: literal ratios and unambiguous platform formats only", () => {
  assert.deepEqual(parseExplicitRatio("hero image 16:9 of a lake")?.value, "16:9");
  assert.deepEqual(parseExplicitRatio("a 4:5 product shot")?.value, "4:5");
  assert.deepEqual(parseExplicitRatio("2.39:1 cinema still")?.value, "2.39:1");
  assert.equal(parseExplicitRatio("youtube thumbnail about x")?.value, "16:9");
  assert.equal(parseExplicitRatio("Instagram Story for coffee")?.value, "9:16");
  assert.equal(parseExplicitRatio("pinterest pin recipe card")?.value, "2:3");
  assert.equal(parseExplicitRatio("square format album cover")?.value, "1:1");
});

test("explicit ratio parsing: previously observed false positives are NOT ratios", () => {
  for (const s of [
    "portrait of a woman in a red coat",
    "a story about loneliness, told in one image",
    "Times Square at night in the rain",
    "vertical garden wall in a hotel lobby",
    "landscape painting of Tuscan hills",
    "banner year celebration cake",
    "cinematic lighting on a perfume bottle",
    "meeting at 10:30 am poster",
    "the score was 3:45 pm",
  ]) {
    assert.equal(parseExplicitRatio(s), null, s);
  }
  assert.equal(normalizeRatio("16 x 9"), "16:9");
  assert.equal(normalizeRatio("4/5 portrait"), "4:5");
  assert.equal(normalizeRatio("wide"), null);
});

test("category mapping accepts legacy labels and ids", () => {
  assert.equal(toCategoryId("POSTER/COVER"), "poster");
  assert.equal(toCategoryId("INTERIOR/ARCH/FOOD/FASHION"), "product");
  assert.equal(toCategoryId("image_edit"), "image_edit");
  assert.equal(toCategoryId("auto"), null);
  assert.equal(toCategoryId("nope"), null);
  for (const id of CATEGORY_IDS) assert.equal(toCategoryId(toCategoryLabel(id)), id);
});

test("reference intent mapping and detail routing", () => {
  assert.equal(isReferenceIntent("style"), true);
  assert.equal(isReferenceIntent("auto"), false);
  assert.equal(detailForIntent("subject_identity"), "high");
  assert.equal(detailForIntent("edit_source"), "high");
  assert.equal(detailForIntent("product_object"), "high");
  assert.equal(detailForIntent("sketch_layout"), "high");
  assert.equal(detailForIntent("composition"), "high");
  assert.equal(detailForIntent("style"), "low");
  assert.equal(prefersLossless("sketch_layout"), true);
  assert.equal(prefersLossless("style"), false);
});

test("overrides: explicit UI reference intent beats analyzer; no image forces none; image+none → style", () => {
  const a = applyIntentOverrides(baseIntent({ reference_intent: "edit_source" }), {
    userInput: "x",
    hasImage: true,
    referenceIntentOverride: "style",
  });
  assert.equal(a.intent.reference_intent, "style");
  assert.ok(a.notes.applied.some((n) => n.includes("explicit selection")));

  const b = applyIntentOverrides(baseIntent({ reference_intent: "subject_identity" }), {
    userInput: "x",
    hasImage: false,
  });
  assert.equal(b.intent.reference_intent, "none");

  const c = applyIntentOverrides(baseIntent({ reference_intent: "none" }), {
    userInput: "x",
    hasImage: true,
    referenceIntentOverride: "auto",
  });
  assert.equal(c.intent.reference_intent, "style");
});

test("overrides: literal ratio beats analyzer; analyzer ratio is normalized or dropped", () => {
  const a = applyIntentOverrides(
    baseIntent({ aspect_ratio: { source: "inferred", value: "9:16" } }),
    {
      userInput: "16:9 hero image",
      hasImage: false,
    },
  );
  assert.deepEqual(a.intent.aspect_ratio, { source: "explicit", value: "16:9" });

  const b = applyIntentOverrides(
    baseIntent({ aspect_ratio: { source: "inferred", value: "16 x 9" } }),
    { userInput: "wide shot", hasImage: false },
  );
  assert.deepEqual(b.intent.aspect_ratio, { source: "inferred", value: "16:9" });

  const c = applyIntentOverrides(
    baseIntent({ aspect_ratio: { source: "inferred", value: "tall" } }),
    { userInput: "wallpaper", hasImage: false },
  );
  assert.deepEqual(c.intent.aspect_ratio, { source: "none", value: null });
});

test("overrides: explicit category hint wins; edit/series/remix task consistency", () => {
  const a = applyIntentOverrides(baseIntent({ category: "cinematic" }), {
    userInput: "x",
    hasImage: false,
    categoryOverride: "poster",
  });
  assert.equal(a.intent.category, "poster");

  const b = applyIntentOverrides(baseIntent({ task: "create", reference_intent: "edit_source" }), {
    userInput: "x",
    hasImage: true,
  });
  assert.equal(b.intent.task, "edit");

  const c = applyIntentOverrides(
    baseIntent({
      series: {
        enabled: false,
        continuation: false,
        count: 5,
        unit: "panel",
        consistency_requirements: [],
      },
    }),
    { userInput: "x", hasImage: false },
  );
  assert.equal(c.intent.series.enabled, true);
  assert.equal(c.intent.task, "series");

  const d = applyIntentOverrides(baseIntent(), {
    userInput: "x",
    hasImage: false,
    remixRef: "ref",
  });
  assert.equal(d.intent.task, "remix");
});

test("analyzer user message states explicit choices as authoritative", () => {
  const m = buildIntentUserMessage({
    userInput: " idea ",
    hasImage: true,
    referenceIntentOverride: "subject_identity",
    categoryOverride: "poster",
    remixRef: "R",
  });
  assert.match(m, /explicitly selected reference intent: subject_identity/);
  assert.match(m, /explicitly selected category: poster/);
  assert.match(m, /REMIX REFERENCE/);
  assert.ok(m.endsWith("REQUEST:\nidea"));
  const n = buildIntentUserMessage({ userInput: "x", hasImage: false });
  assert.match(n, /No reference image is attached/);
});
