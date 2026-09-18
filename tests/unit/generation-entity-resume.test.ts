import { test } from "node:test";
import assert from "node:assert/strict";
import {
  saveEntityResume,
  readEntityResume,
  clearEntityResume,
} from "../../src/lib/generation/entity-resume.ts";
const id = "10000000-0000-4000-8000-000000000001";
const store = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  };
};
test("refresh recovery retains entity ids, source, mask and ad hoc refs without reusing idempotency key", () => {
  const s = store();
  saveEntityResume(
    id,
    id,
    {
      prompt: "An outdoor café",
      entityIds: [id],
      sourceVersionId: id,
      maskAssetId: id,
      idempotencyKey: "old",
    },
    ["owned-reference"],
    s,
  );
  const restored = readEntityResume(id, s)!;
  assert.deepEqual(restored.input.entityIds, [id]);
  assert.equal(restored.input.sourceVersionId, id);
  assert.equal(restored.input.maskAssetId, id);
  assert.equal(restored.input.idempotencyKey, undefined);
  assert.deepEqual(restored.referenceAssetIds, ["owned-reference"]);
  assert.equal(readEntityResume("another-user", s), null);
  clearEntityResume(s);
  assert.equal(readEntityResume(id, s), null);
});
test("new no-entity submission clears stale pack recovery; malformed storage fails safely", () => {
  const s = store();
  saveEntityResume(id, id, { prompt: "x", entityIds: [id] }, [], s);
  saveEntityResume(id, id, { prompt: "plain" }, [], s);
  assert.equal(readEntityResume(id, s), null);
  s.setItem("depikt.generate.entityResume", "broken");
  assert.equal(readEntityResume(id, s), null);
  assert.doesNotThrow(() =>
    saveEntityResume(id, id, { prompt: "x", entityIds: [id] }, [], {
      ...s,
      setItem: () => {
        throw new Error("quota");
      },
    }),
  );
});
