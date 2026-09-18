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
    userInput: 'two matching posters with shared headline "FRESH DAILY"',
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

test("scene descriptions never become renderable text, including quoted scene names", async () => {
  const scenes = ["studio", "beach", "pool", "city at night"];
  const out = await decomposeSeries({
    userInput: 'Four advertisements: "studio", "beach", "pool", "city at night".',
    intent: { ...createIntent, exact_text: scenes.map((text) => ({ role: "label", text })) },
    selectedCount: 4,
    complete: async () => ({
      title: "Scenes",
      children: scenes.map((prompt) => ({ label: prompt, prompt })),
    }),
  });
  for (const child of out.children) assert.doesNotMatch(child.prompt, /Render this exact text/);
});

test("explicit shared campaign headline appears in every child", async () => {
  const out = await decomposeSeries({
    userInput: 'Four scenes with shared campaign headline "Made for Summer".',
    intent: { ...createIntent, exact_text: [{ role: "headline", text: "Made for Summer" }] },
    selectedCount: 4,
    complete: async () => ({ title: "Campaign", children: [] }),
  });
  for (const child of out.children)
    assert.match(child.prompt, /Render this exact text verbatim: headline: "Made for Summer"/);
});

test("different copy per child never propagates to other children", async () => {
  const out = await decomposeSeries({
    userInput: 'Image 1 headline says "Rise Early"; image 2 caption: "Stay Late".',
    intent: {
      ...createIntent,
      exact_text: [
        { role: "headline", text: "Rise Early" },
        { role: "caption", text: "Stay Late" },
      ],
    },
    selectedCount: 2,
    complete: async () => ({
      title: "Day",
      children: [
        { label: "Morning", prompt: "Sunrise" },
        { label: "Evening", prompt: "Sunset" },
      ],
    }),
  });
  assert.match(out.children[0].prompt, /Rise Early/);
  assert.doesNotMatch(out.children[0].prompt, /Stay Late/);
  assert.match(out.children[1].prompt, /Stay Late/);
  assert.doesNotMatch(out.children[1].prompt, /Rise Early/);
});

test("outage fallback and over-broad model copy cannot leak numbered child copy", async () => {
  for (const fail of [false, true]) {
    const out = await decomposeSeries({
      userInput: 'Image 1 headline "Dawn", and image 2 headline "Dusk".',
      intent: {
        ...createIntent,
        exact_text: [
          { role: "headline", text: "Dawn" },
          { role: "headline", text: "Dusk" },
        ],
      },
      selectedCount: 2,
      complete: async () => {
        if (fail) throw new Error("outage");
        return {
          title: "Day",
          children: [
            { label: "A", prompt: 'Render "Dawn" and "Dusk".' },
            { label: "B", prompt: 'Render "Dawn" and "Dusk".' },
          ],
        };
      },
    });
    assert.match(out.children[0].prompt, /Dawn/);
    assert.doesNotMatch(out.children[0].prompt, /Dusk/);
    assert.match(out.children[1].prompt, /Dusk/);
    assert.doesNotMatch(out.children[1].prompt, /Dawn/);
  }
});

test("copy cues must apply to the phrase, not an unrelated scene in the same sentence", async () => {
  const out = await decomposeSeries({
    userInput: 'Shared headline "Summer Starts Here" in studio, beach, pool and city at night.',
    intent: {
      ...createIntent,
      exact_text: ["Summer Starts Here", "studio", "beach", "pool", "city at night"].map(
        (text) => ({ role: "headline", text }),
      ),
    },
    selectedCount: 1,
    complete: async () => ({
      title: "Campaign",
      children: [{ label: "Studio", prompt: "Studio photo" }],
    }),
  });
  assert.match(out.children[0].prompt, /headline: "Summer Starts Here"/);
  assert.doesNotMatch(out.children[0].prompt, /headline: "(?:studio|beach|pool|city at night)"/);
});

test("scene-qualified copy stays local", async () => {
  const out = await decomposeSeries({
    userInput: 'Beach: caption "Find the Tide"; City: caption "Follow the Lights".',
    intent: {
      ...createIntent,
      exact_text: ["Find the Tide", "Follow the Lights"].map((text) => ({ role: "caption", text })),
    },
    selectedCount: 2,
    complete: async () => ({
      title: "Places",
      children: [
        { label: "Beach", prompt: "Beach photo" },
        { label: "City", prompt: "City photo" },
      ],
    }),
  });
  assert.match(out.children[0].prompt, /Find the Tide/);
  assert.doesNotMatch(out.children[0].prompt, /Follow the Lights/);
  assert.match(out.children[1].prompt, /Follow the Lights/);
  assert.doesNotMatch(out.children[1].prompt, /Find the Tide/);
});
