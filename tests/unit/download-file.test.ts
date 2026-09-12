// Regression: Download opened the image in a new tab instead of actually
// downloading it. `<a download href="https://cross-origin/...">.click()`
// only honors the `download` attribute for a same-origin href; for a
// cross-origin URL (Supabase Storage, a different host from the app)
// browsers ignore `download` and just navigate -- and `target="_blank"`
// (a reflexive `noopener` habit both call sites had) turned that
// navigation into a new tab. Confirmed live via screenshot.
//
// Same grep-on-source approach as the rest of tests/unit (no React
// renderer in this project -- see CLAUDE.md's "No test framework").

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("downloadFile fetches the bytes and downloads from a same-origin blob: URL, falling back to opening the URL only on failure", () => {
  const src = read("src/lib/download-file.ts");
  assert.match(src, /await fetch\(url\)/);
  assert.match(src, /URL\.createObjectURL\(blob\)/);
  assert.match(src, /a\.download = filename/);
  // No target="_blank" on the real download path -- that's what turned a
  // failed cross-origin download into a new-tab navigation.
  const tryBlock = src.slice(src.indexOf("try {"), src.indexOf("} catch"));
  assert.doesNotMatch(tryBlock, /target\s*=\s*"_blank"/);
  // Falling back to a new tab is only acceptable once the real download
  // path has already failed (e.g. CORS) -- inside the catch, not instead
  // of trying.
  const catchBlock = src.slice(src.indexOf("} catch"));
  assert.match(catchBlock, /window\.open\(url, "_blank", "noopener"\)/);
});

test("both download call sites (Generate's result canvas, the Account Hub's creation detail) use the shared downloadFile helper", () => {
  for (const file of [
    "src/lib/generation/use-generation.ts",
    "src/components/account/CreationDetailView.tsx",
  ]) {
    const src = read(file);
    assert.match(src, /import \{ downloadFile \} from "@\/lib\/download-file"/, file);
    assert.match(src, /downloadFile\(/, file);
    // The old bug pattern must not survive anywhere.
    assert.doesNotMatch(
      src,
      /a\.target = "_blank"/,
      `${file} must not build its own <a target="_blank"> download`,
    );
  }
});
