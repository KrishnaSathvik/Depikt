import { test } from "node:test";
import assert from "node:assert/strict";
import { CONTRACTS, parseResult, selectContract, textFormatFor } from "../../src/lib/openai/schemas.ts";

test("mode → contract selection", () => {
  assert.equal(selectContract("default"), CONTRACTS.builder_default);
  assert.equal(selectContract("BATCH"), CONTRACTS.builder_batch);
  assert.equal(selectContract("JSON"), CONTRACTS.builder_json);
  assert.equal(selectContract("CRITIQUE"), CONTRACTS.critic);
  assert.throws(() => selectContract("nope"), /Unknown mode/);
  assert.equal(CONTRACTS.critic.pipeline, "critic");
  assert.equal(CONTRACTS.builder_default.pipeline, "builder");
});

test("json schemas are strict: additionalProperties false and every property required", () => {
  for (const c of Object.values(CONTRACTS)) {
    const s = c.jsonSchema as { type: string; additionalProperties?: boolean; properties: Record<string, unknown>; required: string[]; $schema?: string };
    assert.equal(s.type, "object");
    assert.equal(s.additionalProperties, false, c.name);
    assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort(), c.name);
    assert.equal(s.$schema, undefined);
  }
  const fmt = textFormatFor(CONTRACTS.critic);
  assert.equal(fmt.type, "json_schema");
  assert.equal(fmt.strict, true);
  assert.equal(fmt.name, "depikt_critic");
});

const builderOk = { prompt: "p", category: "POSTER/COVER", why_it_works: "w" };
const criticOk = { score: 7, weaknesses: ["a"], improvements: ["b"], category: "POSTER/COVER", rewritten_prompt: "r" };

test("builder result validates; critic result cannot masquerade as builder", () => {
  assert.equal(parseResult(CONTRACTS.builder_default, JSON.stringify(builderOk)).ok, true);
  const r = parseResult(CONTRACTS.builder_default, JSON.stringify(criticOk));
  assert.equal(r.ok, false);
  assert.match((r as { error: string }).error, /schema mismatch \(depikt_builder_default\)/);
});

test("critic result validates; builder result cannot masquerade as critic", () => {
  assert.equal(parseResult(CONTRACTS.critic, JSON.stringify(criticOk)).ok, true);
  const r = parseResult(CONTRACTS.critic, JSON.stringify(builderOk));
  assert.equal(r.ok, false);
});

test("extra fields are rejected, invalid JSON is reported", () => {
  const r = parseResult(CONTRACTS.builder_default, JSON.stringify({ ...builderOk, score: 9 }));
  assert.equal(r.ok, false);
  const bad = parseResult(CONTRACTS.builder_default, "{ not json");
  assert.equal(bad.ok, false);
  assert.match((bad as { error: string }).error, /invalid JSON/);
});

test("batch and json builder variants", () => {
  assert.equal(parseResult(CONTRACTS.builder_batch, JSON.stringify({ prompts: ["a", "b", "c"], category: "c", why_it_works: "w" })).ok, true);
  assert.equal(parseResult(CONTRACTS.builder_batch, JSON.stringify(builderOk)).ok, false);
  assert.equal(
    parseResult(CONTRACTS.builder_json, JSON.stringify({ ...builderOk, size: "1024x1536", quality: "high", aspect_ratio: "2:3" })).ok,
    true,
  );
});
