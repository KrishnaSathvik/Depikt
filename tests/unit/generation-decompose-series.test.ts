import { test } from "node:test";
import assert from "node:assert/strict";
import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";
import { decomposeSeries } from "../../src/lib/generation/decompose-series.ts";

const createIntent = loadVnext1Cases().find(
  (testCase) => testCase.fixture_intent.task === "create",
)!.fixture_intent;

test("pads or truncates to selectedCount and forbids collage wording", async () => {
  const out = await decomposeSeries({
    userInput: "three poster concepts for a coffee shop",
    intent: createIntent,
    selectedCount: 3,
    complete: async () => ({
      title: "posters",
      children: [
        { label: "A", prompt: "collage of three posters" },
        { label: "B", prompt: "poster B" },
      ],
    }),
  });
  assert.equal(out.children.length, 3);
  assert.match(out.children[0]!.prompt, /standalone image/i);
  assert.equal(
    out.children[0]!.prompt.replace(
      "This is a single standalone image, not a collage.",
      "",
    ).includes("collage"),
    false,
  );
});

test("appends shared intent constraints after truncating", async () => {
  const intent = {
    ...createIntent,
    aspect_ratio: { source: "explicit" as const, value: "9:16", evidence: null },
    exact_text: [{ role: "headline", text: "FRESH DAILY" }],
    series: {
      ...createIntent.series,
      consistency_requirements: ["Use the same color palette"],
    },
  };
  const out = await decomposeSeries({
    userInput: "two matching posters",
    intent,
    selectedCount: 1,
    complete: async () => ({
      title: "posters",
      children: [
        { label: "A", prompt: "first poster" },
        { label: "B", prompt: "second poster" },
      ],
    }),
  });
  assert.equal(out.children.length, 1);
  assert.match(out.children[0]!.prompt, /9:16/);
  assert.match(out.children[0]!.prompt, /FRESH DAILY/);
  assert.match(out.children[0]!.prompt, /Use the same color palette/);
});

test("uses selectedCount fallbacks when injected completion rejects", async () => {
  const out = await decomposeSeries({
    userInput: "three matching product images",
    intent: createIntent,
    selectedCount: 3,
    complete: async () => {
      throw new Error("upstream failed");
    },
  });
  assert.equal(out.children.length, 3);
  assert.deepEqual(
    out.children.map((child) => child.label),
    ["Image 1", "Image 2", "Image 3"],
  );
  for (const child of out.children) {
    assert.match(child.prompt, /three matching product images/);
    assert.match(child.prompt, /This is a single standalone image, not a collage\./);
  }
});
