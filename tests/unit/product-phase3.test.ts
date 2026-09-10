// Phase 3 product-migration regression coverage: visible naming, routes,
// SEO, Imago re-attach rule, intent-stage feedback, target_model, legacy
// library invariants, history compatibility.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ANNOUNCEMENT,
  CTA,
  INTENT_STAGE_LABELS,
  JSONLD_DESCRIPTIONS,
  JSONLD_NAMES,
  LIBRARY_COPY,
  LIBRARY_PROMPT_COUNT,
  NAV_ITEMS,
  POSITIONING,
  REFERENCE_REATTACH_NOTE,
  ROUTES,
  SEO,
  TOOL,
  describeIntent,
  historyKindLabel,
  isAnnouncementLive,
  needsReferenceReattach,
} from "../../src/lib/product.ts";
import {
  CURRENT_MODEL_CATEGORY,
  getLatestGuides,
  getPostBySlug,
  getPostsByDate,
  posts,
} from "../../src/data/posts.ts";
import {
  DEFAULT_TARGET_MODEL,
  TARGET_MODELS,
  TARGET_MODEL_LABELS,
  availableCollections,
  isTargetModel,
  normalizeTargetModel,
  shouldShowCollectionFilter,
} from "../../src/lib/target-model.ts";
import { curatedPrompts } from "../../src/data/curated-prompts.ts";
import { prepareHistoryRecord } from "../../src/lib/history-db.ts";
import { normalizeHistoryRecord } from "../../src/lib/db.ts";
import { REFERENCE_INTENT_OPTIONS } from "../../src/lib/prompt-engine/reference.ts";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

// ---------- naming ----------

test("one Prompt product: Build and Critique are modes, not separate tools", () => {
  assert.equal(TOOL.prompt, "Prompt");
  assert.equal(TOOL.buildMode, "Prompt — Build mode");
  assert.equal(TOOL.critiqueMode, "Prompt — Critique mode");
  assert.equal("builder" in TOOL, false);
  assert.equal("critic" in TOOL, false);
  assert.equal(CTA.build, "Build Prompt");
  assert.equal(CTA.critique, "Critique Prompt");
  assert.equal(CTA.critiqueAnother, "Critique Another Prompt");
  assert.equal(CTA.newPrompt, "New Prompt");
  assert.equal(CTA.building, "Building prompt…");
  assert.equal(CTA.remix, "Remix in Prompt");
  assert.deepEqual(
    NAV_ITEMS.map((n) => n.label),
    ["Library", "Prompt", "Gallery", "Blog"],
  );
});

test("/prompt is canonical; /generate and /critique still resolve via redirects", () => {
  assert.equal(ROUTES.prompt, "/prompt");
  assert.equal(ROUTES.legacyBuilder, "/generate");
  assert.equal(ROUTES.legacyCritic, "/critique");

  assert.deepEqual(
    NAV_ITEMS.map((n) => n.to),
    ["/library", "/prompt", "/gallery", "/blog"],
  );
  assert.match(read("src/routes/prompt.tsx"), /createFileRoute\("\/prompt"\)/);
  for (const [f, mode] of [
    ["src/routes/generate.tsx", "build"],
    ["src/routes/critique.tsx", "critique"],
  ] as const) {
    const s = read(f);
    assert.match(s, /redirect\(\{/);
    assert.match(s, /to: "\/prompt"/);
    assert.match(s, new RegExp(`mode: "${mode}"`));
    assert.match(s, /statusCode: 301/);
  }
  // the workspace mounts both modes so each keeps its own draft
  assert.match(read("src/routes/prompt.tsx"), /<BuildMode/);
  assert.match(read("src/routes/prompt.tsx"), /<CritiqueMode/);
  assert.match(read("src/routes/prompt.tsx"), /role="tablist"/);
});

test("internal identifiers keep their historical names (documented in CLAUDE.md)", () => {
  assert.match(read("src/lib/depikt.ts"), /value: "CRITIQUE"/);
  const rec = prepareHistoryRecord({ kind: "generate", roughIdea: "x", result: {} }, "id", 1);
  assert.equal(rec.kind, "generate");
  assert.equal(historyKindLabel("generate"), "BUILDER");
  assert.equal(historyKindLabel("critique"), "CRITIC");
  assert.match(read("CLAUDE.md"), /kind: "generate"/);
});

// ---------- positioning / SEO ----------

test("current product SEO is unified and never claims to generate images", () => {
  for (const [key, m] of Object.entries(SEO)) {
    assert.equal(/generator/i.test(m.title), false, `${key} title`);
    assert.equal(/image generator/i.test(m.description), false, `${key} description`);
  }
  assert.equal("builder" in SEO, false);
  assert.equal("critic" in SEO, false);
  assert.equal(SEO.home.title, "Depikt — AI Image Prompts, References & Templates");
  assert.equal(SEO.root.title, SEO.home.title);
  assert.equal(SEO.prompt.title, "AI Image Prompt Builder & Critic | Depikt");
  assert.equal(SEO.library.title, `${LIBRARY_PROMPT_COUNT} AI Image Prompt Examples | Depikt`);
  assert.equal(SEO.gallery.title, "AI Image Reference Gallery | Depikt");
  assert.equal(SEO.templates.title, "AI Image Prompt Templates | Depikt");
  assert.equal(SEO.blog.title, "AI Image Prompt Guides & Field Notes | Depikt");
  for (const m of Object.values(SEO)) assert.ok(m.title.length <= 70, m.title);
  assert.equal(JSONLD_NAMES.prompt, "Depikt Prompt Workspace");
  assert.equal("builder" in JSONLD_NAMES, false);
  assert.equal("critic" in JSONLD_NAMES, false);
  for (const d of Object.values(JSONLD_DESCRIPTIONS))
    assert.equal(/generat(es|or) images/i.test(d), false, d);
  assert.match(JSONLD_DESCRIPTIONS.app, /does not generate images/);
  assert.equal(POSITIONING.eyebrow, "Built for ChatGPT Images 2.5");
  assert.equal(POSITIONING.headline, "Turn rough ideas into image-ready prompts.");
  assert.equal(CTA.buildHero, "Build a Prompt");
  assert.equal(CTA.browse, "Browse 523 Prompts");
});

test("no current-product surface still calls Build and Critique separate tools", () => {
  const files = [
    "src/routes/index.tsx",
    "src/routes/prompt.tsx",
    "src/routes/library.tsx",
    "src/routes/gallery.tsx",
    "src/routes/templates.index.tsx",
    "src/routes/integrations.mcp.tsx",
    "src/components/Header.tsx",
    "src/components/Footer.tsx",
    "public/llms.txt",
    "public/manifest.webmanifest",
  ];
  for (const f of files) {
    const s = read(f);
    assert.equal(/Prompt Builder|Prompt Critic/.test(s), false, `${f} uses a retired tool name`);
    assert.equal(/\(\/generate\)|"\/generate"|\(\/critique\)|"\/critique"/.test(s), false, f);
  }
  // MCP tells assistants the current product model
  const mcp = read("src/lib/mcp/index.ts");
  assert.match(mcp, /Build mode/);
  assert.match(mcp, /Critique mode/);
  // llms.txt describes one workspace with two modes
  const llms = read("public/llms.txt");
  assert.match(llms, /Prompt workspace — Build mode/);
  assert.match(llms, /Prompt workspace — Critique mode/);
  // sitemap: canonical /prompt only, no legacy tool URLs
  const sitemap = read("src/routes/sitemap[.]xml.tsx");
  assert.match(sitemap, /absoluteUrl\("\/prompt"\)/);
  assert.equal(/absoluteUrl\("\/(generate|critique)"\)/.test(sitemap), false);
  // footer keeps Templates; header does not
  assert.match(read("src/components/Footer.tsx"), /\/templates/);
  assert.equal(/templates/.test(read("src/components/Header.tsx")), false);
});


test("current product UI files carry no generator-era labels", () => {
  const files = [
    "src/routes/index.tsx",
    "src/routes/prompt.tsx",
    "src/components/prompt/BuildMode.tsx",
    "src/components/prompt/CritiqueMode.tsx",
    "src/routes/library.tsx",
    "src/routes/gallery.tsx",
    "src/routes/__root.tsx",
    "src/components/Header.tsx",
    "public/llms.txt",
    "public/manifest.webmanifest",
  ];
  const banned = [
    /Generate prompt/,
    /Prompt Generator/,
    /Open the generator/,
    /Remix in generator/,
    /Try the generator/,
    /Score prompt/,
    /Score another prompt/,
    /Stop fighting the prompt/,
    /Built for (OpenAI's )?GPT Image 2/,
    /Depikt — AI image prompt generator/,
    /^> Depikt turns rough ideas into production-grade AI image prompts/m,
  ];
  for (const f of files) {
    const s = read(f);
    for (const re of banned) assert.equal(re.test(s), false, `${f} still contains ${re}`);
  }
  assert.match(read("src/routes/index.tsx"), /Learn · Build · Improve/);
  assert.match(read("public/llms.txt"), /does not generate images/);
  assert.match(read("public/llms.txt"), /GPT Image 2 collection/);
});

// ---------- Imago reference handoff ----------

test("Imago re-attach note: shown only when the prompt depends on a reference AND an image exists", () => {
  assert.equal(needsReferenceReattach("style", true), true);
  assert.equal(needsReferenceReattach("edit_source", true), true);
  assert.equal(needsReferenceReattach("sketch_layout", true), true);
  // text-only prompts
  assert.equal(needsReferenceReattach("none", true), false);
  assert.equal(needsReferenceReattach("none", false), false);
  assert.equal(needsReferenceReattach(undefined, false), false);
  assert.equal(needsReferenceReattach(undefined, true), false);
  // intent says reference but the image is gone (history restore without image)
  assert.equal(needsReferenceReattach("style", false), false);
  assert.match(REFERENCE_REATTACH_NOTE, /attach the same image in Imago/i);
  assert.match(REFERENCE_REATTACH_NOTE, /does not transfer automatically/);
  // Both pages render the shared note component
  assert.match(read("src/components/prompt/BuildMode.tsx"), /ReferenceReattachNote/);
  assert.match(read("src/components/prompt/CritiqueMode.tsx"), /ReferenceReattachNote/);
  assert.match(
    read("src/components/prompt/BuildMode.tsx"),
    /needsReferenceReattach\(result\.intent\?\.reference_intent/,
  );
});

// ---------- intent-stage feedback ----------

test("intent-stage feedback uses real intent data and honest labels", () => {
  assert.deepEqual(describeIntent(null), []);
  assert.deepEqual(describeIntent({}), []);
  assert.deepEqual(
    describeIntent({
      category: "poster",
      reference_intent: "style",
      aspect_ratio: { source: "explicit", value: "4:5", evidence: null },
      series: { enabled: false, count: null, unit: null },
      exact_text: [],
    }),
    ["Poster", "Style reference", "4:5"],
  );
  assert.deepEqual(
    describeIntent({
      category: "storyboard",
      reference_intent: "none",
      aspect_ratio: { source: "none", value: null },
      series: { enabled: true, count: 3, unit: "panel" },
      exact_text: [{ role: "title", text: "X" }],
      transparent_background: true,
    }),
    ["Storyboard", "3 panels", "Exact text", "Transparent"],
  );
  assert.equal(describeIntent({ category: "nonsense" }).length, 0);
  assert.equal(INTENT_STAGE_LABELS.understanding, "Understanding your request…");
  assert.equal(INTENT_STAGE_LABELS.building, "Building your prompt…");
  const g = read("src/components/prompt/BuildMode.tsx");
  assert.equal(
    /\d+%/.test(g.slice(g.indexOf("function LoadingState"))),
    false,
    "no fake percentages",
  );
  assert.match(g, /role="status"/);
});

// ---------- reference selector labels ----------

test("reference selector keeps the natural labels", () => {
  assert.deepEqual(
    REFERENCE_INTENT_OPTIONS.map((o) => o.label),
    [
      "Auto",
      "Style",
      "Subject / identity",
      "Edit source",
      "Product / object",
      "Composition",
      "Sketch / layout",
    ],
  );
});

// ---------- target_model ----------

test("target_model: vocabulary, default, normalization", () => {
  assert.deepEqual([...TARGET_MODELS], ["gpt-image-2", "gpt-image-2.5"]);
  assert.equal(DEFAULT_TARGET_MODEL, "gpt-image-2");
  assert.equal(isTargetModel("gpt-image-2.5"), true);
  assert.equal(isTargetModel("dall-e-3"), false);
  // legacy rows (no column yet, null, or junk) all read as the GPT Image 2 collection
  for (const v of [undefined, null, "", "GPT Image 2", 42])
    assert.equal(normalizeTargetModel(v), "gpt-image-2");
  assert.equal(normalizeTargetModel("gpt-image-2.5"), "gpt-image-2.5");
  assert.equal(TARGET_MODEL_LABELS["gpt-image-2"], "GPT Image 2");
});

test("target_model: no empty Images 2.5 tab; filter appears only once a second collection has rows", () => {
  const legacyOnly = Array.from({ length: 5 }, () => ({}));
  assert.deepEqual(availableCollections(legacyOnly), [
    { value: "all", label: "All", count: 5 },
    { value: "gpt-image-2", label: "GPT Image 2", count: 5 },
  ]);
  assert.equal(shouldShowCollectionFilter(legacyOnly), false);
  const mixed = [...legacyOnly, { target_model: "gpt-image-2.5" }];
  assert.equal(shouldShowCollectionFilter(mixed), true);
  assert.deepEqual(
    availableCollections(mixed).map((c) => [c.value, c.count]),
    [
      ["all", 6],
      ["gpt-image-2", 5],
      ["gpt-image-2.5", 1],
    ],
  );
  assert.equal(shouldShowCollectionFilter([]), false);
});

test("target_model: migration file backfills every current row to gpt-image-2 and stays idempotent", () => {
  const sql = read("supabase/migrations/20260908120000_add_target_model_to_curated_prompts.sql");
  assert.match(sql, /ADD COLUMN IF NOT EXISTS target_model text NOT NULL DEFAULT 'gpt-image-2'/);
  assert.match(sql, /SET target_model = 'gpt-image-2'/);
  assert.match(sql, /CHECK \(target_model IN \('gpt-image-2', 'gpt-image-2\.5'\)\)/);
  assert.equal(
    /gpt-image-2\.5'\s*\)/.test(sql) && /INSERT INTO/i.test(sql),
    false,
    "no Images 2.5 rows inserted",
  );
  assert.match(read("src/lib/library.ts"), /target_model/);
  assert.match(read("src/lib/library.ts"), /isUndefinedColumn/);
  assert.match(read("scripts/sync-curated-prompts.mjs"), /target_model/);
});

// ---------- legacy library invariants ----------

test("legacy library: 500 prompts, unchanged shape, labeled as the GPT Image 2 collection", () => {
  assert.equal(curatedPrompts.length, 500);
  for (const p of curatedPrompts) {
    assert.equal(typeof p.prompt, "string");
    assert.ok(p.prompt.length > 0);
    assert.equal("target_model" in p, false, "generated data file not re-synced in Phase 3");
  }
  assert.equal(LIBRARY_COPY.headline, "523 prompts to learn from, remix, and use.");
  assert.equal(LIBRARY_COPY.collections, "500 GPT Image 2 · 23 tested Images 2.5");
  assert.match(read("src/routes/library.tsx"), /LIBRARY_COPY\.headline/);
  assert.match(read("src/routes/library.tsx"), /CTA\.remix/);
});

// ---------- history compatibility ----------

test("history: v2.9 and v3 records restore under the new labels without migration", () => {
  const old = normalizeHistoryRecord({
    id: "old",
    kind: "generate",
    roughIdea: "poster",
    result: { prompt: "p", category: "POSTER/COVER" },
    createdAt: 1,
  });
  assert.equal(old.kind, "generate");
  assert.equal(historyKindLabel(old.kind), "BUILDER");
  const v3 = prepareHistoryRecord(
    {
      kind: "generate",
      roughIdea: "x",
      result: {
        prompt: "p",
        prompt_version: "depikt-v3.0.0-images-2.5",
        intent: { reference_intent: "style" },
      },
      referenceImage: "data:image/png;base64,AAAA",
      referenceIntent: "style",
    },
    "new",
    2,
  );
  assert.equal(v3.promptVersion, "depikt-v3.0.0-images-2.5");
  assert.equal(
    needsReferenceReattach(
      (v3.intent as { reference_intent: string }).reference_intent,
      !!v3.referenceImage,
    ),
    true,
  );
  const omitted = prepareHistoryRecord(
    {
      kind: "generate",
      roughIdea: "x",
      result: { intent: { reference_intent: "style" } },
      referenceImage: "x".repeat(800_000),
    },
    "big",
    3,
  );
  assert.equal(omitted.referenceImageOmitted, true);
  assert.equal(needsReferenceReattach("style", !!omitted.referenceImage), false);
});

// ---------- historical content preserved ----------

test("historical GPT Image 2 blog posts and prompt text are untouched by the migration", () => {
  const src = read("src/data/posts.ts");
  assert.match(src, /how-to-prompt-gpt-image-2-for-posters/);
  assert.match(src, /How to prompt GPT Image 2 for/);
  // Posts published before the Images 2.5 launch keep their model claims:
  // no historical article was rewritten to claim Images 2.5.
  const historical = posts.filter((p) => p.published < "2026-09-01");
  assert.ok(historical.length >= 19, "historical posts still present");
  for (const p of historical) {
    assert.equal(
      /ChatGPT Images 2\.5/.test(p.title + p.subtitle + p.excerpt + p.content),
      false,
      `${p.slug} was rewritten to claim Images 2.5`,
    );
    assert.equal(/Depikt's generator/.test(p.content), false, `${p.slug} generic CTA`);
  }
  assert.equal(/ChatGPT Images 2\.5/.test(read("src/data/curated-prompts.ts")), false);
});

// ---------- Images 2.5 launch content ----------

test("launch module is data-driven: real count, real images, deep link to the Images 2.5 collection", () => {
  assert.equal(ANNOUNCEMENT.eyebrow, "New in Depikt");
  assert.equal(ANNOUNCEMENT.title, "See what works with ChatGPT Images 2.5.");
  assert.equal(ANNOUNCEMENT.meta, "23 new tested recipes");
  assert.equal(ANNOUNCEMENT.primary.collection, "gpt-image-2.5");
  assert.ok(getPostBySlug(ANNOUNCEMENT.secondary.slug), "secondary CTA slug resolves to a post");
  assert.ok(ANNOUNCEMENT.images.length >= 3 && ANNOUNCEMENT.images.length <= 5);
  for (const img of ANNOUNCEMENT.images) {
    assert.ok(existsSync(resolve(ROOT, `public/library/images-2-5/${img.slug}.webp`)), img.slug);
    assert.ok(img.alt.length > 10, img.slug);
  }
  assert.equal(isAnnouncementLive({ ...ANNOUNCEMENT, active: false }), false);
  assert.equal(
    isAnnouncementLive({ ...ANNOUNCEMENT, until: "2026-01-01" }, new Date("2026-09-09")),
    false,
  );
  assert.equal(isAnnouncementLive(ANNOUNCEMENT, new Date("2026-09-09")), true);
  const home = read("src/routes/index.tsx");
  assert.match(home, /<LaunchModule \/>/);
  assert.doesNotMatch(home, /AnnouncementBar/);
});

test("Images 2.5 guides exist, cite OpenAI, and lead the homepage Latest guides", () => {
  const current = posts.filter((p) => p.category === CURRENT_MODEL_CATEGORY);
  assert.ok(current.length >= 3, "at least three Images 2.5 guides");
  for (const p of current) {
    assert.match(p.content, /openai\.com\/index\/introducing-chatgpt-images-2-5/, p.slug);
    assert.match(p.content, /\]\((\/generate|\/prompt)/, `${p.slug} links to the prompt workspace`);
    assert.equal(/generat(es|or) images/i.test(p.excerpt), false, p.slug);
    assert.ok(p.faq && p.faq.length > 0, `${p.slug} has FAQ`);
  }
  const latest = getLatestGuides(3);
  assert.equal(latest.length, 3);
  for (const p of latest) assert.equal(p.category, CURRENT_MODEL_CATEGORY, p.slug);
  assert.equal(latest[0].slug, ANNOUNCEMENT.secondary.slug);
  // Date ordering, not array ordering, drives the homepage teaser.
  const byDate = getPostsByDate();
  for (let i = 1; i < byDate.length; i++) assert.ok(byDate[i - 1].published >= byDate[i].published);
  assert.match(read("src/routes/index.tsx"), /getLatestGuides/);
  assert.equal(/posts\.slice\(0, 3\)/.test(read("src/routes/index.tsx")), false);
});
