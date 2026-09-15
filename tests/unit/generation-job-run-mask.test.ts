import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assembleJobImages } from "../../src/lib/generation/job-images.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

test("assembleJobImages puts the source first, then references, and keeps the mask separate", async () => {
  const downloaded: string[] = [];
  const download = async (path: string) => {
    downloaded.push(path);
    return {
      bytes: new Uint8Array([1]),
      filename: path.split("/").pop() ?? "image.png",
      mimeType: "image/png",
    };
  };

  const result = await assembleJobImages({
    download,
    sourcePath: "users/u/source.png",
    referencePaths: ["users/u/ref-a.png", "users/u/ref-b.png"],
    maskPath: "users/u/masks/mask-1.png",
  });

  assert.deepEqual(
    result.referenceImages.map((img) => img.filename),
    ["source.png", "ref-a.png", "ref-b.png"],
  );
  assert.equal(result.editMask?.filename, "mask-1.png");
  assert.equal(
    result.referenceImages.some((img) => img.filename === "mask-1.png"),
    false,
  );
  assert.deepEqual(downloaded, [
    "users/u/source.png",
    "users/u/ref-a.png",
    "users/u/ref-b.png",
    "users/u/masks/mask-1.png",
  ]);
});

test("assembleJobImages leaves editMask null when there is no mask path", async () => {
  const result = await assembleJobImages({
    download: async (path) => ({
      bytes: new Uint8Array([1]),
      filename: path.split("/").pop() ?? "image.png",
      mimeType: "image/png",
    }),
    sourcePath: "users/u/source.png",
    referencePaths: ["users/u/ref.png"],
    maskPath: null,
  });

  assert.equal(result.editMask, null);
  assert.deepEqual(
    result.referenceImages.map((img) => img.filename),
    ["source.png", "ref.png"],
  );
});

test("assembleJobImages fails when maskPath is set and download returns null", async () => {
  await assert.rejects(
    () =>
      assembleJobImages({
        download: async (path) => {
          if (path.includes("/masks/")) return null;
          return {
            bytes: new Uint8Array([1]),
            filename: path.split("/").pop() ?? "image.png",
            mimeType: "image/png",
          };
        },
        sourcePath: "users/u/source.png",
        referencePaths: [],
        maskPath: "users/u/masks/mask-1.png",
      }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /selected region|edit mask/i);
      return true;
    },
  );
});

test("jobs.$id.run.ts loads the mask from stored plan_json and never reads a body path", () => {
  const src = read("src/routes/api/generation/jobs.$id.run.ts");
  assert.match(src, /extractStoredMaskPath\(session\?\.plan_json\)/);
  assert.match(src, /editMask/);
  assert.match(src, /body\.maskPath would be ignored/);
  assert.doesNotMatch(src, /request\.json\(/);
  assert.doesNotMatch(src, /await request\.json/);
  assert.doesNotMatch(src, /req\.maskPath/);
});

test("jobs.$id.run.ts keeps source download before references and does not push the mask onto referenceImages", () => {
  const src = read("src/routes/api/generation/jobs.$id.run.ts");
  const sourceFetchIdx = src.indexOf('job.operation === "edit" && job.source_version_id');
  const assembleIdx = src.indexOf("await assembleJobImages");
  assert.ok(sourceFetchIdx > 0 && assembleIdx > 0);
  assert.ok(
    sourceFetchIdx < assembleIdx,
    "source-version fetch must run before assembling reference images and the mask",
  );
  assert.match(src, /editMask/);
  assert.doesNotMatch(src, /referenceImages\.push\(\s*editMask/);
  assert.doesNotMatch(src, /referenceImages\.push\(.*mask/s);
});

test("jobs.$id.run.ts fails the job and refunds when assembleJobImages throws", () => {
  const src = read("src/routes/api/generation/jobs.$id.run.ts");
  const assembleIdx = src.indexOf("await assembleJobImages");
  assert.ok(assembleIdx > 0);
  const aroundAssemble = src.slice(Math.max(0, assembleIdx - 200), assembleIdx + 900);
  assert.match(aroundAssemble, /try\s*\{/);
  assert.match(aroundAssemble, /catch/);
  assert.match(aroundAssemble, /markJobFailed/);
  assert.match(aroundAssemble, /"refunded"/);
});
