import { createImageRecovery } from "../../src/lib/image-recovery.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GALLERY_IMAGES } from "../../src/data/gallery-images.ts";
import { GALLERY_METADATA } from "../../src/data/gallery-metadata.ts";
import { buildBrowseEntries, filterBrowseEntries } from "../../src/lib/library-browse.ts";
import { groupCreations } from "../../src/lib/profile/creation-groups.ts";
import type { CreationItem } from "../../src/lib/profile/client.ts";
import { generationMetric } from "../../src/lib/generation/telemetry.ts";
import { savedCreationDetails } from "../../src/lib/profile/creation-detail.ts";

test("every curated Gallery asset has reviewed searchable metadata without visible file IDs", () => {
  const entries = buildBrowseEntries([], [], GALLERY_IMAGES);
  for (const entry of entries) {
    assert.ok(GALLERY_METADATA[entry.type === "gallery" ? entry.filename : ""]);
    assert.doesNotMatch(entry.title, /Gallery (reference|photo) \d|IMG_|[0-9A-F]{8}-/);
  }
  for (const q of [
    "portrait",
    "product",
    "poster",
    "UI",
    "character",
    "automotive",
    "editorial",
    "matcha",
    "dashboard",
    "cat",
  ]) {
    assert.ok(
      filterBrowseEntries(
        entries,
        { tab: "gallery", q, category: "All", collection: "all", favorites: false },
        new Set(),
      ).length > 0,
      q,
    );
  }
});
const item = (id: string, sessionId: string | null, seriesIndex: number | null): CreationItem => ({
  id,
  sessionId,
  seriesIndex,
  jobId: id,
  seriesLabel: `Scene ${id}`,
  url: null,
  width: 10,
  height: 10,
  prompt: "test",
  createdAt: "2026-09-24",
  operation: "generate",
  parentVersionId: null,
  model: "flare",
});
test("series grouping survives interleaving, page appends, duplicate rows, and singleton pages", () => {
  const a = item("a", "series", 1),
    b = item("b", "other", null),
    c = item("c", "series", 0);
  assert.equal(groupCreations([a])[0].kind, "series");
  const groups = groupCreations([a, b, c, a]);
  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups[0].items.map((i) => i.id),
    ["c", "a"],
  );
  assert.equal(groups[0].items[0].seriesLabel, "Scene c");
});
test("saved series preserves failed and deleted children without inventing saved images", () => {
  const detail = savedCreationDetails(
    [item("a", "series", 0)],
    [
      {
        id: "a",
        operation: "generate",
        status: "succeeded",
        series_index: 0,
        series_label: "First",
      },
      { id: "b", operation: "generate", status: "failed", series_index: 1, series_label: "Second" },
      {
        id: "c",
        operation: "generate",
        status: "succeeded",
        series_index: 2,
        series_label: "Third",
      },
    ],
    {},
  );
  assert.deepEqual(
    detail.series?.map((i) => [i.label, i.status, i.available]),
    [
      ["First", "Completed", true],
      ["Second", "Failed", false],
      ["Third", "Completed", false],
    ],
  );
});
test("telemetry omits unrecognized content fields and never throws on logger failure", () => {
  let output = "";
  generationMetric(
    "generation_completed",
    { outcome: "succeeded", durationMs: 10, prompt: "private", image: "private" } as Parameters<
      typeof generationMetric
    >[1],
    (value) => {
      output = value;
    },
  );
  assert.deepEqual(JSON.parse(output), {
    event: "generation_completed",
    outcome: "succeeded",
    durationMs: 10,
  });
  assert.doesNotThrow(() =>
    generationMetric("generation_requested", {}, () => {
      throw Error("logger");
    }),
  );
});
test("grounding kill switch guards persisted snapshot image retrieval", () => {
  const source = readFileSync("src/routes/api/generation/jobs.$id.run.ts", "utf8");
  assert.match(
    source,
    /if \(process\.env\.GROUNDING_ENABLED === "true" && session\.plan_json\?\.grounding\)/,
  );
});

test("image recovery is bounded across concurrent errors, rejected refreshes, and broken replacements", async () => {
  const recover = createImageRecovery();
  let calls = 0;
  const refresh = async () => {
    calls++;
    return "https://example.test/refreshed.png";
  };
  const results = await Promise.all([recover(refresh), recover(refresh)]);
  assert.deepEqual(results, ["https://example.test/refreshed.png", null]);
  assert.equal(await recover(refresh), null);
  assert.equal(calls, 1);
  const failed = createImageRecovery();
  assert.equal(
    await failed(async () => {
      throw Error("expired");
    }),
    null,
  );
  assert.equal(await failed(refresh), null);
  assert.equal(calls, 1);
  assert.equal(await createImageRecovery()(refresh), "https://example.test/refreshed.png");
});
