import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  FINAL_MATRIX_PATH,
  FINAL_RUN_ID,
  readFinalMatrix,
  VerificationBudget,
  type VerificationAttempt,
} from "../eval/final-verification-budget.ts";
import { FinalVerificationRunner } from "../eval/final-verification-runner.ts";
import { generateImage, editImage } from "../../src/lib/generation/openai-images.ts";

function harness(t: { after: (fn: () => void) => void }, status = 200) {
  const directory = mkdtempSync(join(tmpdir(), "depikt-verification-budget-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const statePath = join(directory, "state.json");
  const budget = new VerificationBudget({ statePath });
  budget.initialize();
  let calls = 0;
  const provider: typeof fetch = async () => {
    calls++;
    // Assert the reservation is already persisted at the provider boundary.
    assert.ok(Object.values(budget.snapshot().attempts).some((a) => a.status === "reserved"));
    return new Response(
      JSON.stringify(
        status === 200 ? { data: [{ b64_json: "mock" }] } : { error: { message: "rejected" } },
      ),
      { status, headers: { "Content-Type": "application/json" } },
    );
  };
  return {
    directory,
    statePath,
    budget,
    provider,
    runner: new FinalVerificationRunner(budget, provider),
    calls: () => calls,
  };
}
const attempt = (
  scenarioId: string,
  index = 0,
  kind: "initial" | "repair" = "initial",
): VerificationAttempt => ({
  runId: FINAL_RUN_ID,
  scenarioId,
  attemptKey: `${scenarioId}:${kind === "repair" ? "auto:" : ""}${index}`,
  kind,
});
const allInitial = () =>
  [...readFinalMatrix().counts].flatMap(([id, count]) =>
    Array.from({ length: count }, (_, index) => attempt(id, index)),
  );
const input = {
  model: "flare" as const,
  prompt: "mock-only",
  width: 1024,
  height: 1024,
  apiKey: "mock-not-a-key",
};
const task = (a: VerificationAttempt) => ({
  attempt: a,
  execute: (fetchImpl: typeof fetch) => generateImage({ ...input, fetchImpl }),
});

test("frozen matrix computes exactly 18 initial, 1 repair, 19 total", () => {
  assert.deepEqual(readFinalMatrix().limits, { initial: 18, repair: 1, total: 19 });
  assert.equal(allInitial().length, 18);
  assert.deepEqual(
    allInitial()
      .filter((a) => a.scenarioId === "plain-regression")
      .map((a) => a.kind),
    ["initial", "initial"],
  );
});

test("real image adapter with mocked transport allows exact matrix and one repair; blocks further calls", async (t) => {
  const h = harness(t);
  const results = await h.runner.series(allInitial().map(task));
  assert.ok(results.every((r) => r.status === "fulfilled"));
  assert.equal(h.calls(), 18);
  await assert.rejects(
    h.runner.image(task(attempt("single", 1))),
    /initial image budget exhausted/,
  );
  assert.equal(h.calls(), 18);
  await h.runner.image(task(attempt("repair", 0, "repair")));
  assert.deepEqual(h.budget.snapshot().used, { initial: 18, repair: 1, total: 19 });
  await assert.rejects(
    h.runner.image(task(attempt("entities", 0, "repair"))),
    /repair budget already consumed/,
  );
  assert.equal(h.calls(), 19);
});

test("provider 400 consumes slot; restart cannot call the same attempt again", async (t) => {
  const h = harness(t, 400);
  await assert.rejects(h.runner.image(task(attempt("single"))), /rejected/);
  assert.equal(h.budget.snapshot().attempts["single:0"].status, "failed");
  assert.equal(h.budget.snapshot().attempts["single:0"].httpStatus, 400);
  const restarted = new FinalVerificationRunner(
    new VerificationBudget({ statePath: h.statePath }),
    h.provider,
  );
  await assert.rejects(restarted.image(task(attempt("single"))), /already spent/);
  assert.equal(h.calls(), 1);
  assert.equal(h.budget.snapshot().used.initial, 1);
});

test("successful attempts also remain spent on resume", async (t) => {
  const h = harness(t);
  await h.runner.image(task(attempt("single")));
  await assert.rejects(
    new FinalVerificationRunner(
      new VerificationBudget({ statePath: h.statePath }),
      h.provider,
    ).image(task(attempt("single"))),
    /already spent/,
  );
  assert.equal(h.calls(), 1);
});

test("crash after 11 durable reservations resumes with 11 spent and never relaunches them", async (t) => {
  const h = harness(t);
  h.budget.reserve(allInitial().slice(0, 11));
  const resumed = new VerificationBudget({ statePath: h.statePath });
  assert.equal(resumed.initialize().used.initial, 11);
  const runner = new FinalVerificationRunner(resumed, h.provider);
  await assert.rejects(runner.image(task(allInitial()[0])), /already spent/);
  assert.equal(h.calls(), 0);
  assert.equal(resumed.snapshot().used.initial, 11);
});

test("series with only 2 initial slots remaining blocks all 3 and persists nothing partial", async (t) => {
  const h = harness(t);
  const other = allInitial().filter((a) => a.scenarioId !== "brand-series");
  h.budget.reserve([...other, attempt("brand-series", 0)]);
  assert.equal(h.budget.snapshot().used.initial, 16);
  const before = readFileSync(h.statePath, "utf8");
  await assert.rejects(
    h.runner.series([0, 1, 2].map((i) => task(attempt("brand-series", i)))),
    /initial image budget exhausted/,
  );
  assert.equal(h.calls(), 0);
  assert.equal(readFileSync(h.statePath, "utf8"), before);
});

test("all series reservations exist before any child launches", async (t) => {
  const h = harness(t);
  const keys = [0, 1, 2].map((i) => attempt("brand-series", i));
  const runner = new FinalVerificationRunner(h.budget, async () => {
    for (const a of keys) assert.ok(h.budget.snapshot().attempts[a.attemptKey]);
    return new Response(JSON.stringify({ data: [{ b64_json: "mock" }] }));
  });
  assert.ok((await runner.series(keys.map(task))).every((r) => r.status === "fulfilled"));
});

test("repair spent by scenario 8 blocks scenario 13 repair without blocking validation", async (t) => {
  const h = harness(t);
  await h.runner.image(task(attempt("entities", 0, "repair")));
  let validated = false;
  await h.runner.nonImage("validation", async () => {
    validated = true;
  });
  await assert.rejects(
    h.runner.image(task(attempt("repair", 0, "repair"))),
    /consumed by scenario entities/,
  );
  assert.equal(validated, true);
  assert.equal(h.budget.snapshot().nonImageCalls.validation, 1);
  assert.equal(h.calls(), 1);
});

test("manual edits and regenerate use initial slots; repair key cannot collide with scenario 13 initial", async (t) => {
  const h = harness(t);
  for (const id of ["precision-edit", "whole-edit"])
    await h.runner.image({
      attempt: attempt(id),
      execute: (fetchImpl) =>
        editImage({
          ...input,
          referenceImages: [
            { bytes: new Uint8Array([1]), mimeType: "image/png", filename: "mock.png" },
          ],
          fetchImpl,
        }),
    });
  await h.runner.image(task(attempt("plain-regression", 1)));
  await h.runner.image(task(attempt("repair")));
  await h.runner.image(task(attempt("repair", 0, "repair")));
  assert.deepEqual(h.budget.snapshot().used, { initial: 4, repair: 1, total: 5 });
});

test("non-image operations are accounted separately", async (t) => {
  const h = harness(t);
  for (const kind of ["web", "visual", "validation", "ocr", "cacheHit"] as const)
    await h.runner.nonImage(kind, async () => undefined);
  assert.deepEqual(h.budget.snapshot().used, { initial: 0, repair: 0, total: 0 });
  assert.equal(h.calls(), 0);
});

test("concurrent callers sharing a state file cannot spend the same key twice", async (t) => {
  const h = harness(t);
  const other = new FinalVerificationRunner(
    new VerificationBudget({ statePath: h.statePath }),
    h.provider,
  );
  const results = await Promise.allSettled([
    h.runner.image(task(attempt("single"))),
    other.image(task(attempt("single"))),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(h.calls(), 1);
});

test("locked, missing, corrupt and mismatched state fail closed", async (t) => {
  const h = harness(t);
  mkdirSync(h.statePath + ".lock");
  await assert.rejects(h.runner.image(task(attempt("single"))), /locked/);
  rmSync(h.statePath + ".lock", { recursive: true });
  const valid = readFileSync(h.statePath, "utf8");
  writeFileSync(h.statePath, "broken");
  await assert.rejects(h.runner.image(task(attempt("single"))));
  const state = JSON.parse(valid);
  state.used.initial = 11;
  writeFileSync(h.statePath, JSON.stringify(state));
  await assert.rejects(h.runner.image(task(attempt("single"))), /counters/);
  unlinkSync(h.statePath);
  assert.throws(() => h.budget.initialize(), /lost its state/);
  assert.equal(h.calls(), 0);
});

test("matrix changed to 19 initial outputs refuses to start", (t) => {
  const h = harness(t);
  const m = JSON.parse(readFileSync(FINAL_MATRIX_PATH, "utf8"));
  m.scenarios[0].images = 2;
  const path = join(h.directory, "matrix.json");
  writeFileSync(path, JSON.stringify(m));
  assert.throws(
    () => new VerificationBudget({ statePath: h.statePath, matrixPath: path }),
    /18\/1\/19/,
  );
});

test("unscoped fetch, n > 1 and concurrent internal retries are blocked before provider", async (t) => {
  const h = harness(t);
  const url = "https://api.openai.com/v1/images/generations";
  const options = (n: number) => ({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ n }),
  });
  await assert.rejects(h.runner.fetch(url, options(1)), /Unreserved/);
  await assert.rejects(
    h.runner.image({ attempt: attempt("single"), execute: (f) => f(url, options(2)) }),
    /exactly one/,
  );
  assert.equal(h.calls(), 0);
  await h.runner.image({
    attempt: attempt("contact-sheet"),
    execute: async (f) => {
      const results = await Promise.allSettled([f(url, options(1)), f(url, options(1))]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    },
  });
  assert.equal(h.calls(), 1);
});

test("process guard covers default production image adapter fetch and blocks unscoped images", async (t) => {
  const h = harness(t);
  const restore = h.runner.installForVerificationProcess();
  try {
    await assert.rejects(generateImage(input), /Unreserved/);
    await h.runner.image({ attempt: attempt("single"), execute: () => generateImage(input) });
    assert.equal(h.calls(), 1);
    await assert.rejects(
      fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        body: JSON.stringify({ tools: [{ type: "image_generation" }] }),
      }),
      /outside the frozen verification transport/,
    );
    assert.equal(h.calls(), 1);
  } finally {
    restore();
  }
});

test("persisted lock also refuses reservations from a separate process", (t) => {
  const h = harness(t);
  mkdirSync(h.statePath + ".lock");
  const moduleUrl = new URL("../eval/final-verification-budget.ts", import.meta.url).href;
  const script = `import {VerificationBudget} from ${JSON.stringify(moduleUrl)};
    const budget = new VerificationBudget({statePath:process.argv[1]});
    try { budget.reserve([JSON.parse(process.argv[2])]); process.exit(2); }
    catch(e) { if (!/locked/.test(e.message)) throw e; }`;
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", script, h.statePath, JSON.stringify(attempt("single"))],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(h.budget.snapshot().used.total, 0);
});

test("network failure is spent and image requests cannot follow redirects", async (t) => {
  const h = harness(t);
  let calls = 0;
  const runner = new FinalVerificationRunner(h.budget, async (request) => {
    calls++;
    assert.equal((request as Request).redirect, "error");
    throw new TypeError("mock network failure");
  });
  await assert.rejects(runner.image(task(attempt("single"))), /network failure/);
  await assert.rejects(runner.image(task(attempt("single"))), /already spent/);
  assert.equal(h.budget.snapshot().used.total, 1);
  assert.equal(calls, 1);
});

test("targeted profile freezes six existing scenarios and enforces 7/1/8 independently", async (t) => {
  const { readTargetedMatrix, TARGETED_RUN_ID, TARGETED_MATRIX_PATH } =
    await import("../eval/final-verification-budget.ts");
  const dir = mkdtempSync(join(tmpdir(), "depikt-targeted-budget-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const frozen = readTargetedMatrix();
  assert.deepEqual(
    [...frozen.counts.keys()],
    ["series", "precision-edit", "product", "entities", "game-grounding", "location-grounding"],
  );
  const final = JSON.parse(readFileSync(FINAL_MATRIX_PATH, "utf8"));
  const targeted = JSON.parse(readFileSync(TARGETED_MATRIX_PATH, "utf8"));
  for (const scenario of targeted.scenarios)
    assert.deepEqual(
      scenario,
      final.scenarios.find((s: { id: string }) => s.id === scenario.id),
    );
  const budget = new VerificationBudget({
    profile: "targeted",
    statePath: join(dir, "state.json"),
  });
  assert.deepEqual(budget.initialize().used, { initial: 0, repair: 0, total: 0 });
  const initial = [...frozen.counts].flatMap(([id, n]) =>
    Array.from({ length: n }, (_, i) => ({ ...attempt(id, i), runId: TARGETED_RUN_ID })),
  );
  budget.reserve(initial);
  budget.reserve([{ ...attempt("precision-edit", 0, "repair"), runId: TARGETED_RUN_ID }]);
  assert.deepEqual(budget.snapshot().used, { initial: 7, repair: 1, total: 8 });
  assert.throws(() =>
    budget.reserve([{ ...attempt("product", 0, "repair"), runId: TARGETED_RUN_ID }]),
  );
  assert.throws(() => budget.reserve([{ ...attempt("single"), runId: TARGETED_RUN_ID }]));
  assert.throws(() => budget.reserve([initial[0]]));
  assert.deepEqual(
    new VerificationBudget({ profile: "targeted", statePath: join(dir, "state.json") }).initialize()
      .used,
    { initial: 7, repair: 1, total: 8 },
  );
  const changed = join(dir, "matrix.json");
  writeFileSync(changed, JSON.stringify({ ...targeted, maxTotalProviderImages: 19 }));
  assert.throws(() => readTargetedMatrix(changed));
});

test("grounding profile freezes two unchanged scenarios and enforces 2/1/3 independently", async (t) => {
  const { readGroundingMatrix, GROUNDING_RUN_ID, GROUNDING_MATRIX_PATH } =
    await import("../eval/final-verification-budget.ts");
  const dir = mkdtempSync(join(tmpdir(), "depikt-grounding-budget-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const frozen = readGroundingMatrix();
  assert.deepEqual([...frozen.counts.keys()], ["game-grounding", "location-grounding"]);
  const final = JSON.parse(readFileSync(FINAL_MATRIX_PATH, "utf8"));
  const targeted = JSON.parse(readFileSync(GROUNDING_MATRIX_PATH, "utf8"));
  for (const scenario of targeted.scenarios)
    assert.deepEqual(
      scenario,
      final.scenarios.find((s: { id: string }) => s.id === scenario.id),
    );
  const budget = new VerificationBudget({
    profile: "grounding",
    statePath: join(dir, "state.json"),
  });
  assert.deepEqual(budget.initialize().used, { initial: 0, repair: 0, total: 0 });
  const initial = [...frozen.counts].flatMap(([id, n]) =>
    Array.from({ length: n }, (_, i) => ({ ...attempt(id, i), runId: GROUNDING_RUN_ID })),
  );
  budget.reserve(initial);
  budget.reserve([{ ...attempt("game-grounding", 0, "repair"), runId: GROUNDING_RUN_ID }]);
  assert.deepEqual(budget.snapshot().used, { initial: 2, repair: 1, total: 3 });
  assert.throws(() =>
    budget.reserve([{ ...attempt("location-grounding", 0, "repair"), runId: GROUNDING_RUN_ID }]),
  );
  assert.throws(() => budget.reserve([{ ...attempt("single"), runId: GROUNDING_RUN_ID }]));
  assert.throws(() => budget.reserve([initial[0]]));
  assert.deepEqual(
    new VerificationBudget({
      profile: "grounding",
      statePath: join(dir, "state.json"),
    }).initialize().used,
    { initial: 2, repair: 1, total: 3 },
  );
  const changed = join(dir, "matrix.json");
  writeFileSync(changed, JSON.stringify({ ...targeted, maxTotalProviderImages: 19 }));
  assert.throws(() => readGroundingMatrix(changed));
});

test("authority profile freezes only location and enforces 1/1/2 independently", async (t) => {
  const { readAuthorityMatrix, AUTHORITY_RUN_ID, AUTHORITY_MATRIX_PATH } =
    await import("../eval/final-verification-budget.ts");
  const dir = mkdtempSync(join(tmpdir(), "depikt-authority-budget-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const frozen = readAuthorityMatrix();
  assert.deepEqual([...frozen.counts.keys()], ["location-grounding"]);
  const final = JSON.parse(readFileSync(FINAL_MATRIX_PATH, "utf8"));
  const targeted = JSON.parse(readFileSync(AUTHORITY_MATRIX_PATH, "utf8"));
  for (const scenario of targeted.scenarios)
    assert.deepEqual(
      scenario,
      final.scenarios.find((s: { id: string }) => s.id === scenario.id),
    );
  const budget = new VerificationBudget({
    profile: "authority",
    statePath: join(dir, "state.json"),
  });
  assert.deepEqual(budget.initialize().used, { initial: 0, repair: 0, total: 0 });
  const initial = [...frozen.counts].flatMap(([id, n]) =>
    Array.from({ length: n }, (_, i) => ({ ...attempt(id, i), runId: AUTHORITY_RUN_ID })),
  );
  budget.reserve(initial);
  budget.reserve([{ ...attempt("location-grounding", 0, "repair"), runId: AUTHORITY_RUN_ID }]);
  assert.deepEqual(budget.snapshot().used, { initial: 1, repair: 1, total: 2 });
  assert.throws(() =>
    budget.reserve([{ ...attempt("location-grounding", 0, "repair"), runId: AUTHORITY_RUN_ID }]),
  );
  assert.throws(() => budget.reserve([{ ...attempt("single"), runId: AUTHORITY_RUN_ID }]));
  assert.throws(() => budget.reserve([initial[0]]));
  assert.deepEqual(
    new VerificationBudget({
      profile: "authority",
      statePath: join(dir, "state.json"),
    }).initialize().used,
    { initial: 1, repair: 1, total: 2 },
  );
  const changed = join(dir, "matrix.json");
  writeFileSync(changed, JSON.stringify({ ...targeted, maxTotalProviderImages: 19 }));
  assert.throws(() => readAuthorityMatrix(changed));
});
