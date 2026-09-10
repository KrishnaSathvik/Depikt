import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { OG_ROUTE_IMAGES, OG_ROUTE_READY } from "../../src/lib/og-routes.ts";

const PUBLIC = resolve(import.meta.dirname, "../../public");

test("every ready OG card exists under public/ and is a 1200x630 PNG path", () => {
  for (const key of OG_ROUTE_READY) {
    const rel = OG_ROUTE_IMAGES[key];
    assert.match(rel, /^\/og\/[a-z-]+\.png$/);
    assert.ok(existsSync(resolve(PUBLIC, rel.slice(1))), `${rel} is missing on disk`);
  }
});

test("OG route map: one card per primary route, one shared Prompt card", () => {
  const files = Object.values(OG_ROUTE_IMAGES);
  assert.equal(files.length, 8);
  assert.equal(new Set(files).size, 8);
  assert.deepEqual(Object.keys(OG_ROUTE_IMAGES).sort(), [
    "blog",
    "gallery",
    "generate",
    "home",
    "library",
    "mcp",
    "prompt",
    "templates",
  ]);
  // Build and Critique share the Prompt card; no builder/critic cards remain.
  assert.equal(OG_ROUTE_IMAGES.prompt, "/og/prompt.png");
  assert.equal(existsSync(resolve(PUBLIC, "og/prompt-builder.png")), false);
  assert.equal(existsSync(resolve(PUBLIC, "og/prompt-critic.png")), false);
});
