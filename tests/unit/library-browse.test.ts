import { test } from "node:test";
import assert from "node:assert/strict";
import { activeTemplates } from "../../src/data/templates.ts";
import {
  buildBrowseEntries,
  availableBrowseCategories,
  filterBrowseEntries,
  browseCategories,
  type BrowseType,
  type BrowseCategory,
} from "../../src/lib/library-browse.ts";
import type { LibraryPrompt } from "../../src/types/library.ts";

const prompts: LibraryPrompt[] = [
  {
    id: "legacy",
    source: "curated",
    title: "Studio product",
    category: "Open-Ended Creative",
    prompt: "Photograph an amber bottle on a plinth",
    tags: ["product"],
    target_model: "gpt-image-2",
  },
  {
    id: "poster",
    source: "curated",
    title: "Kyoto poster",
    category: "Posters",
    prompt: "Print KYOTO above the scene",
    target_model: "gpt-image-2.5",
  },
];
const poster = activeTemplates.find((t) => t.slug === "poster-flyer")!;
const images = ["0BE55AAE-0160-4BE9-8637-3D22FD96220D.PNG", "editorial-portrait.webp"];
const entries = buildBrowseEntries(prompts, [poster], images);
const defaults = {
  tab: "all" as BrowseType,
  q: "",
  category: "All" as BrowseCategory,
  collection: "all",
  favorites: false,
};

test("All mixes content types, preserves existing favorite keys, and never duplicates entries", () => {
  assert.deepEqual(
    entries.slice(0, 3).map((e) => e.type),
    ["prompts", "templates", "gallery"],
  );
  assert.equal(entries[0].key, "curated-poster");
  assert.equal(entries.length, prompts.length + 1 + images.length);
  assert.equal(new Set(entries.map((e) => e.key)).size, entries.length);
  assert.deepEqual(
    prompts.map((p) => p.id),
    ["legacy", "poster"],
    "does not mutate source order",
  );
});

test("shared categories filter prompt and template tasks together", () => {
  const matches = filterBrowseEntries(entries, { ...defaults, category: "Posters" }, new Set());
  assert.deepEqual(
    matches.map((e) => e.type),
    ["prompts", "templates"],
  );
  assert.ok(browseCategories("product photography").includes("Products"));
  assert.deepEqual(browseCategories("a quiet room interior"), ["Interiors"]);
});

test("universal search covers prompt text, template tasks and reference labels", () => {
  assert.equal(
    filterBrowseEntries(entries, { ...defaults, q: "AMBER bottle" }, new Set())[0]?.key,
    "curated-legacy",
  );
  assert.ok(
    filterBrowseEntries(entries, { ...defaults, q: poster.best_for }, new Set()).some(
      (e) => e.type === "templates",
    ),
  );
  assert.equal(
    filterBrowseEntries(
      entries,
      { ...defaults, q: "editorial portrait", tab: "gallery" },
      new Set(),
    ).length,
    1,
  );
  assert.equal(
    filterBrowseEntries(entries, { ...defaults, q: "kyoto", tab: "templates" }, new Set()).length,
    0,
  );
});

test("unlabeled gallery references have honest stable titles and categories", () => {
  const reference = entries.find((e) => e.type === "gallery")!;
  assert.equal(reference.title, "Gallery reference 1");
  assert.deepEqual(reference.categories, ["Reference"]);
  const filtered = filterBrowseEntries(entries, { ...defaults, q: "editorial" }, new Set());
  assert.equal(filtered.find((entry) => entry.type === "gallery")?.title, "editorial portrait");
});

test("favorites intersect search and type across all content, including existing prompt saves", () => {
  const ids = new Set(["curated-legacy", `template-${poster.slug}`, `reference-${images[0]}`]);
  assert.equal(filterBrowseEntries(entries, { ...defaults, favorites: true }, ids).length, 3);
  assert.equal(
    filterBrowseEntries(entries, { ...defaults, favorites: true, tab: "prompts" }, ids)[0]?.key,
    "curated-legacy",
  );
  assert.equal(
    filterBrowseEntries(entries, { ...defaults, favorites: true, q: "kyoto" }, ids).length,
    0,
  );
});

test("collection filtering applies only to prompts and composes with other filters", () => {
  const matches = filterBrowseEntries(
    entries,
    { ...defaults, collection: "gpt-image-2.5" },
    new Set(),
  );
  assert.deepEqual(
    matches.map((e) => e.key),
    ["curated-poster"],
  );
  assert.equal(
    filterBrowseEntries(
      entries,
      { ...defaults, collection: "gpt-image-2.5", tab: "gallery" },
      new Set(),
    ).length,
    images.length,
  );
  assert.equal(filterBrowseEntries([], defaults, new Set()).length, 0);
});

test("category options follow the selected content type and omit empty categories", () => {
  assert.deepEqual(availableBrowseCategories(entries, "prompts"), ["All", "Posters", "Products"]);
  const templateCategories = availableBrowseCategories(entries, "templates");
  assert.ok(templateCategories.includes("Posters"));
  assert.ok(!templateCategories.includes("Food"));
  assert.deepEqual(availableBrowseCategories(entries, "gallery"), [
    "All",
    "Portraits",
    "Editorial",
    "Reference",
  ]);
  assert.deepEqual(availableBrowseCategories([], "gallery"), ["All"]);
});
