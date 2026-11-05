import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeSvg,
  gifMetadata,
  validateGeneratedMedia,
} from "../../src/lib/generation/media.ts";
import {
  quoteMediaOperation,
  assertMediaExecutionPriced,
} from "../../src/lib/generation/media-pricing.ts";
import { validateMarkupPng } from "../../src/lib/generation/markup.ts";
import { encodeRgbaPng } from "../../src/lib/generation/png-mask.ts";
import { generateImage, editImage } from "../../src/lib/generation/openai-images.ts";
import { validateCreatePlanBody } from "../../src/lib/generation/job-request.ts";
import { readBoundedJson } from "../../src/lib/generation/bounded-json.ts";
import {
  authorizeExecution,
  verifyExecutionAuthorization,
} from "../../src/lib/generation/execution-auth.ts";
import {
  runGenerationJob,
  type GenerationDataAccess,
} from "../../src/lib/generation/job-pipeline.ts";

const svg = (content = '<path d="M0 0L10 10"/>') =>
  new TextEncoder().encode(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${content}</svg>`,
  );
const successFetch = (body: unknown) =>
  (async () => new Response(JSON.stringify(body))) as typeof fetch;
test("SVG preserves editable vectors and intrinsic dimensions", () => {
  const result = sanitizeSvg(svg());
  assert.equal(result.width, 1024);
  assert.match(new TextDecoder().decode(result.bytes), /<path/);
});
for (const [label, content] of Object.entries({
  script: "<script>alert(1)</script>",
  event: '<path onload="x"/>',
  external: '<image href="https://example.com/x"/>',
  foreign: "<foreignObject/>",
  recursive: '<use id="a" href="#a"/>',
  style: '<path style="fill:url(https://example.com)"/>',
  malformed: "<g><path></g>",
})) {
  test(`SVG rejects ${label}`, () => assert.throws(() => sanitizeSvg(svg(content))));
}
test("SVG rejects MIME-confused, entities and invalid dimensions", () => {
  for (const value of [
    "GIF89a",
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg/>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="99999" height="1"/>',
  ])
    assert.throws(() => sanitizeSvg(new TextEncoder().encode(value)));
});
test("Markup enforces exact alignment, transparency and annotation coverage", () => {
  const bytes = encodeRgbaPng(new Uint8Array([0, 0, 0, 255, 0, 0, 0, 0]), 2, 1);
  validateMarkupPng(bytes, 2, 1);
  assert.throws(() => validateMarkupPng(bytes, 1, 2));
  assert.throws(() => validateMarkupPng(encodeRgbaPng(new Uint8Array(8), 2, 1), 2, 1));
  assert.throws(() =>
    validateMarkupPng(encodeRgbaPng(new Uint8Array([0, 0, 0, 255, 0, 0, 0, 255]), 2, 1), 2, 1),
  );
  assert.throws(() => validateMarkupPng(bytes.subarray(0, 34), 2, 1));
});
test("Markup multipart is separate from original images and mask is excluded", async () => {
  const source = encodeRgbaPng(new Uint8Array(8), 2, 1),
    markup = encodeRgbaPng(new Uint8Array([0, 0, 0, 255, 0, 0, 0, 0]), 2, 1);
  let form: FormData | undefined;
  const input = {
    model: "flare" as const,
    family: "2.6" as const,
    prompt: "change annotation",
    width: 2,
    height: 1,
    apiKey: "test",
    referenceImages: [{ bytes: source, filename: "source.png", mimeType: "image/png" }],
    markup: { bytes: markup, filename: "markup.png", mimeType: "image/png" },
    fetchImpl: (async (_url, init) => {
      form = init?.body as FormData;
      return new Response(JSON.stringify({ data: [{ b64_json: "AA==" }] }));
    }) as typeof fetch,
  };
  await editImage(input);
  assert.ok(form?.get("markup"));
  assert.ok(form?.get("image[]"));
  assert.equal(form?.get("mask"), null);
  await assert.rejects(() => editImage({ ...input, mask: input.markup }));
});
test("GIF and SVG adapter use native endpoint and documented GIF fields", async () => {
  for (const format of ["svg", "gif"] as const) {
    let body: Record<string, unknown> = {};
    await generateImage({
      model: "flare",
      family: "2.6",
      prompt: "lantern motion",
      width: 1024,
      height: 1024,
      apiKey: "test",
      outputFormat: format,
      ...(format === "gif" ? { gif: { frameCount: 9, frameDurationMs: 200 } } : {}),
      fetchImpl: (async (url, init) => {
        assert.equal(url, "https://api.openai.com/v1/images/generations");
        body = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ data: [{ b64_json: "AA==" }] }));
      }) as typeof fetch,
    });
    assert.equal(body.output_format, format);
    assert.equal(body.n, 1);
    assert.equal(body.frame_count, format === "gif" ? 9 : undefined);
    assert.equal(body.frame_duration_ms, format === "gif" ? 200 : undefined);
  }
});
test("Existing image charges stay one credit; paid GIF execution has no guessed quote", () => {
  assert.equal(quoteMediaOperation("generate").creditsPerJob, 1);
  assert.equal(quoteMediaOperation("edit").creditsPerJob, 1);
  const media = {
    family: "2.6" as const,
    outputFormat: "gif" as const,
    gif: { frameCount: 64, frameDurationMs: 2000 },
  };
  assert.equal(quoteMediaOperation("generate", media).creditsPerJob, null);
  assert.equal(quoteMediaOperation("generate", media).executable, false);
  assert.throws(() => assertMediaExecutionPriced("generate", media));
});
test("GIF parser rejects truncation, false MIME and static images", () => {
  for (const bytes of [svg(), new Uint8Array(0), new TextEncoder().encode("GIF89a")])
    assert.throws(() => gifMetadata(bytes));
});
test("GIF preserves original bytes and reads real durations, frames and loop metadata", () => {
  const bytes = new Uint8Array(
    Buffer.from(
      "R0lGODlhIAAgAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQAFAAAACwAAAAAIAAgAAAINQABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjyBDihxJsqTJkyhTqlzJUmRAACH5BAEeAAEALAAAAAAgACAAgQCAAAAAAAAAAAAAAAg1AAEIHEiwoMGDCBMqXMiwocOHECNKnEixosWLGDNq3Mixo8ePIEOKHEmypMmTKFOqXMlSZEAAOw==",
      "base64",
    ),
  );
  const result = validateGeneratedMedia(bytes, "gif", 1024, 1024);
  assert.equal(result.bytes, bytes);
  assert.equal(result.metadata.width, 32);
  assert.equal(result.metadata.height, 32);
  assert.equal(result.metadata.frameCount, 2);
  assert.deepEqual(result.metadata.frameDurationsMs, [200, 300]);
  assert.equal(result.metadata.durationMs, 500);
  assert.equal(result.metadata.loopCount, 0);
  assert.throws(() => gifMetadata(bytes.subarray(0, bytes.length - 2)));
});
test("Request rejects markup plus mask, paths, fractional frames and out-of-range durations", () => {
  for (const patch of [
    { markupPath: "users/other/x" },
    { outputFormat: "gif", gif: { frameCount: 2.5, frameDurationMs: 200 } },
    { outputFormat: "gif", gif: { frameCount: 2, frameDurationMs: 2001 } },
    {
      markupAssetId: "11111111-1111-4111-8111-111111111111",
      sourceVersionId: "source",
      maskAssetId: "mask",
    },
  ])
    assert.equal(validateCreatePlanBody({ prompt: "test", ...patch }).ok, false);
  const result = validateCreatePlanBody({
    prompt: "test",
    outputFormat: "gif",
    gif: { frameCount: 16, frameDurationMs: 25 },
  });
  assert.ok(result.ok);
  if (result.ok) assert.equal(result.request.gif?.frameDurationMs, 30);
});
test("GIF requests accept 16 frames and reject 17 before reservation", () => {
  assert.equal(
    validateCreatePlanBody({
      prompt: "test",
      outputFormat: "gif",
      gif: { frameCount: 16, frameDurationMs: 200 },
    }).ok,
    true,
  );
  assert.equal(
    validateCreatePlanBody({
      prompt: "test",
      outputFormat: "gif",
      gif: { frameCount: 17, frameDurationMs: 200 },
    }).ok,
    false,
  );
});
test("SVG retains safe standard typography and stroke attributes", () => {
  const result = sanitizeSvg(
    svg(
      '<text x="10" y="30" font-style="italic" letter-spacing="1">Hello</text><path d="M0 0L10 10" stroke-miterlimit="4"/>',
    ),
  );
  assert.match(new TextDecoder().decode(result.bytes), /font-style="italic"/);
});
test("Request size limit works without Content-Length", async () => {
  await assert.rejects(() =>
    readBoundedJson(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ huge: "x".repeat(100) }),
      }),
      50,
    ),
  );
});
test("Encrypted execution tokens do not invalidate media authorization but tampered media does", () => {
  const plan = {
    mode: "single",
    media: { family: "2.6", outputFormat: "svg" },
    sourceVersionId: null,
  } as unknown as Parameters<typeof authorizeExecution>[0];
  const auth = authorizeExecution(plan, {
    operation: "generate",
    width: 1024,
    height: 1024,
    userId: "u",
    secret: "s",
    children: [{ key: "k", prompt: "p" }],
  });
  const job = {
    userId: "u",
    idempotencyKey: "k",
    prompt: "p",
    operation: "generate",
    width: 1024,
    height: 1024,
    sourceVersionId: null,
  };
  const stored = { ...plan, executionAuthorization: auth, executionTokensEnc: { k: "encrypted" } };
  verifyExecutionAuthorization(stored, job, "s", true);
  assert.throws(() =>
    verifyExecutionAuthorization(
      { ...stored, media: { family: "2.6", outputFormat: "gif" } },
      job,
      "s",
      true,
    ),
  );
});
test("SVG pipeline stores native vector and charges once; unsafe SVG/storage failure refund only", async () => {
  for (const variant of ["ok", "unsafe", "storage"] as const) {
    const settlements: string[] = [],
      versions: Parameters<GenerationDataAccess["insertImageVersion"]>[0][] = [];
    const data: GenerationDataAccess = {
      markJobRunning: async () => true,
      markJobSucceeded: async () => true,
      markJobFailed: async () => {},
      uploadImage: async (path, bytes, mime) => {
        assert.ok(path.endsWith(".svg"));
        assert.equal(mime, "image/svg+xml");
        assert.match(new TextDecoder().decode(bytes), /<svg/);
        if (variant === "storage") throw new Error("storage");
      },
      insertImageVersion: async (row) => {
        versions.push(row);
        return { id: "v" };
      },
      finalizeCredits: async (_u, amount, _k, outcome) => {
        assert.equal(amount, 1);
        settlements.push(outcome);
        return { availableCredits: 1 };
      },
      buildStoragePath: (_u, _s, _v, format) => `result.${format}`,
      newVersionId: () => "v",
    };
    const outcome = await runGenerationJob(
      {
        id: "j",
        userId: "u",
        sessionId: "s",
        operation: "generate",
        model: "flare",
        prompt: "vector",
        width: 1024,
        height: 1024,
        idempotencyKey: "k",
        referenceImages: [],
        media: { family: "2.6", outputFormat: "svg" },
      },
      null,
      {
        data,
        apiKey: "test",
        fetchImpl: successFetch({ data: [{ b64_json: "AA==" }] }),
        decodeBase64: () => svg(variant === "unsafe" ? "<script/>" : undefined),
      },
    );
    assert.equal(outcome.outcome, variant === "ok" ? "succeeded" : "failed");
    assert.deepEqual(settlements, [variant === "ok" ? "charged" : "refunded"]);
    if (variant === "ok") {
      assert.equal(versions[0].mediaMetadata?.format, "svg");
      assert.equal(versions[0].mimeType, "image/svg+xml");
    }
  }
});
