// The MCP integration has one home (/integrations/mcp) and is mentioned on
// the homepage, in the Library, and in one blog post. Copy comes from MCP in
// src/lib/product.ts so the page, section, and tests agree.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MCP, SEO } from "../../src/lib/product.ts";
import { getPostBySlug } from "../../src/data/posts.ts";
import { OG_ROUTE_IMAGES, OG_ROUTE_READY } from "../../src/lib/og-routes.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

test("MCP server route and explanation page are distinct routes", () => {
  assert.equal(MCP.endpointPath, "/mcp");
  assert.equal(MCP.pagePath, "/integrations/mcp");
  assert.match(read("src/routes/mcp.ts"), /createFileRoute\("\/mcp"\)/);
  assert.match(read("src/routes/integrations.mcp.tsx"), /createFileRoute\("\/integrations\/mcp"\)/);
});

test("MCP copy: four read-only capabilities matching the server's tool names", () => {
  const serverTools = ["search_prompts", "get_prompt", "list_templates", "get_guide"];
  assert.deepEqual(
    MCP.capabilities.map((c) => c.tool),
    serverTools,
  );
  const mcpIndex = read("src/lib/mcp/index.ts");
  for (const t of serverTools) assert.match(mcpIndex, new RegExp(t.replace(/_/g, "[_-]")));
  assert.match(MCP.safety, /read-only/);
  assert.equal(/no authentication/i.test(MCP.body + MCP.headline + MCP.meta), false);
});

test("MCP page has its own SEO entry and OG card", () => {
  assert.match(SEO.mcp.title, /MCP/);
  assert.equal(/generator/i.test(SEO.mcp.title + SEO.mcp.description), false);
  assert.ok(OG_ROUTE_READY.has("mcp"));
  assert.equal(OG_ROUTE_IMAGES.mcp, "/og/mcp.png");
});

test("MCP is linked from the homepage, the Library, and the sitemap", () => {
  assert.match(read("src/routes/index.tsx"), /<Assistants \/>/);
  assert.match(read("src/routes/index.tsx"), /MCP\.pagePath/);
  assert.match(read("src/routes/library.tsx"), /MCP\.libraryLink/);
  assert.match(read("src/routes/sitemap[.]xml.tsx"), /MCP\.pagePath/);
});

test("announcement post exists, uses the MCP card as cover, and links to the page", () => {
  const post = getPostBySlug(MCP.postSlug);
  assert.ok(post, "post missing");
  assert.equal(post.category, "Product");
  assert.equal(post.cover_image, OG_ROUTE_IMAGES.mcp);
  assert.ok(post.cover_alt);
  assert.match(post.content, new RegExp(`\\]\\(${MCP.pagePath}\\)`));
  assert.match(post.seo_title, /MCP/);
  assert.ok(post.faq && post.faq.length >= 2);
});
