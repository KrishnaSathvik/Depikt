import { test } from "node:test";
import assert from "node:assert/strict";
import {
  IMAGE_MODEL_REGISTRY,
  capabilitiesFor,
  capabilitiesForModelId,
  assertImageRequestSupported,
  isSupportedSize,
} from "../../src/lib/generation/provider-capabilities.ts";
import { resolveModelId, GENERATION_QUALITY } from "../../src/lib/generation/models.ts";

test("registry covers exactly the 2.5 and 2.6 Flare/Sunburst models", () => {
  assert.deepEqual(
    IMAGE_MODEL_REGISTRY.map((m) => m.id).sort(),
    [
      "gpt-image-2.5-flare",
      "gpt-image-2.5-sunburst",
      "gpt-image-2.6-flare",
      "gpt-image-2.6-sunburst",
    ],
  );
});

test("every registry entry is reachable through resolveModelId", () => {
  for (const caps of IMAGE_MODEL_REGISTRY) {
    assert.equal(resolveModelId(caps.alias, caps.family), caps.id);
    assert.equal(capabilitiesForModelId(caps.id), caps);
    assert.equal(capabilitiesFor(caps.alias, caps.family), caps);
  }
});

test("resolveModelId defaults to the 2.5 family until the benchmark cutover", () => {
  assert.equal(resolveModelId("flare"), "gpt-image-2.5-flare");
  assert.equal(resolveModelId("sunburst"), "gpt-image-2.5-sunburst");
  assert.equal(resolveModelId("flare", "2.6"), "gpt-image-2.6-flare");
  assert.equal(resolveModelId("sunburst", "2.6"), "gpt-image-2.6-sunburst");
});

test("token pricing is identical across all four models", () => {
  for (const caps of IMAGE_MODEL_REGISTRY) {
    assert.equal(caps.pricing.textInputPerM, 5);
    assert.equal(caps.pricing.imageInputPerM, 8);
    assert.equal(caps.pricing.imageOutputPerM, 30);
  }
});

test("2.6 adds complexity, SVG and GIF; 2.5 does not have them", () => {
  for (const caps of IMAGE_MODEL_REGISTRY) {
    if (caps.family === "2.6") {
      assert.deepEqual(caps.complexity, ["low", "medium", "high"]);
      assert.ok(caps.outputFormats.generate.includes("svg"));
      assert.ok(caps.outputFormats.generate.includes("gif"));
      assert.ok(caps.gif);
    } else {
      assert.equal(caps.complexity, null);
      assert.equal(caps.outputFormats.generate.includes("svg"), false);
      assert.equal(caps.outputFormats.generate.includes("gif"), false);
      assert.equal(caps.gif, null);
    }
    // SVG and GIF are generations-only on every model.
    assert.equal(caps.outputFormats.edit.includes("svg"), false);
    assert.equal(caps.outputFormats.edit.includes("gif"), false);
  }
});

test("the server's standard request shape passes on every model", () => {
  for (const caps of IMAGE_MODEL_REGISTRY) {
    for (const operation of ["generate", "edit"] as const) {
      assert.equal(
        assertImageRequestSupported(caps.id, {
          operation,
          quality: GENERATION_QUALITY,
          outputFormat: "png",
        }),
        caps,
      );
    }
  }
});

test("unsupported combinations are rejected before any billable call", () => {
  // Unknown model id.
  assert.throws(() =>
    assertImageRequestSupported("gpt-image-2", {
      operation: "generate",
      quality: "max",
      outputFormat: "png",
    }),
  );
  // Complexity on 2.5.
  assert.throws(() =>
    assertImageRequestSupported("gpt-image-2.5-flare", {
      operation: "generate",
      quality: "max",
      outputFormat: "png",
      complexity: "low",
    }),
  );
  // SVG/GIF on the edit endpoint.
  assert.throws(() =>
    assertImageRequestSupported("gpt-image-2.6-flare", {
      operation: "edit",
      quality: "max",
      outputFormat: "svg",
    }),
  );
  // Quality outside the ladder.
  assert.throws(() =>
    assertImageRequestSupported("gpt-image-2.6-flare", {
      operation: "generate",
      quality: "ultra",
      outputFormat: "png",
    }),
  );
  // Mask and markup are mutually exclusive.
  assert.throws(() =>
    assertImageRequestSupported("gpt-image-2.6-sunburst", {
      operation: "edit",
      quality: "max",
      outputFormat: "png",
      hasMask: true,
      hasMarkup: true,
    }),
  );
  // GIF frame limits.
  assert.throws(() =>
    assertImageRequestSupported("gpt-image-2.6-flare", {
      operation: "generate",
      quality: "max",
      outputFormat: "gif",
      gif: { frameCount: 65 },
    }),
  );
  assert.throws(() =>
    assertImageRequestSupported("gpt-image-2.6-flare", {
      operation: "generate",
      quality: "max",
      outputFormat: "gif",
      gif: { frameDurationMs: 10 },
    }),
  );
});

test("2.6 accepts documented GIF and complexity combinations", () => {
  assert.doesNotThrow(() =>
    assertImageRequestSupported("gpt-image-2.6-sunburst", {
      operation: "generate",
      quality: "high",
      outputFormat: "gif",
      complexity: "medium",
      gif: { frameCount: 9, frameDurationMs: 200 },
    }),
  );
});

test("documented size rules: recommended sizes pass, off-grid sizes fail", () => {
  const caps = capabilitiesFor("flare", "2.6");
  assert.equal(isSupportedSize(caps, 1024, 1024), true);
  assert.equal(isSupportedSize(caps, 1536, 1024), true);
  assert.equal(isSupportedSize(caps, 1024, 1536), true);
  assert.equal(isSupportedSize(caps, 1000, 1000), false); // not a multiple of 16
  assert.equal(isSupportedSize(caps, 4096, 1024), false); // edge over 3840
  assert.equal(isSupportedSize(caps, 512, 512), false); // below min pixels
  assert.equal(isSupportedSize(caps, 3840, 1024), false); // aspect over 3:1
});
