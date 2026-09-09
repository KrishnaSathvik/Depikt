// Templates are task structures, not prompt examples. One canonical source
// (src/data/templates.ts) feeds the /templates page, the Prompt Builder
// prefill, and the public MCP tools — these tests keep them from drifting.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  TEMPLATE_GROUPS,
  activeTemplates,
  buildTemplateStarter,
  getTemplateBySlug,
  templates,
} from "../../src/data/templates.ts";
import { MCP, SEO } from "../../src/lib/product.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

test("exactly 15 active templates", () => {
  assert.equal(templates.length, 15);
  assert.equal(activeTemplates.length, 15);
});

test("ids, slugs, titles and sort orders are unique", () => {
  for (const key of ["id", "slug", "title", "sort_order"] as const) {
    const values = templates.map((t) => t[key]);
    assert.equal(new Set(values).size, values.length, `duplicate ${key}`);
  }
});

test("every template has a valid group and the five groups are all used", () => {
  const used = new Set(templates.map((t) => t.group));
  for (const t of templates) assert.ok(TEMPLATE_GROUPS.includes(t.group), t.id);
  assert.equal(used.size, TEMPLATE_GROUPS.length);
});

test("required fields are present and non-empty", () => {
  for (const t of templates) {
    assert.match(t.slug, /^[a-z0-9-]+$/, t.id);
    assert.ok(t.title.length > 0, t.id);
    assert.ok(t.short_title.length > 0, t.id);
    assert.ok(t.description.length > 0, t.id);
    assert.ok(t.best_for.length > 0, t.id);
    assert.ok(t.fields.length >= 4, t.id);
    assert.ok(t.template_prompt.length > 0, t.id);
    assert.ok(t.tags.length > 0, t.id);
    assert.match(t.updated_at, /^\d{4}-\d{2}-\d{2}$/, t.id);
  }
});

test("every placeholder in a skeleton maps to a declared field, and vice versa", () => {
  for (const t of templates) {
    const used = new Set([...t.template_prompt.matchAll(/\[([A-Z0-9_]+)\]/g)].map((m) => m[1]));
    const declared = new Set(t.fields.map((f) => f.key));
    for (const key of used) assert.ok(declared.has(key), `${t.id}: [${key}] has no field`);
    for (const key of declared) assert.ok(used.has(key), `${t.id}: field ${key} unused`);
    for (const key of declared) {
      assert.ok(t.example_input[key], `${t.id}: no example for ${key}`);
    }
  }
});

test("templates stay model-neutral: no generator flags or model names", () => {
  const banned = /--ar|--stylize|--v \d|gpt-image|midjourney|flux|firefly|ideogram|dall-?e/i;
  for (const t of templates) {
    assert.equal(banned.test(t.template_prompt), false, `${t.id} skeleton is model-specific`);
    assert.equal(banned.test(t.description), false, `${t.id} description is model-specific`);
  }
});

test("buildTemplateStarter fills provided values and labels the gaps", () => {
  const poster = getTemplateBySlug("poster-flyer");
  assert.ok(poster);
  const starter = buildTemplateStarter(poster, { HEADLINE: "NIGHT SESSIONS" });
  assert.match(starter, /^Template: Poster \/ Flyer/);
  assert.match(starter, /"NIGHT SESSIONS"/);
  assert.match(starter, /\[main visual\]/);
  assert.equal(/\[[A-Z0-9_]+\]/.test(starter), false, "raw placeholder keys leaked");
});

test("Template → Prompt Builder uses the existing prefill flow", () => {
  const page = read("src/routes/templates.index.tsx");
  assert.match(page, /buildTemplateStarter/);
  assert.match(page, /to: "\/generate", search: \{ prefill/);
  assert.match(read("src/routes/generate.tsx"), /prefill\?: string/);
});

test("MCP exposes the canonical catalogue and stays read-only", () => {
  const list = read("src/lib/mcp/tools/list-templates.ts");
  const one = read("src/lib/mcp/tools/get-template.ts");
  for (const src of [list, one]) {
    assert.match(src, /from "@\/data\/templates"/);
    assert.match(src, /readOnlyHint: true/);
  }
  const index = read("src/lib/mcp/index.ts");
  assert.match(index, /get_template|getTemplate/);
  assert.ok(MCP.capabilities.some((c) => c.tool === "get_template"));
});

test("no per-template detail routes remain", () => {
  const sitemap = read("src/routes/sitemap[.]xml.tsx");
  assert.equal(/\/templates\/\$\{/.test(sitemap), false);
  assert.match(sitemap, /absoluteUrl\("\/templates"\)/);
});

test("/templates has its own metadata", () => {
  assert.equal(SEO.templates.title, "AI Image Prompt Templates | Depikt");
  assert.ok(SEO.templates.description.length <= 160);
  const page = read("src/routes/templates.index.tsx");
  assert.match(page, /SEO\.templates\.title/);
  assert.match(page, /rel: "canonical"/);
});
