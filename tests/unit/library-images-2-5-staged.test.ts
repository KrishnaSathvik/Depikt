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
  slugify,
  sortNewest,
} from "../../src/lib/library-metadata.ts";
import { availableCollections, shouldShowCollectionFilter } from "../../src/lib/target-model.ts";
import { publicStagedPrompts, stagedImages25Prompts } from "../../src/data/images-2-5-staged.ts";
import { curatedPrompts } from "../../src/data/curated-prompts.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const LIBRARY_CATEGORIES = new Set(curatedPrompts.map((p) => p.category));
// The generated legacy file has no target_model field; widen for the collection helpers.
type ModelRow = { target_model?: unknown };
const asRows = (xs: unknown[]) => xs as ModelRow[];

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

test("approved staged records are public; the collection filter now appears with correct counts", () => {
  const pub = publicStagedPrompts();
  assert.equal(pub.length, 23);
  for (const p of pub) assert.equal(p.status, "approved");
  const publicLibrary = asRows([...curatedPrompts, ...pub]);
  assert.equal(shouldShowCollectionFilter(publicLibrary), true);
  assert.deepEqual(
    availableCollections(publicLibrary).map((c) => [c.value, c.count]),
    [
      ["all", 523],
      ["gpt-image-2", 500],
      ["gpt-image-2.5", 23],
    ],
  );
  // The held record never reaches the public list.
  const held = stagedImages25Prompts.filter((p) => p.status !== "approved");
  assert.equal(held.length, 1);
  assert.equal(held[0].slug, "multi-turn-infographic-edits");
  assert.equal(filterPublic(held).length, 0);
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

test("batch 1: exactly 24 records with unique ids and slugs, all gpt-image-2.5", () => {
  assert.equal(stagedImages25Prompts.length, 24);
  const ids = new Set(stagedImages25Prompts.map((p) => p.id));
  const slugs = new Set(stagedImages25Prompts.map((p) => p.slug));
  assert.equal(ids.size, 24);
  assert.equal(slugs.size, 24);
  const legacyIds = new Set(curatedPrompts.map((p) => p.id));
  for (const p of stagedImages25Prompts) {
    assert.ok(p.id.startsWith("images25-"), p.id);
    assert.equal(legacyIds.has(p.id), false, `id collides with legacy: ${p.id}`);
    assert.equal(p.target_model, "gpt-image-2.5");
    assert.equal(p.source, "curated");
    assert.equal(p.slug, slugify(p.slug), `slug not normalized: ${p.slug}`);
  }
});

test("batch 1: every record is complete (prompt, why, category, tags, provenance, review)", () => {
  for (const p of stagedImages25Prompts) {
    assert.ok(p.title.length > 3, p.id);
    assert.ok(p.prompt.length > 80, `${p.id} prompt too short`);
    assert.ok((p.why_it_works ?? "").length > 40, `${p.id} why_it_works`);
    assert.ok(LIBRARY_CATEGORIES.has(p.category), `${p.id} category ${p.category}`);
    assert.ok(p.tags.length >= 3, `${p.id} tags`);
    assert.ok(SOURCE_TYPES.includes(p.source_type), p.id);
    assert.ok(PROMPT_STATUSES.includes(p.status), p.id);
    assert.ok(REFERENCE_MODES.includes(p.reference_mode), p.id);
    assert.ok(p.source_creator, `${p.id} source_creator`);
    assert.ok((p.source_notes ?? "").length > 20, `${p.id} source_notes`);
    assert.ok(p.review_notes.length > 20, `${p.id} review_notes`);
    assert.ok(p.review.success && p.review.failure && p.review.check_first, p.id);
    assert.ok(p.review.attempts >= 1, p.id);
    assert.ok(MODEL_HINTS.includes(p.review.model_hint), p.id);
    assert.equal(typeof p.created_at, "string");
    assert.equal(typeof p.updated_at, "string");
  }
});

test("batch 1: every record was run; approved records carry a result, model, attempts and thumbnail", () => {
  const counts: Record<string, number> = {};
  for (const p of stagedImages25Prompts) {
    counts[p.status] = (counts[p.status] ?? 0) + 1;
    assert.ok(["tested", "approved"].includes(p.status), `${p.id} was not run`);
    assert.equal(p.generation_ready, true, p.id);
    assert.ok(p.model_used === "flare" || p.model_used === "sunburst", p.id);
    assert.ok((p.attempts ?? 0) >= 1 && (p.attempts ?? 0) <= 3, `${p.id} attempts`);
    assert.equal(p.result_count, p.attempts, p.id);
    assert.ok((p.outcome_notes ?? "").length > 40, `${p.id} outcome_notes`);
    if (p.status === "approved") {
      assert.equal(p.thumbnail_url, `/library/images-2-5/${p.slug}.webp`, p.id);
      assert.ok(existsSync(resolve(ROOT, `public${p.thumbnail_url}`)), `${p.id} thumbnail missing`);
    } else {
      assert.equal(p.gallery_ready, false, `${p.id} held records are never gallery_ready`);
      assert.equal(p.thumbnail_url, undefined, p.id);
    }
    if (p.gallery_ready) assert.equal(p.status, "approved", p.id);
    if (p.original_staged_prompt) {
      assert.notEqual(
        p.original_staged_prompt,
        p.prompt,
        `${p.id} revision recorded but identical`,
      );
      assert.match(
        p.outcome_notes ?? "",
        /revised|reworded/i,
        `${p.id} revision must be explained`,
      );
    }
    if (["multi_reference", "sketch", "identity"].includes(p.reference_mode)) {
      assert.ok(p.fixtures_used?.length, `${p.id} fixture-based record must list fixtures`);
      for (const f of p.fixtures_used ?? []) {
        const fx = resolve(ROOT, `research/images-2-5-community/runs/_fixtures/${f}.png`);
        assert.ok(existsSync(fx), f);
      }
    }
  }
  assert.deepEqual(counts, { approved: 23, tested: 1 });
});

test("batch 1: reference metadata is consistent", () => {
  for (const p of stagedImages25Prompts) {
    if (p.reference_mode === "none") {
      assert.equal(p.needs_reference_images, false, p.id);
      assert.equal(p.reference_inputs, undefined, p.id);
    } else {
      assert.equal(p.needs_reference_images, true, p.id);
      assert.ok(p.reference_inputs?.length, `${p.id} reference_inputs`);
    }
    if (p.reference_mode === "multi_reference") {
      assert.ok((p.reference_inputs?.length ?? 0) >= 2, p.id);
      assert.match(p.prompt, /[Ii]mage 1/);
      assert.match(p.prompt, /[Ii]mage 2/);
    }
    if (p.setup_prompt) assert.equal(p.needs_reference_images, true, p.id);
  }
  const byMode = new Map<string, number>();
  for (const p of stagedImages25Prompts)
    byMode.set(p.reference_mode, (byMode.get(p.reference_mode) ?? 0) + 1);
  assert.equal(byMode.get("none"), 10);
  assert.equal(byMode.get("edit_source"), 8);
  assert.equal(byMode.get("multi_reference"), 3);
  assert.equal(byMode.get("product"), 1);
  assert.equal(byMode.get("sketch"), 1);
  assert.equal(byMode.get("identity"), 1);
});

test("batch 1: provenance rules — official prompts cite OpenAI, official_inspired are not passed off as official", () => {
  for (const p of stagedImages25Prompts) {
    if (p.source_type === "official_prompt") {
      assert.equal(p.source_creator, "OpenAI", p.id);
      assert.match(p.source_notes ?? "", /verbatim|Adapted/, p.id);
    }
    if (p.source_type === "official_inspired") {
      assert.equal(p.source_creator, "OpenAI", p.id);
      assert.match(p.source_notes ?? "", /no prompt published|reconstruction/i, p.id);
    }
    if (p.source_type === "community_inspired") {
      assert.ok(p.source_url, `${p.id} community record needs a source_url`);
      assert.match(p.source_notes ?? "", /Depikt|rewrit/i, p.id);
    }
    if (p.source_type === "depikt_original") {
      assert.equal(p.source_creator, "Depikt", p.id);
    }
  }
  const counts = new Map<string, number>();
  for (const p of stagedImages25Prompts)
    counts.set(p.source_type, (counts.get(p.source_type) ?? 0) + 1);
  assert.equal(counts.get("official_prompt"), 5);
  assert.equal(counts.get("official_inspired"), 8);
  assert.equal(counts.get("community_inspired"), 7);
  assert.equal(counts.get("depikt_original"), 4);
});

test("batch 1: the three OpenAI edit lines are the published captions, verbatim", () => {
  const edits = JSON.parse(read("research/images-2-5-community/openai-100-edits.json"))
    .edits as Array<{
    edit: number;
    prompt: string;
  }>;
  const byNo = new Map(edits.map((e) => [e.edit, e.prompt]));
  const pick = (id: string) => stagedImages25Prompts.find((p) => p.id === id)!;
  assert.ok(pick("images25-change-outfit-only").prompt.includes(byNo.get(3)!));
  assert.ok(pick("images25-change-background-only").prompt.includes(byNo.get(30)!));
  assert.ok(pick("images25-add-glasses-preserve-eyes").prompt.includes(byNo.get(45)!));
  assert.ok(
    pick("images25-80s-portrait-identity-lock").prompt.startsWith(
      "Show me what I would look like if I was in the '80s.",
    ),
  );
});

test("batch 1: exact-text prompts quote their strings and forbid stray text", () => {
  for (const p of stagedImages25Prompts) {
    if (p.tags.includes("exact-text")) {
      assert.match(p.prompt, /"[^"]+"/, `${p.id} has no quoted string`);
      assert.match(
        p.prompt,
        /[Nn]o other text|only text|only in these|Text appears only|the only text|[Nn]o other text changes|stays exactly as it is/,
        p.id,
      );
    }
  }
});

// ---------- legacy untouched ----------

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

test("staged batch SQL exports only approved records, with thumbnails, as an idempotent upsert", () => {
  const sql = read("supabase/insert-images-2-5-batch1-staged.sql");
  const approved = stagedImages25Prompts.filter((p) => p.status === "approved");
  assert.equal((sql.match(/INSERT INTO public\.curated_prompts/g) ?? []).length, approved.length);
  for (const p of approved) assert.ok(sql.includes(`'${p.id}'`), p.id);
  for (const p of stagedImages25Prompts.filter((p) => p.status !== "approved")) {
    assert.equal(sql.includes(`'${p.id}'`), false, `${p.id} must not be exported`);
  }
  assert.equal((sql.match(/^ {2}'approved',$/gm) ?? []).length, approved.length);
  assert.equal(
    (sql.match(/'\/library\/images-2-5\/[a-z0-9-]+\.webp'/g) ?? []).length,
    approved.length,
  );
  assert.match(sql, /ON CONFLICT \(id\) DO UPDATE/);
  assert.match(sql, /'gpt-image-2\.5'/);
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
  assert.ok(used.size >= 6, "batch 1 should span several categories");
});
