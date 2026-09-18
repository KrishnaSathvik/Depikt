import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolveEntityReferences } from "../../src/lib/generation/entity-reference-resolver.ts";
import { buildEntityPreamble } from "../../src/lib/generation/entity-preamble.ts";
import { resolveGenerationModel } from "../../src/lib/generation/model-router.ts";
import { resolveOperation, type GenerationPlan } from "../../src/lib/generation/plan.ts";
import {
  validateCreatePlanBody,
  validateCreateJobsFromPlanBody,
} from "../../src/lib/generation/job-request.ts";
import {
  validateEntityBody,
  validateEntityAssetBody,
} from "../../src/lib/generation/entity-request.ts";
import {
  extractStoredEntities,
  extractStoredEntityReferencePaths,
  EntityReferenceUnavailableError,
} from "../../src/lib/generation/stored-entities.ts";
import { assembleJobImages } from "../../src/lib/generation/job-images.ts";
import {
  signPlanToken,
  verifyPlanToken,
  type PlanTokenPayload,
} from "../../src/lib/generation/plan-token.ts";
import {
  buildExecutionPlanJson,
  executionPlanIdentityMatches,
} from "../../src/lib/generation/execution-plan.ts";
import { entityReferenceIntent } from "../../src/lib/generation/entities.ts";
import {
  fixtureEntity,
  fixturePath,
  FIXTURE_USER,
} from "../image-evals/vnext-3/fixture-entities.ts";
import { loadVnext3Cases } from "../image-evals/vnext-3/load-cases.ts";
const plan: GenerationPlan = {
  mode: "single",
  desiredCount: 1,
  autoCount: 1,
  separateAssets: false,
  searchNeeded: false,
  requiresCountConfirmation: false,
};
const a = fixtureEntity("character-a"),
  b = fixtureEntity("character-b"),
  p = fixtureEntity("product-a");
const resolved = () => resolveEntityReferences({ entities: [a], prompt: "walking", budget: 8 });
const stored = () => ({
  entities: resolved(),
  lockedEntityCount: 1,
  referenceAssetIds: [],
  sourceVersionId: null,
});
for (const c of loadVnext3Cases())
  test(`VNext 3 frozen case: ${c.id}`, () => {
    const entities = resolveEntityReferences({
      entities: c.entities.map(fixtureEntity),
      prompt: c.prompt,
      budget: 8,
    });
    const operation = resolveOperation(plan, [], null, entities.length);
    assert.equal(operation, c.expected.operation);
    assert.equal(
      resolveGenerationModel({
        operation,
        promptText: c.prompt,
        referenceCount: 0,
        lockedEntityCount: entities.length,
      }),
      c.expected.model,
    );
    assert.ok(
      entities.reduce((n, e) => n + e.resolvedReferences.length, 0) <= c.expected.maxImages,
    );
    assert.equal(buildEntityPreamble(entities, 0).includes("do not merge"), c.expected.distinct);
    for (const e of entities)
      for (const r of e.resolvedReferences) {
        assert.ok(
          fixtureEntity(c.entities.find((k) => fixtureEntity(k).id === e.id)!).assets.some(
            (a) => a.id === r.assetId,
          ),
        );
        const bytes = readFileSync(fixturePath(e.id, r.assetId));
        assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
      }
  });
test("resolver selects shot roles deterministically and anchors primary", () => {
  const roles = (prompt: string, entity = a) =>
    resolveEntityReferences({ entities: [entity], prompt, budget: 2 })[0].resolvedReferences.map(
      (a) => a.role,
    );
  assert.deepEqual(roles("close-up portrait"), ["primary", "three_quarter"]);
  assert.deepEqual(roles("full body walking"), ["primary", "full_body"]);
  assert.deepEqual(roles("macro label", p), ["primary", "detail"]);
  assert.deepEqual(roles("studio", p), ["primary", "three_quarter"]);
  assert.deepEqual(roles("anything", fixtureEntity("brand-a")), ["logo", "style_reference"]);
});
test("budgets reserve one per entity, distribute round robin, and include source plus ad hoc", () => {
  for (let budget = 2; budget <= 8; budget++) {
    const result = resolveEntityReferences({ entities: [a, b], prompt: "hello", budget });
    assert.ok(
      result.every((e) => e.resolvedReferences.length >= 1 && e.resolvedReferences.length <= 3),
    );
    assert.ok(result.flatMap((e) => e.resolvedReferences).length <= budget);
  }
  assert.deepEqual(
    resolveEntityReferences({ entities: [a, b], prompt: "x", budget: 5 }).map(
      (e) => e.resolvedReferences.length,
    ),
    [3, 2],
  );
  assert.throws(() =>
    resolveEntityReferences({
      entities: [a, b, p, fixtureEntity("brand-a")],
      prompt: "x",
      budget: 8 - 4 - 1,
    }),
  );
  assert.throws(() => resolveEntityReferences({ entities: [a], prompt: "x", budget: 9 }));
});
test("resolver rejects foreign asset owner, wrong entity path and empty pack", () => {
  for (const bad of [
    { ...a, assets: [] },
    { ...a, assets: a.assets.map((x) => ({ ...x, user_id: b.id })) },
    {
      ...a,
      assets: a.assets.map((x) => ({ ...x, storage_path: x.storage_path.replace(a.id, b.id) })),
    },
  ])
    assert.throws(
      () => resolveEntityReferences({ entities: [bad], prompt: "x", budget: 8 }),
      /Invalid reference pack/,
    );
});
test("plan request accepts only distinct UUID ids, limits ad hoc independently", () => {
  assert.equal(validateCreatePlanBody({ prompt: "x", entityIds: [a.id] }).ok, true);
  for (const entityIds of [
    null,
    "x",
    [a.id, a.id],
    ["not-uuid"],
    [a.id, b.id, p.id, fixtureEntity("brand-a").id, fixtureEntity("product-b").id],
  ]) {
    assert.equal(validateCreatePlanBody({ prompt: "x", entityIds }).ok, false);
  }
  for (const field of ["entities", "entityPaths", "resolvedReferences"])
    assert.equal(validateCreatePlanBody({ prompt: "x", [field]: [] }).ok, false);
  assert.equal(
    validateCreatePlanBody({
      prompt: "x",
      entityIds: [a.id],
      referenceAssetIds: ["a", "b", "c", "d", "e"],
    }).ok,
    false,
  );
  for (const field of ["entities", "entityIds", "entityPaths", "resolvedReferences"])
    assert.equal(
      validateCreateJobsFromPlanBody({ planToken: "x", idempotencyKey: "x", [field]: [] }).ok,
      false,
    );
});
test("entity validators reject forged fields, type changes, oversized identity and mismatched role", () => {
  assert.equal(validateEntityBody({ name: " Test ", type: "character" }).ok, true);
  for (const body of [
    { name: "", type: "character" },
    { name: "X", type: "__proto__" },
    { name: "X", type: "character", user_id: a.id },
    { name: "X", type: "brand", description: "x".repeat(601) },
  ])
    assert.equal(validateEntityBody(body).ok, false);
  assert.equal(validateEntityBody({ type: "product" }, true).ok, false);
  assert.equal(
    validateEntityAssetBody({ dataUrl: "data:image/png;base64,YQ==", role: "logo" }, "character")
      .ok,
    false,
  );
  assert.equal(
    validateEntityAssetBody(
      { dataUrl: "data:image/png;base64,YQ==", role: "primary", storage_path: "evil" },
      "character",
    ).ok,
    false,
  );
});
test("persisted locks fail closed on all malformed claims", () => {
  assert.deepEqual(extractStoredEntityReferencePaths({}), []);
  assert.deepEqual(extractStoredEntityReferencePaths({ entities: [] }), []);
  assert.equal(extractStoredEntityReferencePaths(stored(), FIXTURE_USER).length, 3);
  for (const entities of [
    null,
    {},
    "x",
    [null],
    [{ ...resolved()[0], locked: false }],
    [{ ...resolved()[0], resolvedReferences: [] }],
    [{ ...resolved()[0], type: "__proto__" }],
    [
      {
        ...resolved()[0],
        resolvedReferences: [
          { ...resolved()[0].resolvedReferences[0], path: "users/foreign/asset.webp" },
        ],
      },
    ],
  ])
    assert.throws(
      () => extractStoredEntities({ ...stored(), entities }),
      EntityReferenceUnavailableError,
    );
  assert.throws(
    () => extractStoredEntities({ lockedEntityCount: 1 }),
    EntityReferenceUnavailableError,
  );
  assert.throws(
    () => extractStoredEntities({ ...stored(), entities: [] }),
    EntityReferenceUnavailableError,
  );
  assert.throws(() => extractStoredEntities(stored(), b.id), EntityReferenceUnavailableError);
});
test("signed lock metadata cannot be swapped, stripped or forged", () => {
  const payload = {
    ...stored(),
    userId: FIXTURE_USER,
    prompt: "x",
    userInput: "x",
    maskAssetId: null,
    maskPath: null,
    plan,
    exp: Date.now() + 10000,
  } as unknown as PlanTokenPayload;
  const token = signPlanToken(payload, "secret");
  assert.equal(verifyPlanToken(token, "secret", FIXTURE_USER).entities?.length, 1);
  const [body, mac] = token.split(".");
  const forged = JSON.parse(Buffer.from(body, "base64url").toString());
  forged.entities[0].name = "Changed";
  assert.throws(() =>
    verifyPlanToken(
      Buffer.from(JSON.stringify(forged)).toString("base64url") + "." + mac,
      "secret",
      FIXTURE_USER,
    ),
  );
  assert.throws(() => verifyPlanToken(token, "secret", b.id));
});
test("source, ad hoc, entities, then mask stay ordered; any missing locked input fails", async () => {
  const downloaded: string[] = [];
  const download = async (path: string) => {
    downloaded.push(path);
    return { bytes: new Uint8Array([1]), mimeType: "image/webp", filename: path };
  };
  const args = {
    download,
    sourcePath: "source",
    referencePaths: ["adhoc"],
    entityReferencePaths: ["entity1", "entity2"],
    maskPath: "mask",
  };
  const result = await assembleJobImages(args);
  assert.deepEqual(downloaded, ["source", "adhoc", "entity1", "entity2", "mask"]);
  assert.equal(result.referenceImages[0].filename, "source");
  assert.equal(result.editMask?.filename, "mask");
  for (const missing of ["source", "adhoc", "entity1", "entity2"])
    await assert.rejects(
      assembleJobImages({
        ...args,
        download: async (path) => (path === missing ? null : download(path)),
      }),
      EntityReferenceUnavailableError,
    );
  await assert.rejects(
    assembleJobImages({
      ...args,
      download: async () => {
        throw new Error("network");
      },
    }),
    EntityReferenceUnavailableError,
  );
  const legacy = await assembleJobImages({
    download: async () => null,
    sourcePath: null,
    referencePaths: ["missing"],
    maskPath: null,
  });
  assert.deepEqual(legacy.referenceImages, []);
});
test("preamble numbers include source and ad hoc, retains variable appearance", () => {
  const entities = resolveEntityReferences({ entities: [a, p], prompt: "x", budget: 6 });
  const text = buildEntityPreamble(entities, 2);
  assert.match(text, /Reference images 3–5/);
  assert.match(text, /Reference images 6–8/);
  assert.match(text, /Clothing, pose, expression, environment and lighting may change/);
  assert.match(text, /logo\/brand mark including enclosing shapes and symbols/);
  assert.match(text, /Do not simplify, substitute, or redesign brand marks/);
  assert.match(text, /Environment, lighting, and presentation may change/);
  const brand = resolveEntityReferences({
    entities: [fixtureEntity("brand-a")],
    prompt: "ad",
    budget: 8,
  });
  assert.match(buildEntityPreamble(brand, 0), /Do not simplify or redraw supplied logo geometry/);
  assert.equal(buildEntityPreamble([], 0), "");
  assert.equal(entityReferenceIntent("character"), "subject_identity");
  assert.equal(entityReferenceIntent("product"), "product_object");
  assert.equal(entityReferenceIntent("brand"), "style");
});
test("execution identity rejects a swapped pack and no-entity plans omit new fields", () => {
  const args = {
    plan,
    selectedCount: 1,
    referenceAssetIds: [],
    sourceVersionId: null,
    maskAssetId: null,
    maskPath: null,
    children: [{ label: null, prompt: "x" }],
  };
  const old = buildExecutionPlanJson(args);
  assert.equal("entities" in old, false);
  assert.deepEqual(buildExecutionPlanJson({ ...args, entities: [] }), old);
  const current = buildExecutionPlanJson({ ...args, entities: resolved() });
  assert.equal(executionPlanIdentityMatches(current, { ...args, entities: resolved() }), true);
  assert.equal(executionPlanIdentityMatches(current, args), false);
  assert.equal(
    executionPlanIdentityMatches({ ...current, entities: null }, { ...args, entities: resolved() }),
    false,
  );
});
test("production code does not contain benchmark names or case ids", () => {
  const walk = (dir: URL): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
      d.isDirectory()
        ? walk(new URL(d.name + "/", dir))
        : /\.(ts|tsx)$/.test(d.name)
          ? [readFileSync(new URL(d.name, dir), "utf8")]
          : [],
    );
  const source = walk(new URL("../../src/", import.meta.url)).join("\n");
  for (const name of [
    "Maya",
    "Sofia",
    "HALO",
    "VELORA",
    "NEMORI",
    ...loadVnext3Cases().map((c) => c.id),
  ])
    assert.equal(source.includes(name), false, name);
});

test("foreign and missing pack ids produce the same planning error; requested order is authoritative", async () => {
  const { selectOwnedEntities } =
    await import("../../src/lib/generation/entity-reference-resolver.ts");
  for (const rows of [[], [{ ...a, user_id: b.id }], [b]])
    assert.throws(
      () => selectOwnedEntities(rows, [a.id], FIXTURE_USER),
      /^Error: Invalid reference pack$/,
    );
  assert.deepEqual(
    selectOwnedEntities([a, b], [b.id, a.id], FIXTURE_USER).map((e) => e.id),
    [b.id, a.id],
  );
});
test("locked input failure records terminal code and refunds independently even if status write fails", async () => {
  const { failImageInputJob } = await import("../../src/lib/generation/job-images.ts");
  for (const failWrite of [false, true]) {
    const calls: unknown[] = [];
    const result = await failImageInputJob({
      error: new EntityReferenceUnavailableError(),
      jobId: "job",
      userId: FIXTURE_USER,
      idempotencyKey: "once",
      data: {
        markJobFailed: async (id, patch) => {
          calls.push([id, patch]);
          if (failWrite) throw new Error("write unavailable");
        },
        finalizeCredits: async (...args) => {
          calls.push(args);
          return { availableCredits: 1 };
        },
      },
    });
    assert.equal(result.errorCode, "entity_reference_unavailable");
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1], [FIXTURE_USER, 1, "once", "refunded", "job"]);
  }
});

test("execution identity tolerates JSONB object key order but retains image order", () => {
  const args = {
    plan,
    selectedCount: 1,
    referenceAssetIds: [],
    sourceVersionId: null,
    maskAssetId: null,
    maskPath: null,
    children: [{ label: null, prompt: "x" }],
    entities: resolved(),
  };
  const stored = buildExecutionPlanJson(args);
  stored.entities = stored.entities!.map((e) => ({
    resolvedReferences: e.resolvedReferences.map((r) => ({
      path: r.path,
      role: r.role,
      assetId: r.assetId,
    })),
    locked: e.locked,
    description: e.description,
    name: e.name,
    type: e.type,
    id: e.id,
  }));
  assert.equal(executionPlanIdentityMatches(stored, args), true);
  stored.entities[0].resolvedReferences.reverse();
  assert.equal(executionPlanIdentityMatches(stored, args), false);
});
test("fixture bytes and case prompts match the review manifest", async () => {
  const { createHash } = await import("node:crypto");
  const base = new URL("../image-evals/vnext-3/", import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", base), "utf8")) as {
    files: Record<string, string>;
  };
  for (const [path, sha] of Object.entries(manifest.files))
    assert.equal(
      createHash("sha256")
        .update(readFileSync(new URL(path, base)))
        .digest("hex"),
      sha,
      path,
    );
});

test("product primary and front do not crowd out detail and three-quarter views", () => {
  const product = {
    ...p,
    assets: [
      ...p.assets,
      { ...p.assets[0], id: "30000000-0000-4000-8000-000000009999", role: "front" as const },
    ],
  };
  assert.deepEqual(
    resolveEntityReferences({
      entities: [product],
      prompt: "macro label",
      budget: 3,
    })[0].resolvedReferences.map((r) => r.role),
    ["primary", "detail", "three_quarter"],
  );
});
test("malformed lock type and malformed preceding-image metadata fail closed", () => {
  for (const malformed of [
    { ...stored(), entities: [{ ...resolved()[0], type: ["character"] }] },
    { ...stored(), referenceAssetIds: [""] },
    { ...stored(), sourceVersionId: {} },
    { ...stored(), referenceAssetIds: ["a", "b", "c", "d", "e"] },
  ])
    assert.throws(() => extractStoredEntities(malformed), EntityReferenceUnavailableError);
});
