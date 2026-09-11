// Public Generation + SEO + content launch pass regression coverage:
// /generate canonical metadata, sitemap, llms.txt, MCP read-only claim, the
// internal Builder instruction, and the new launch blog post.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SEO, JSONLD_NAMES, JSONLD_DESCRIPTIONS } from "../../src/lib/product.ts";
import { CORE_RULES } from "../../src/lib/prompt-engine/builder.ts";
import { posts, getPostsByDate } from "../../src/data/posts.ts";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("Generate is a pure redirect into /prompt?mode=generate — no page of its own, same as /critique", () => {
  const g = read("src/routes/generate.tsx");
  assert.match(g, /redirect\(\{/);
  assert.match(g, /to: "\/prompt"/);
  assert.match(g, /statusCode: 301/);
  assert.doesNotMatch(g, /component:/);
  assert.doesNotMatch(g, /head:/);
  // The merged /prompt page owns the canonical metadata now (SEO.prompt,
  // tested elsewhere) — SEO.generate/JSONLD_NAMES.generate survive only as
  // historical constants (e.g. the launch blog post still names the model).
  assert.notEqual(SEO.generate.title, SEO.prompt.title);
});

test("sitemap includes the new launch post; no /generate, /critique, or query/session/API/private routes", () => {
  const sitemap = read("src/routes/sitemap[.]xml.tsx");
  assert.equal(/absoluteUrl\("\/generate"\)/.test(sitemap), false);
  // Static routes only, plus the posts array — no dynamic session/job ids
  // and no /api routes among the URLs the sitemap emits.
  assert.equal(/absoluteUrl\(`?\/api\//.test(sitemap), false);
  assert.equal(/sessions\.\$id|jobs\.\$id|generation session/i.test(sitemap), false);
  const postSlugs = posts.map((p) => p.slug);
  assert.ok(postSlugs.includes("depikt-image-generation"));
});

test("robots.txt keeps public pages crawlable and blocks /api/", () => {
  const robots = read("src/routes/robots[.]txt.tsx");
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Disallow: \/api\//);
});

test("llms.txt describes native generation and MCP stays read-only", () => {
  const llms = read("public/llms.txt");
  assert.match(llms, /\[Generate\]\(https:\/\/depikt\.app\/generate\)/);
  assert.match(llms, /routes generation between GPT Image 2\.5 Flare and Sunburst/);
  assert.equal(
    /Depikt (writes and reviews prompts; it )?does not generate images/i.test(llms),
    false,
  );
  assert.match(llms, /does not include image generation/);
});

test("MCP server instructions mention Generate but stay explicit about being read-only", () => {
  const mcp = read("src/lib/mcp/index.ts");
  assert.match(mcp, /Generate \(https:\/\/depikt\.app\/generate\)/);
  assert.match(mcp, /read-only and does not generate images itself/);
});

test("the internal Prompt Builder writer instruction (model itself does not generate images) is preserved", () => {
  assert.match(CORE_RULES, /You do not generate images\./);
});

test("new launch post: metadata, author/date, category, cover, FAQ, internal links", () => {
  const post = posts.find((p) => p.slug === "depikt-image-generation");
  assert.ok(post, "depikt-image-generation post is missing");
  assert.equal(post!.title, "Depikt Can Now Generate Images");
  assert.equal(post!.seo_title, "Depikt Image Generation: Create & Edit with GPT Image 2.5");
  assert.ok(post!.seo_description.length > 0);
  assert.equal(post!.category, "Product");
  assert.equal(post!.author, "Krishna");
  assert.equal(post!.published, "2026-09-10");
  assert.equal(post!.cover_image, "/og/depikt-image-generation.png");
  assert.ok(post!.cover_alt && post!.cover_alt.length > 0);
  assert.ok(post!.faq && post!.faq.length > 0);
  const wordCount = post!.content.trim().split(/\s+/).length;
  assert.ok(wordCount >= 1000, `expected a substantive article, got ${wordCount} words`);
  // Naturally links to the connected surfaces, not a listicle of every page.
  for (const link of ["/library", "/gallery", "/templates", "/prompt?mode=build"]) {
    assert.ok(post!.content.includes(link), `content should link to ${link}`);
  }
  // No release-note clichés.
  const banned = [
    /we're thrilled/i,
    /game-changing/i,
    /revolutionary/i,
    /unlock the power/i,
    /seamlessly/i,
    /ai-powered/i,
  ];
  for (const re of banned) assert.equal(re.test(post!.content), false, `content matches ${re}`);
  // Shows up in date-ordered listings (blog index / sitemap source).
  assert.ok(getPostsByDate().some((p) => p.slug === "depikt-image-generation"));
});

test("model routing descriptions never present Flare/Sunburst as a user choice", () => {
  const post = posts.find((p) => p.slug === "depikt-image-generation")!;
  assert.equal(/choose (flare|sunburst)/i.test(post.content), false);
  assert.equal(/choose (flare|sunburst)/i.test(JSONLD_DESCRIPTIONS.generate), false);
  assert.match(JSONLD_DESCRIPTIONS.generate, /routes generation/i);
  assert.equal(JSONLD_NAMES.generate, "Depikt Generate");
});
