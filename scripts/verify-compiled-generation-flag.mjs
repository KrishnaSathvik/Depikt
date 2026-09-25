import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";

// Inspect the actual production server output, not a separately compiled helper.
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)],
      ),
    )
  ).flat();
}
let count = 0;
for (const file of await files(".output/server")) {
  if (!/\.[cm]?js$/.test(file)) continue;
  const source = await readFile(file, "utf8");
  if (!source.includes("function isNativeGenerationEnabled")) continue;
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  for (const node of ast.statements) {
    if (!ts.isFunctionDeclaration(node) || node.name?.text !== "isNativeGenerationEnabled")
      continue;
    const code = node.getText(ast);
    for (const [runtime, expected] of [
      ["false", false],
      ["true", true],
      [undefined, true],
    ]) {
      const env = runtime === undefined ? {} : { GENERATION_ENABLED: runtime };
      const actual = vm.runInNewContext(`${code}; isNativeGenerationEnabled()`, {
        process: { env },
      });
      assert.equal(actual, expected, `compiled ${file}, runtime=${runtime}`);
    }
    assert.equal(
      vm.runInNewContext(`${code}; isNativeGenerationEnabled("true")`, {
        process: { env: { GENERATION_ENABLED: "false" } },
      }),
      false,
    );
    console.log(
      `PASS compiled production kill switch: ${file} (false / true / unset / explicit override)`,
    );
    count++;
  }
}
assert.ok(count > 0, "No compiled feature flag found; do not substitute a source-only test");

// Exercise the bundled Worker handler as well. Dummy local auth configuration
// lets enabled requests reach the authentication gate without making any call.
const { default: worker } = await import("../.output/server/index.mjs");
const context = { waitUntil() {}, passThroughOnException() {} };
const home = await worker.fetch(new Request("http://localhost/"), {}, context);
assert.equal(home.status, 200);
assert.ok((await home.text()).includes("Make something with Depikt"));
console.log("PASS compiled Worker Home SSR");
const savedEnv = { ...process.env };
try {
  process.env.SUPABASE_URL = "http://127.0.0.1:9";
  process.env.SUPABASE_PUBLISHABLE_KEY = "non-network-test-placeholder";
  for (const [runtime, expected] of [
    ["false", 404],
    ["true", 401],
    [undefined, 401],
  ]) {
    if (runtime === undefined) delete process.env.GENERATION_ENABLED;
    else process.env.GENERATION_ENABLED = runtime;
    const response = await worker.fetch(
      new Request("http://localhost/api/generation/sessions/11111111-1111-4111-8111-111111111111"),
      {},
      context,
    );
    assert.equal(response.status, expected, `Worker runtime ${runtime}`);
    console.log(
      `PASS compiled Worker generation handler: runtime ${runtime} => ${response.status}`,
    );
  }
} finally {
  for (const key of ["GENERATION_ENABLED", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"]) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
}
