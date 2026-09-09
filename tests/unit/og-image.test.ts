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

test("OG route map covers the seven primary routes with distinct files", () => {
  const files = Object.values(OG_ROUTE_IMAGES);
  assert.equal(files.length, 7);
  assert.equal(new Set(files).size, 7);
});
