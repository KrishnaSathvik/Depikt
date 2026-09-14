import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const grid = readFileSync(
  resolve(import.meta.dirname, "../../src/components/generate/SeriesJobsGrid.tsx"),
  "utf8",
);

test("series results use a non-cropping image frame", () => {
  assert.match(grid, /bg-\[color:var\(--bg-subtle\)\]/);
  assert.match(grid, /className="block w-full object-contain"/);
  assert.doesNotMatch(grid, /aspect-square[^"]*object-cover/);
});

test("series job text uses design-system typography and color tokens", () => {
  assert.match(grid, /label-mono truncate/);
  assert.match(grid, /text-body-sm text-destructive/);
  assert.doesNotMatch(grid, /text-\[(?:11|12)px\]|text-red-600/);
});
