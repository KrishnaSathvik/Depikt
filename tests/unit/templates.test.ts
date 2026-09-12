// Templates are task structures, not prompt examples. One canonical source
// (src/data/templates.ts) feeds the /templates page, the Prompt workspace
// prefill, and the public MCP tools — these tests keep them from drifting.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  TEMPLATE_GROUPS,
  TEMPLATE_GROUP_BLURB,
  TEMPLATE_GROUP_LABEL,
  activeTemplates,
  buildTemplateStarter,
  getTemplateBySlug,
  templates,
} from "../../src/data/templates.ts";
import {
  TEMPLATE_STORAGE_KEY,
  clearTemplateValues,
  composeTemplateBrief,
  filledFields,
  loadTemplateValues,
  previewFieldLabels,
  requiredFields,
  saveTemplateValues,
  validateTemplateValues,
  type StorageLike,
} from "../../src/lib/template-context.ts";
import { MCP, SEO } from "../../src/lib/product.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

test("exactly 30 active templates", () => {
  assert.equal(templates.length, 30);
  assert.equal(activeTemplates.length, 30);
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

// ─── Guided setup flow: Templates → setup panel → Prompt (Build mode) ───────

test("every template marks one or two required fields; the rest stay optional", () => {
  for (const t of templates) {
    const required = requiredFields(t);
    assert.ok(required.length >= 1 && required.length <= 2, `${t.id}: ${required.length} required`);
    assert.ok(required.length < t.fields.length, `${t.id}: everything is required`);
  }
});

test("website category labels and blurbs cover every internal group", () => {
  for (const g of TEMPLATE_GROUPS) {
    assert.ok(TEMPLATE_GROUP_LABEL[g].length > 0, g);
    assert.ok(TEMPLATE_GROUP_BLURB[g].length > 0, g);
  }
  assert.equal(TEMPLATE_GROUP_LABEL.Structure, "Design & explain");
});

test("card descriptions read as plain language, not prompt-engineering terms", () => {
  const jargon = /structured visual|reference role|sequential storytelling|spatial concept/i;
  for (const t of templates) assert.equal(jargon.test(t.description), false, t.description);
});

test("validation only enforces required fields and keeps answered values", () => {
  const portrait = getTemplateBySlug("portrait-photography")!;
  const errors = validateTemplateValues(portrait, { LIGHTING: "soft window light" });
  assert.deepEqual(Object.keys(errors), ["SUBJECT"]);
  assert.match(errors.SUBJECT, /subject/i);
  assert.deepEqual(validateTemplateValues(portrait, { SUBJECT: "a woman hiking" }), {});
  assert.deepEqual(validateTemplateValues(portrait, { SUBJECT: "   " }), {
    SUBJECT: errors.SUBJECT,
  });
});

test("the brief carries answered fields and extra direction, never the bracket skeleton", () => {
  const portrait = getTemplateBySlug("portrait-photography")!;
  const values = { SUBJECT: "a woman hiking", ENVIRONMENT: "an alpine trail", MOOD: "  " };
  assert.deepEqual(
    filledFields(portrait, values).map((f) => f.label),
    ["Subject", "Environment"],
  );
  const brief = composeTemplateBrief(portrait, values, "keep it candid");
  assert.equal(
    brief,
    [
      "Template: Portrait / Photography",
      "Subject: a woman hiking",
      "Environment: an alpine trail",
      "",
      "Additional direction: keep it candid",
    ].join("\n"),
  );
  assert.equal(/\[[A-Z_]+\]/.test(brief), false, "skeleton placeholders leaked into the brief");
  assert.equal(composeTemplateBrief(portrait, values).includes("Additional direction"), false);
});

test("card preview lists required fields first", () => {
  const ui = getTemplateBySlug("ui-app-concept")!;
  assert.deepEqual(previewFieldLabels(ui).slice(0, 2), ["Product", "Screen or page purpose"]);
  assert.equal(previewFieldLabels(ui).length, 4);
});

test("answered values round-trip through storage keyed by slug and clear cleanly", () => {
  const map = new Map<string, string>();
  const store: StorageLike = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
  saveTemplateValues("poster-flyer", { PURPOSE: "a jazz night" }, store);
  assert.ok(map.has(TEMPLATE_STORAGE_KEY));
  assert.deepEqual(loadTemplateValues("poster-flyer", store), { PURPOSE: "a jazz night" });
  assert.deepEqual(loadTemplateValues("portrait-photography", store), {}, "other slug");
  clearTemplateValues(store);
  assert.deepEqual(loadTemplateValues("poster-flyer", store), {});
  map.set(TEMPLATE_STORAGE_KEY, "{not json");
  assert.deepEqual(loadTemplateValues("poster-flyer", store), {}, "corrupt storage degrades");
});

test("Templates page: one Start per card, a shared setup panel, slug-only hand-off", () => {
  const page = read("src/routes/templates.index.tsx");
  assert.match(page, /<TemplateSetup/);
  assert.match(page, /Choose what you want to make\./);
  assert.match(page, /search: \{ mode: "build" as const, template: selected\.slug \}/);
  assert.equal(/prefill/.test(page), false, "page must not push a prefill into the URL");
  assert.equal(/buildTemplateStarter/.test(page), false, "no skeleton on the page");
  for (const retired of ["Best for", "You provide", "Fill in details", "Use template"])
    assert.equal(page.includes(retired), false, `retired copy: ${retired}`);
  assert.match(page, /xl:grid-cols-3/);
  assert.match(page, /template_sent_to_prompt/);
});

test("setup panel derives fields from the canonical catalogue and validates required only", () => {
  const setup = read("src/components/TemplateSetup.tsx");
  assert.match(setup, /template\.fields\.map/);
  assert.match(setup, /validateTemplateValues/);
  assert.match(setup, /Answer what you know\. Optional details can be left blank\./);
  assert.match(setup, /See template structure/);
  assert.match(setup, /role="alert"/);
  for (const ev of ["template_viewed", "template_started", "template_completed"])
    assert.match(setup, new RegExp(ev));
});

test("Prompt receives structured template context, not a skeleton in the textarea", () => {
  const prompt = read("src/routes/prompt.tsx");
  assert.match(prompt, /template\?: string/);
  assert.equal(/buildTemplateStarter/.test(prompt), false);
  const build = read("src/components/prompt/BuildMode.tsx");
  assert.match(build, /<TemplateBrief/);
  assert.match(build, /composeTemplateBrief\(templateCtx\.template, templateCtx\.values, input\)/);
  assert.match(build, /loadTemplateValues\(template\.slug\)/);
  assert.match(build, /Anything else\?/);
  assert.match(build, /Add any extra direction, details, or constraints/);
  assert.match(build, /clearTemplateValues\(\)/);
  assert.equal(/setInput\(buildTemplateStarter/.test(build), false);
  // The normal flow is untouched: same endpoint, same request contract.
  assert.match(build, /getEndpoint\("\/api\/public\/generate-prompt"\)/);
  assert.match(build, /Describe the image you want to create\.\.\./);
  // The brief hides empty fields.
  assert.match(read("src/components/prompt/TemplateBrief.tsx"), /filledFields\(template, values\)/);
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
