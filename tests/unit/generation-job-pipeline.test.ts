import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CREDIT_CHARGE_BUDGET_MS,
  runGenerationJob,
  type GenerationDataAccess,
  type GenerationJobRecord,
} from "../../src/lib/generation/job-pipeline.ts";
import { OpenAIImageError } from "../../src/lib/generation/openai-images.ts";

// In-memory fake standing in for the Supabase-backed implementation. Every
// call is recorded so tests can assert on the exact sequence of effects —
// this is where "never charge and refund the same job" gets proven.
function makeFakeDataAccess(
  options: {
    runningTransition?: boolean;
    succeedTransition?: boolean;
    chargeFailure?: boolean;
  } = {},
) {
  const calls: string[] = [];
  const uploaded: Record<string, Uint8Array> = {};
  const versions: unknown[] = [];
  const finalizeCalls: { outcome: string; jobId: string }[] = [];
  let jobStatus = "queued";
  let versionCounter = 0;

  const access: GenerationDataAccess = {
    async markJobRunning(jobId) {
      calls.push(`running:${jobId}`);
      if (options.runningTransition === false) return false;
      jobStatus = "running";
      return true;
    },
    async markJobSucceeded(jobId) {
      calls.push(`succeeded:${jobId}`);
      if (options.succeedTransition === false) return false;
      jobStatus = "succeeded";
      return true;
    },
    async markJobFailed(jobId, patch) {
      calls.push(`failed:${jobId}:${patch.errorCode}`);
      jobStatus = "failed";
    },
    async uploadImage(path, bytes) {
      calls.push(`upload:${path}`);
      uploaded[path] = bytes;
    },
    async insertImageVersion(row) {
      calls.push(`version:${row.storagePath}`);
      versions.push(row);
      return { id: `version-${++versionCounter}` };
    },
    async finalizeCredits(userId, amount, idempotencyKey, outcome, jobId) {
      calls.push(`finalize:${outcome}:${jobId}`);
      finalizeCalls.push({ outcome, jobId });
      if (outcome === "charged" && options.chargeFailure) {
        throw new Error("credit settlement unavailable");
      }
      return { availableCredits: outcome === "refunded" ? 5 : 4 };
    },
    buildStoragePath(userId, sessionId, versionId) {
      return `users/${userId}/sessions/${sessionId}/versions/${versionId}.png`;
    },
    newVersionId() {
      return `v${++versionCounter}`;
    },
  };

  return { access, calls, uploaded, versions, finalizeCalls, getStatus: () => jobStatus };
}

function baseJob(overrides: Partial<GenerationJobRecord> = {}): GenerationJobRecord {
  return {
    id: "job-1",
    userId: "user-1",
    sessionId: "session-1",
    operation: "generate",
    model: "flare",
    prompt: "a poster",
    width: 1024,
    height: 1024,
    idempotencyKey: "idem-1",
    referenceImages: [],
    ...overrides,
  };
}

test("successful generate: uploads, creates a version, and charges exactly once (never refunds)", async () => {
  const { access, calls, finalizeCalls } = makeFakeDataAccess();
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ data: [{ b64_json: "AAAA" }], usage: { output_tokens: 7024 } }), {
      status: 200,
    })) as unknown as typeof fetch;

  const result = await runGenerationJob(baseJob(), null, {
    data: access,
    apiKey: "sk-test",
    fetchImpl,
    decodeBase64: () => new Uint8Array([1, 2, 3]),
  });

  assert.equal(result.outcome, "succeeded");
  assert.deepEqual(calls, [
    "running:job-1",
    "upload:users/user-1/sessions/session-1/versions/v1.png",
    "version:users/user-1/sessions/session-1/versions/v1.png",
    "succeeded:job-1",
    "finalize:charged:job-1",
  ]);
  assert.equal(finalizeCalls.length, 1);
  assert.equal(finalizeCalls[0].outcome, "charged");
});

test("does not generate or settle credits when the running transition loses to stale-fail", async () => {
  const { access, calls, finalizeCalls } = makeFakeDataAccess({ runningTransition: false });
  let generateCalls = 0;
  const fetchImpl = (async () => {
    generateCalls += 1;
    return new Response(JSON.stringify({ data: [{ b64_json: "AAAA" }], usage: {} }), {
      status: 200,
    });
  }) as unknown as typeof fetch;

  const result = await runGenerationJob(baseJob(), null, {
    data: access,
    apiKey: "sk-test",
    fetchImpl,
    decodeBase64: () => new Uint8Array([1]),
  });

  assert.deepEqual(result, { outcome: "failed", errorCode: "timed_out" });
  assert.equal(generateCalls, 0);
  assert.deepEqual(calls, ["running:job-1"]);
  assert.equal(finalizeCalls.length, 0);
});

test("does not charge when stale failure wins the success transition", async () => {
  const { access, calls, finalizeCalls } = makeFakeDataAccess({ succeedTransition: false });
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ data: [{ b64_json: "AAAA" }], usage: {} }), {
      status: 200,
    })) as unknown as typeof fetch;

  const result = await runGenerationJob(baseJob(), null, {
    data: access,
    apiKey: "sk-test",
    fetchImpl,
    decodeBase64: () => new Uint8Array([1]),
  });

  assert.deepEqual(result, { outcome: "failed", errorCode: "timed_out" });
  assert.equal(finalizeCalls.length, 0);
  assert.equal(
    calls.some((call) => call.startsWith("failed:")),
    false,
  );
  assert.equal(calls.includes("finalize:charged:job-1"), false);
});

test("success returns even if charging credits hangs past the budget", async () => {
  const { access } = makeFakeDataAccess();
  access.finalizeCredits = () => new Promise(() => {});
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ data: [{ b64_json: "AAAA" }], usage: {} }), {
      status: 200,
    })) as unknown as typeof fetch;

  const started = Date.now();
  const result = await runGenerationJob(baseJob(), null, {
    data: access,
    apiKey: "sk-test",
    fetchImpl,
    decodeBase64: () => new Uint8Array([1]),
  });

  assert.deepEqual(result, { outcome: "succeeded", versionId: "v1" });
  assert.ok(Date.now() - started < CREDIT_CHARGE_BUDGET_MS + 500);
});

test("a charge settlement error after success never marks failed or refunds", async () => {
  const { access, calls, finalizeCalls, getStatus } = makeFakeDataAccess({ chargeFailure: true });
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ data: [{ b64_json: "AAAA" }], usage: {} }), {
      status: 200,
    })) as unknown as typeof fetch;

  const result = await runGenerationJob(baseJob(), null, {
    data: access,
    apiKey: "sk-test",
    fetchImpl,
    decodeBase64: () => new Uint8Array([1]),
  });

  assert.deepEqual(result, { outcome: "succeeded", versionId: "v1" });
  assert.equal(getStatus(), "succeeded");
  assert.deepEqual(finalizeCalls, [{ outcome: "charged", jobId: "job-1" }]);
  assert.equal(
    calls.some((call) => call.startsWith("failed:")),
    false,
  );
  assert.equal(calls.includes("finalize:refunded:job-1"), false);
});

test("failed generate (OpenAI rejects): marks failed, refunds exactly once, never charges", async () => {
  const { access, calls, finalizeCalls } = makeFakeDataAccess();
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ error: { message: "unsafe content" } }), {
      status: 400,
    })) as unknown as typeof fetch;

  const result = await runGenerationJob(baseJob(), null, {
    data: access,
    apiKey: "sk-test",
    fetchImpl,
    decodeBase64: () => new Uint8Array(),
  });

  assert.equal(result.outcome, "failed");
  assert.equal(result.errorCode, "rejected");
  assert.deepEqual(calls, ["running:job-1", "failed:job-1:rejected", "finalize:refunded:job-1"]);
  assert.equal(finalizeCalls.length, 1);
  assert.equal(finalizeCalls[0].outcome, "refunded");
  // no upload or version call on failure
  assert.equal(
    calls.some((c) => c.startsWith("upload:") || c.startsWith("version:")),
    false,
  );
});

test("429 from OpenAI is categorized as rate_limited, not a raw provider error", async () => {
  const { access } = makeFakeDataAccess();
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ error: { message: "too many requests" } }), {
      status: 429,
    })) as unknown as typeof fetch;

  const result = await runGenerationJob(baseJob(), null, {
    data: access,
    apiKey: "sk-test",
    fetchImpl,
    decodeBase64: () => new Uint8Array(),
  });

  assert.equal(result.outcome, "failed");
  assert.equal(result.errorCode, "rate_limited");
});

test("a storage upload failure after a successful OpenAI call still refunds, not charges", async () => {
  const { access, finalizeCalls } = makeFakeDataAccess();
  access.uploadImage = async () => {
    throw new Error("storage unavailable");
  };
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ data: [{ b64_json: "AAAA" }], usage: { output_tokens: 100 } }), {
      status: 200,
    })) as unknown as typeof fetch;

  const result = await runGenerationJob(baseJob(), null, {
    data: access,
    apiKey: "sk-test",
    fetchImpl,
    decodeBase64: () => new Uint8Array([1]),
  });

  assert.equal(result.outcome, "failed");
  assert.equal(finalizeCalls[0].outcome, "refunded");
});

test("edit uses editImage with reference bytes and sets parentVersionId on the new version", async () => {
  const { access, versions } = makeFakeDataAccess();
  let capturedForm: FormData | null = null;
  const fetchImpl = (async (_url: string | URL, init?: RequestInit) => {
    capturedForm = init!.body as FormData;
    return new Response(
      JSON.stringify({ data: [{ b64_json: "BBBB" }], usage: { output_tokens: 200 } }),
      {
        status: 200,
      },
    );
  }) as unknown as typeof fetch;

  const job = baseJob({
    operation: "edit",
    referenceImages: [{ bytes: new Uint8Array([9]), filename: "ref.png", mimeType: "image/png" }],
  });

  const result = await runGenerationJob(job, "source-version-1", {
    data: access,
    apiKey: "sk-test",
    fetchImpl,
    decodeBase64: () => new Uint8Array([2]),
  });

  assert.equal(result.outcome, "succeeded");
  assert.ok(capturedForm!.get("image[]"));
  assert.equal(capturedForm!.get("mask"), null);
  assert.equal((versions[0] as { parentVersionId: string }).parentVersionId, "source-version-1");
});

test("edit passes editMask as a separate mask field, never inside image[]", async () => {
  const { access, versions, finalizeCalls } = makeFakeDataAccess();
  let capturedForm: FormData | null = null;
  const fetchImpl = (async (_url: string | URL, init?: RequestInit) => {
    capturedForm = init!.body as FormData;
    return new Response(
      JSON.stringify({ data: [{ b64_json: "BBBB" }], usage: { output_tokens: 200 } }),
      { status: 200 },
    );
  }) as unknown as typeof fetch;

  const job = baseJob({
    operation: "edit",
    referenceImages: [
      { bytes: new Uint8Array([1]), filename: "source.png", mimeType: "image/png" },
      { bytes: new Uint8Array([2]), filename: "ref.png", mimeType: "image/png" },
    ],
    editMask: { bytes: new Uint8Array([9, 9]), filename: "user-mask.png", mimeType: "image/png" },
  });

  const result = await runGenerationJob(job, "source-version-1", {
    data: access,
    apiKey: "sk-test",
    fetchImpl,
    decodeBase64: () => new Uint8Array([2]),
  });

  assert.equal(result.outcome, "succeeded");
  const images = capturedForm!.getAll("image[]") as File[];
  assert.deepEqual(
    images.map((file) => file.name),
    ["source.png", "ref.png"],
  );
  const mask = capturedForm!.get("mask") as File;
  assert.equal(mask.name, "mask.png");
  assert.deepEqual(new Uint8Array(await mask.arrayBuffer()), new Uint8Array([9, 9]));
  assert.equal((versions[0] as { parentVersionId: string }).parentVersionId, "source-version-1");
  assert.equal(finalizeCalls.length, 1);
  assert.equal(finalizeCalls[0].outcome, "charged");
});

test("a fresh generate (no source version) leaves parentVersionId null", async () => {
  const { access, versions } = makeFakeDataAccess();
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ data: [{ b64_json: "AAAA" }], usage: {} }), {
      status: 200,
    })) as unknown as typeof fetch;

  await runGenerationJob(baseJob(), null, {
    data: access,
    apiKey: "sk-test",
    fetchImpl,
    decodeBase64: () => new Uint8Array([1]),
  });

  assert.equal((versions[0] as { parentVersionId: string | null }).parentVersionId, null);
});

test("a data-access failure inside the failure path does not throw out of runGenerationJob", async () => {
  const { access } = makeFakeDataAccess();
  access.markJobFailed = async () => {
    throw new Error("db unavailable");
  };
  access.finalizeCredits = async () => {
    throw new Error("db unavailable");
  };
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ error: { message: "bad" } }), {
      status: 400,
    })) as unknown as typeof fetch;

  // Must resolve, not reject — a background continuation that throws here
  // would surface as an unhandled rejection.
  const result = await runGenerationJob(baseJob(), null, {
    data: access,
    apiKey: "sk-test",
    fetchImpl,
    decodeBase64: () => new Uint8Array(),
  });
  assert.equal(result.outcome, "failed");
});

test("categorizeError never leaks the raw OpenAI message into safeErrorMessage", async () => {
  const { access } = makeFakeDataAccess();
  const secretDetail = "internal trace id abc-123-xyz-do-not-leak";
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ error: { message: secretDetail } }), {
      status: 500,
    })) as unknown as typeof fetch;

  let capturedSafeMessage = "";
  access.markJobFailed = async (_jobId, patch) => {
    capturedSafeMessage = patch.safeErrorMessage;
  };

  await runGenerationJob(baseJob(), null, {
    data: access,
    apiKey: "sk-test",
    fetchImpl,
    decodeBase64: () => new Uint8Array(),
  });

  assert.equal(capturedSafeMessage.includes(secretDetail), false);
});
