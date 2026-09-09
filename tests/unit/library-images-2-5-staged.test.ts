// Phase 4: mixed GPT Image 2 + ChatGPT Images 2.5 library metadata, the
// staged batch-1 records, public visibility, filtering and sorting.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  MODEL_HINTS,
  PROMPT_STATUSES,
  REFERENCE_MODES,
  SOURCE_TYPES,
  SOURCE_TYPE_LABELS,
  STATUS_LABELS,
  filterByCategory,
  filterByModel,
  filterBySourceType,
  filterByStatus,
  filterPublic,
  isPublicStatus,
  mergeById,
  normalizeReferenceMode,
  normalizeSourceType,
  normalizeStatus,
  orderForDisplay,
  slugify,
  sortNewest,
} from "../../src/lib/library-metadata.ts";
import { availableCollections, shouldShowCollectionFilter } from "../../src/lib/target-model.ts";
import { publicStagedPrompts, stagedImages25Prompts } from "../../src/data/images-2-5-staged.ts";
import { curatedPrompts } from "../../src/data/curated-prompts.ts";
import { IMAGES_25_LIBRARY_COUNT, LIBRARY_PROMPT_COUNT } from "../../src/lib/product.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const LIBRARY_CATEGORIES = new Set(curatedPrompts.map((p) => p.category));
// The generated legacy file has no target_model field; widen for the collection helpers.
type ModelRow = { target_model?: unknown };
const asRows = (xs: unknown[]) => xs as ModelRow[];

/** Rows promoted to Supabase, parsed from the export SQL (the record of the promotion). */
const promoted = [
  ...read("supabase/insert-images-2-5-batch1-staged.sql").matchAll(
    /\) VALUES \(\n {2}'([^']+)',\n {2}'([^']+)',[\s\S]*?\n {2}'(gpt-image-[0-9.]+)',\n {2}'([a-z_]+)',[\s\S]*?\n {2}'(draft|test_ready|tested|approved)',\n {2}(true|false),\n {2}(true|false),[\s\S]*?\n {2}(?:'([^']+)'|NULL),\n {2}'[^']+',\n {2}'[^']+'\n\) ON CONFLICT/g,
  ),
].map((m) => ({
  id: m[1],
  slug: m[2],
  target_model: m[3],
  source_type: m[4],
  status: m[5],
  generation_ready: m[6] === "true",
  gallery_ready: m[7] === "true",
  thumbnail_url: m[8],
}));

// ---------- vocabularies ----------

test("metadata vocabularies match the phase spec", () => {
  assert.deepEqual(
    [...SOURCE_TYPES],
    ["official_prompt", "official_inspired", "community_inspired", "depikt_original"],
  );
  assert.deepEqual([...PROMPT_STATUSES], ["draft", "test_ready", "tested", "approved"]);
  assert.deepEqual(
    [...REFERENCE_MODES],
    [
      "none",
      "identity",
      "style",
      "product",
      "composition",
      "sketch",
      "multi_reference",
      "edit_source",
    ],
  );
  assert.deepEqual([...MODEL_HINTS], ["flare", "sunburst", "either"]);
  for (const s of PROMPT_STATUSES) assert.ok(STATUS_LABELS[s]);
  for (const s of SOURCE_TYPES) assert.ok(SOURCE_TYPE_LABELS[s]);
});

test("normalizers: legacy rows (no columns) read as approved / depikt_original / none", () => {
  assert.equal(normalizeStatus(undefined), "approved");
  assert.equal(normalizeStatus(null), "approved");
  assert.equal(normalizeStatus("bogus"), "approved");
  assert.equal(normalizeStatus("test_ready"), "test_ready");
  assert.equal(normalizeSourceType(undefined), "depikt_original");
  assert.equal(normalizeSourceType("official_prompt"), "official_prompt");
  assert.equal(normalizeReferenceMode(undefined), "none");
  assert.equal(normalizeReferenceMode("multi_reference"), "multi_reference");
});

// ---------- visibility ----------

test("only approved prompts are public; legacy rows without status stay public", () => {
  assert.equal(isPublicStatus(undefined), true);
  assert.equal(isPublicStatus("approved"), true);
  for (const s of ["draft", "test_ready", "tested"]) assert.equal(isPublicStatus(s), false);

  const rows = [
    { id: "legacy", status: undefined },
    { id: "a", status: "approved" },
    { id: "b", status: "test_ready" },
    { id: "c", status: "draft" },
  ];
  assert.deepEqual(
    filterPublic(rows).map((r) => r.id),
    ["legacy", "a"],
  );
});

test("staging is work in progress only: no approved record is served from the repo", () => {
  assert.equal(publicStagedPrompts().length, 0);
  for (const p of stagedImages25Prompts) assert.notEqual(p.status, "approved", p.id);
  // The promoted rows live in Supabase; the export SQL is the record of what was promoted.
  assert.equal(promoted.length, IMAGES_25_LIBRARY_COUNT);
  const publicLibrary = asRows([
    ...curatedPrompts,
    ...promoted.map((r) => ({ target_model: "gpt-image-2.5" })),
  ]);
  assert.equal(shouldShowCollectionFilter(publicLibrary), true);
  assert.deepEqual(
    availableCollections(publicLibrary).map((c) => [c.value, c.count]),
    [
      ["all", LIBRARY_PROMPT_COUNT],
      ["gpt-image-2", 500],
      ["gpt-image-2.5", IMAGES_25_LIBRARY_COUNT],
    ],
  );
});

test("mergeById: a database row wins over the staged copy with the same id", () => {
  const db = [{ id: "x", status: "approved", category: "db" }];
  const staged = [
    { id: "x", status: "approved", category: "staged" },
    { id: "y", status: "approved", category: "staged" },
  ];
  const merged = mergeById(db, staged);
  assert.deepEqual(
    merged.map((m) => [m.id, m.category]),
    [
      ["x", "db"],
      ["y", "staged"],
    ],
  );
});

// ---------- filtering / sorting ----------

test("filters: model, status, source type, category; sort: newest first", () => {
  const rows = [
    { id: "1", target_model: "gpt-image-2", category: "Posters", created_at: "2026-01-01" },
    {
      id: "2",
      target_model: "gpt-image-2.5",
      status: "test_ready",
      source_type: "official_prompt",
      category: "Image Edits",
      created_at: "2026-09-09",
    },
    {
      id: "3",
      target_model: "gpt-image-2.5",
      status: "draft",
      source_type: "community_inspired",
      category: "Posters",
      created_at: "2026-09-08",
    },
    { id: "4", category: "Posters" },
  ];
  assert.deepEqual(
    filterByModel(rows, "gpt-image-2").map((r) => r.id),
    ["1", "4"],
  );
  assert.deepEqual(
    filterByModel(rows, "gpt-image-2.5").map((r) => r.id),
    ["2", "3"],
  );
  assert.equal(filterByModel(rows, "all").length, 4);
  assert.deepEqual(
    filterByStatus(rows, "approved").map((r) => r.id),
    ["1", "4"],
  );
  assert.deepEqual(
    filterByStatus(rows, "draft").map((r) => r.id),
    ["3"],
  );
  assert.deepEqual(
    filterBySourceType(rows, "depikt_original").map((r) => r.id),
    ["1", "4"],
  );
  assert.deepEqual(
    filterBySourceType(rows, "official_prompt").map((r) => r.id),
    ["2"],
  );
  assert.deepEqual(
    filterByCategory(rows, "Posters").map((r) => r.id),
    ["1", "3", "4"],
  );
  assert.deepEqual(
    sortNewest(rows).map((r) => r.id),
    ["2", "3", "1", "4"],
  );
  // sortNewest does not mutate
  assert.equal(rows[0].id, "1");
});

test("slugify", () => {
  assert.equal(slugify("'80s Portrait Transformation"), "80s-portrait-transformation");
  assert.equal(slugify("3×3 Social Poster Grid"), "3-3-social-poster-grid");
});

// ---------- the 24 staged records ----------

// ---------- batch 1: promoted rows (from the export SQL) and held rows (staged) ----------

test("batch 1: 23 promoted + 1 held = 24 unique ids and slugs, none colliding with legacy", () => {
  const all = [...promoted.map((r) => ({ id: r.id, slug: r.slug })), ...stagedImages25Prompts];
  assert.equal(all.length, 24);
  assert.equal(new Set(all.map((p) => p.id)).size, 24);
  assert.equal(new Set(all.map((p) => p.slug)).size, 24);
  const legacyIds = new Set(curatedPrompts.map((p) => p.id));
  for (const p of all) {
    assert.ok(p.id.startsWith("images25-"), p.id);
    assert.equal(legacyIds.has(p.id), false, `id collides with legacy: ${p.id}`);
    assert.equal(p.slug, slugify(p.slug), `slug not normalized: ${p.slug}`);
  }
});

test("batch 1: promoted rows are approved, gpt-image-2.5, thumbnailed, and split 17/6 on gallery_ready", () => {
  for (const r of promoted) {
    assert.equal(r.status, "approved", r.id);
    assert.equal(r.target_model, "gpt-image-2.5", r.id);
    assert.equal(r.thumbnail_url, `/library/images-2-5/${r.slug}.webp`, r.id);
    assert.ok(existsSync(resolve(ROOT, `public${r.thumbnail_url}`)), `${r.id} thumbnail missing`);
    assert.ok(SOURCE_TYPES.includes(r.source_type as (typeof SOURCE_TYPES)[number]), r.id);
  }
  assert.equal(promoted.filter((r) => r.gallery_ready).length, 17);
  assert.equal(promoted.filter((r) => !r.gallery_ready).length, 6);
});

test("batch 1: the three OpenAI edit lines were promoted with the published captions, verbatim", () => {
  const edits = JSON.parse(read("research/images-2-5-community/openai-100-edits.json"))
    .edits as Array<{
    edit: number;
    prompt: string;
  }>;
  const byNo = new Map(edits.map((e) => [e.edit, e.prompt]));
  const sql = read("supabase/insert-images-2-5-batch1-staged.sql");
  for (const n of [3, 30, 45]) assert.ok(sql.includes(byNo.get(n)!), `edit ${n} not verbatim`);
  assert.ok(sql.includes("Show me what I would look like if I was in the '80s."));
});

test("held records: complete, run, not approved, not gallery_ready, no thumbnail", () => {
  assert.ok(stagedImages25Prompts.length >= 1);
  for (const p of stagedImages25Prompts) {
    assert.equal(p.target_model, "gpt-image-2.5");
    assert.ok(p.prompt.length > 80, p.id);
    assert.ok((p.why_it_works ?? "").length > 40, p.id);
    assert.ok(LIBRARY_CATEGORIES.has(p.category), `${p.id} category ${p.category}`);
    assert.ok(p.tags.length >= 3, p.id);
    assert.ok(SOURCE_TYPES.includes(p.source_type), p.id);
    assert.ok(REFERENCE_MODES.includes(p.reference_mode), p.id);
    assert.ok(p.source_creator, p.id);
    assert.ok(p.review_notes.length > 20, p.id);
    assert.ok(p.review.success && p.review.failure && p.review.check_first, p.id);
    assert.ok(MODEL_HINTS.includes(p.review.model_hint), p.id);
    assert.equal(p.gallery_ready, false, p.id);
    assert.equal(p.thumbnail_url, undefined, p.id);
    if (p.status === "tested") {
      assert.ok(p.model_used, p.id);
      assert.ok(
        (p.outcome_notes ?? "").length > 40,
        `${p.id} a held tested record must explain why`,
      );
    }
    if (p.reference_mode === "none") assert.equal(p.needs_reference_images, false, p.id);
    else assert.equal(p.needs_reference_images, true, p.id);
  }
  const held = stagedImages25Prompts.find((p) => p.slug === "multi-turn-infographic-edits");
  assert.ok(held);
  assert.equal(held.status, "tested");
});

test("legacy GPT Image 2 data is untouched: 500 rows, no provenance fields, no images25 ids", () => {
  assert.equal(curatedPrompts.length, 500);
  for (const p of curatedPrompts) {
    assert.equal("status" in p, false);
    assert.equal("source_type" in p, false);
    assert.equal(p.id.startsWith("images25-"), false);
  }
});

// ---------- files / wiring ----------

test("provenance migration adds the columns, defaults legacy rows to approved, and constrains vocabularies", () => {
  const sql = read(
    "supabase/migrations/20260909120000_add_prompt_provenance_to_curated_prompts.sql",
  );
  assert.match(sql, /ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'depikt_original'/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS gallery_ready boolean NOT NULL DEFAULT false/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS generation_ready boolean NOT NULL DEFAULT false/);
  assert.match(sql, /CHECK \(status IN \('draft', 'test_ready', 'tested', 'approved'\)\)/);
  assert.match(
    sql,
    /CHECK \(reference_mode IN \('none', 'identity', 'style', 'product', 'composition', 'sketch', 'multi_reference', 'edit_source'\)\)/,
  );
  assert.match(sql, /UNIQUE \(slug\)/);
});

test("export SQL is an approved-only idempotent upsert that does not re-run the migration", () => {
  const sql = read("supabase/insert-images-2-5-batch1-staged.sql");
  assert.equal((sql.match(/INSERT INTO public\.curated_prompts/g) ?? []).length, promoted.length);
  for (const p of stagedImages25Prompts) {
    assert.equal(sql.includes(`'${p.id}'`), false, `${p.id} must not be exported`);
  }
  assert.match(sql, /ON CONFLICT \(id\) DO UPDATE/);
  assert.doesNotMatch(sql, /Requires:.*migration/);
});

test("library fetch layer filters to public rows, merges staged records by id, and falls back per migration", () => {
  const lib = read("src/lib/library.ts");
  assert.match(lib, /filterPublic\(/);
  assert.match(lib, /mergeById\(curated, publicStagedPrompts\(\)\)/);
  assert.match(lib, /\[PROVENANCE_COLUMNS, MODEL_COLUMNS, CURATED_COLUMNS\]/);
  const route = read("src/routes/library.tsx");
  assert.match(route, /STATUS_LABELS\[normalizeStatus\(prompt\.status\)\]/);
  assert.match(route, /SOURCE_TYPE_LABELS/);
  assert.match(read("scripts/sync-curated-prompts.mjs"), /source_type/);
});

test("staged records use only display categories that already exist in the library", () => {
  const used = new Set(stagedImages25Prompts.map((p) => p.category));
  for (const c of used) assert.ok(LIBRARY_CATEGORIES.has(c), c);
});

// ---------- display order ----------

test("All view leads with the Images 2.5 set: featured order, then remaining 2.5 rows, then legacy", () => {
  const rows = [
    { id: "L1", target_model: "gpt-image-2", thumbnail_url: "x", created_at: "2026-01-02" },
    { id: "L-feat", target_model: "gpt-image-2", thumbnail_url: "x", created_at: "2025-01-01" },
    { id: "L-bare", target_model: "gpt-image-2", created_at: "2026-05-05" },
    { id: "N-b", slug: "b", target_model: "gpt-image-2.5", gallery_ready: true, title: "B" },
    { id: "N-a", slug: "a", target_model: "gpt-image-2.5", gallery_ready: true, title: "A" },
    {
      id: "N-z",
      slug: "z",
      target_model: "gpt-image-2.5",
      gallery_ready: false,
      title: "Z recipe",
    },
    { id: "N-y", slug: "y", target_model: "gpt-image-2.5", gallery_ready: true, title: "Y extra" },
    { id: "L2", target_model: "gpt-image-2", thumbnail_url: "x", created_at: "2026-03-03" },
  ];
  const ordered = orderForDisplay(rows, ["b", "a"], ["L-feat"]).map((r) => r.id);
  assert.deepEqual(ordered, ["N-b", "N-a", "N-y", "N-z", "L-feat", "L2", "L1", "L-bare"]);
});

test("featured Images 2.5 slugs in the fetch layer are exactly the 17 gallery-ready promoted rows", () => {
  const lib = read("src/lib/library.ts");
  const block = lib.slice(
    lib.indexOf("FEATURED_25_SLUGS: string[] = ["),
    lib.indexOf("];", lib.indexOf("FEATURED_25_SLUGS")),
  );
  const slugs = [...block.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
  const galleryReady = new Set(promoted.filter((r) => r.gallery_ready).map((r) => r.slug));
  assert.equal(slugs.length, 17);
  assert.equal(new Set(slugs).size, 17);
  for (const s of slugs) assert.ok(galleryReady.has(s), `${s} is not a gallery-ready promoted row`);
  assert.match(lib, /orderForDisplay\(all, FEATURED_25_SLUGS, FEATURED_IDS\)/);
});
