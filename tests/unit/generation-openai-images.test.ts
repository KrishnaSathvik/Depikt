import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateImage,
  editImage,
  estimateApiCostUsd,
  OpenAIImageError,
} from "../../src/lib/generation/openai-images.ts";

// No test in this file makes a real network call — fetchImpl is always a
// mock. Generation is expensive and billable; see the benchmark log
// (research/images-2-5-community/runs/_fixtures/log.json) for real numbers.

function mockFetch(handler: (url: string, init: RequestInit) => { status: number; body: unknown }) {
  return async (url: string | URL, init?: RequestInit) => {
    const { status, body } = handler(String(url), init ?? {});
    return new Response(JSON.stringify(body), { status });
  };
}

test("generateImage sends the resolved model id, forced quality=max, and requested size", async () => {
  let capturedBody: Record<string, unknown> | null = null;
  const fetchImpl = mockFetch((url, init) => {
    capturedBody = JSON.parse(init.body as string);
    return {
      status: 200,
      body: { data: [{ b64_json: "AAAA" }], usage: { input_tokens: 10, output_tokens: 7024 } },
    };
  }) as unknown as typeof fetch;

  const result = await generateImage({
    model: "sunburst",
    prompt: "a poster",
    width: 1536,
    height: 1024,
    apiKey: "sk-test",
    fetchImpl,
  });

  assert.equal(result.b64, "AAAA");
  assert.equal(capturedBody!.model, "gpt-image-2.5-sunburst");
  assert.equal(capturedBody!.quality, "max");
  assert.equal(capturedBody!.size, "1536x1024");
  assert.equal(capturedBody!.prompt, "a poster");
});

test("a client cannot override quality: generateImage's input type has no quality field to pass through", () => {
  // Structural guarantee, not a runtime one: GenerateImageInput has no
  // `quality` property, so there is nothing for a caller to smuggle through
  // even if the server route naively spread a client body into it.
  const input: import("../../src/lib/generation/openai-images.ts").GenerateImageInput = {
    model: "flare",
    prompt: "x",
    width: 1024,
    height: 1024,
    apiKey: "sk-test",
  };
  assert.equal("quality" in input, false);
});

test("generateImage throws OpenAIImageError with the status on failure", async () => {
  const fetchImpl = mockFetch(() => ({
    status: 400,
    body: { error: { message: "bad prompt" } },
  })) as unknown as typeof fetch;

  await assert.rejects(
    () =>
      generateImage({
        model: "flare",
        prompt: "x",
        width: 1024,
        height: 1024,
        apiKey: "sk-test",
        fetchImpl,
      }),
    (err: unknown) => {
      assert.ok(err instanceof OpenAIImageError);
      assert.equal(err.status, 400);
      assert.match(err.message, /bad prompt/);
      return true;
    },
  );
});

test("editImage sends multipart form with model, size, quality=max, and reference images", async () => {
  let capturedForm: FormData | null = null;
  const fetchImpl = (async (_url: string | URL, init?: RequestInit) => {
    capturedForm = init!.body as FormData;
    return new Response(
      JSON.stringify({ data: [{ b64_json: "BBBB" }], usage: { output_tokens: 7024 } }),
      { status: 200 },
    );
  }) as unknown as typeof fetch;

  const result = await editImage({
    model: "flare",
    prompt: "change the background",
    width: 1024,
    height: 1024,
    apiKey: "sk-test",
    fetchImpl,
    referenceImages: [
      { bytes: new Uint8Array([1, 2, 3]), filename: "ref.png", mimeType: "image/png" },
    ],
  });

  assert.equal(result.b64, "BBBB");
  assert.equal(capturedForm!.get("model"), "gpt-image-2.5-flare");
  assert.equal(capturedForm!.get("prompt"), "change the background");
  assert.equal(capturedForm!.get("quality"), "max");
  assert.equal(capturedForm!.get("size"), "1024x1024");
  assert.equal(capturedForm!.get("n"), "1");
  assert.equal(capturedForm!.get("output_format"), "png");
  assert.ok(capturedForm!.get("image[]"));
  assert.equal(capturedForm!.get("mask"), null);
});

test("editImage with a mask sends a separate PNG mask field and keeps it out of image[]", async () => {
  let capturedForm: FormData | null = null;
  const fetchImpl = (async (_url: string | URL, init?: RequestInit) => {
    capturedForm = init!.body as FormData;
    return new Response(
      JSON.stringify({ data: [{ b64_json: "CCCC" }], usage: { output_tokens: 7024 } }),
      { status: 200 },
    );
  }) as unknown as typeof fetch;

  const maskBytes = new Uint8Array([9, 9, 9]);
  const result = await editImage({
    model: "sunburst",
    prompt: "change the selected area",
    width: 1024,
    height: 1024,
    apiKey: "sk-test",
    fetchImpl,
    referenceImages: [
      { bytes: new Uint8Array([1, 2, 3]), filename: "source.png", mimeType: "image/png" },
    ],
    mask: { bytes: maskBytes, filename: "user-mask.png", mimeType: "image/png" },
  });

  assert.equal(result.b64, "CCCC");
  assert.equal(capturedForm!.get("model"), "gpt-image-2.5-sunburst");
  assert.equal(capturedForm!.get("prompt"), "change the selected area");
  assert.equal(capturedForm!.get("n"), "1");
  assert.equal(capturedForm!.get("quality"), "max");
  assert.equal(capturedForm!.get("output_format"), "png");

  const images = capturedForm!.getAll("image[]") as File[];
  assert.equal(images.length, 1);
  assert.equal(images[0].name, "source.png");

  const mask = capturedForm!.get("mask") as File;
  assert.ok(mask);
  assert.equal(mask.name, "mask.png");
  assert.equal(mask.type, "image/png");
  assert.deepEqual(new Uint8Array(await mask.arrayBuffer()), maskBytes);
});

test("editImage preserves image[] order so the first reference stays image[0]", async () => {
  let capturedForm: FormData | null = null;
  const fetchImpl = (async (_url: string | URL, init?: RequestInit) => {
    capturedForm = init!.body as FormData;
    return new Response(JSON.stringify({ data: [{ b64_json: "DDDD" }] }), { status: 200 });
  }) as unknown as typeof fetch;

  await editImage({
    model: "flare",
    prompt: "x",
    width: 1024,
    height: 1024,
    apiKey: "sk-test",
    fetchImpl,
    referenceImages: [
      { bytes: new Uint8Array([1]), filename: "source.png", mimeType: "image/png" },
      { bytes: new Uint8Array([2]), filename: "ref-a.png", mimeType: "image/png" },
      { bytes: new Uint8Array([3]), filename: "ref-b.png", mimeType: "image/png" },
    ],
    mask: { bytes: new Uint8Array([9]), filename: "mask.png", mimeType: "image/png" },
  });

  const images = capturedForm!.getAll("image[]") as File[];
  assert.deepEqual(
    images.map((file) => file.name),
    ["source.png", "ref-a.png", "ref-b.png"],
  );
  assert.equal((capturedForm!.get("mask") as File).name, "mask.png");
});

test("editImage throws OpenAIImageError on a failed response", async () => {
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ error: { message: "unsupported reference" } }), {
      status: 422,
    })) as unknown as typeof fetch;

  await assert.rejects(
    () =>
      editImage({
        model: "sunburst",
        prompt: "x",
        width: 1024,
        height: 1024,
        apiKey: "sk-test",
        fetchImpl,
        referenceImages: [],
      }),
    (err: unknown) => {
      assert.ok(err instanceof OpenAIImageError);
      assert.equal(err.status, 422);
      return true;
    },
  );
});

test("estimateApiCostUsd matches the published per-token rates", () => {
  // From the real max-quality benchmark: 1024x1024 generate, 32 text tokens,
  // 7024 output tokens -> ~$0.2109 (research/.../log.json, bench-gen-flare-1).
  const cost = estimateApiCostUsd({
    input_tokens: 32,
    input_tokens_details: { text_tokens: 32, image_tokens: 0 },
    output_tokens: 7024,
  });
  assert.ok(cost !== null);
  assert.ok(Math.abs(cost! - 0.2109) < 0.0005, `expected ~0.2109, got ${cost}`);
});

test("estimateApiCostUsd includes image input tokens for edits", () => {
  // bench-edit-flare-4: text_in=37, img_in=1536, out=7024 -> ~$0.2232
  const cost = estimateApiCostUsd({
    input_tokens_details: { text_tokens: 37, image_tokens: 1536 },
    output_tokens: 7024,
  });
  assert.ok(Math.abs(cost! - 0.2232) < 0.0005, `expected ~0.2232, got ${cost}`);
});

test("estimateApiCostUsd returns null when usage is absent", () => {
  assert.equal(estimateApiCostUsd(undefined), null);
});
