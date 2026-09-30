import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import ts from "typescript";
import vm from "node:vm";
async function files(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((entry) =>
        entry.isDirectory() ? files(`${dir}/${entry.name}`) : `${dir}/${entry.name}`,
      ),
    )
  ).flat();
}
let grounding = 0,
  validation = 0,
  repair = 0;
for (const file of await files(".output/server")) {
  if (!file.endsWith(".mjs")) continue;
  const source = await readFile(file, "utf8");
  if (!/GROUNDING_ENABLED|VALIDATION_REPAIR_ENABLED|automaticRepairEnabled/.test(source)) continue;
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  function inspect(node) {
    if (ts.isIfStatement(node)) {
      const condition = node.expression.getText(ast);
      if (/^process.env.GROUNDING_ENABLED === "true"/.test(condition)) {
        for (const flag of [undefined, "false", "true"]) {
          const actual = vm.runInNewContext(`Boolean(${condition})`, {
            process: { env: { GROUNDING_ENABLED: flag, VALIDATION_REPAIR_ENABLED: "true" } },
            session: { plan_json: { grounding: {} } },
          });
          assert.equal(actual, flag === "true");
        }
        grounding++;
      }
      if (condition.includes("GROUNDING_ENABLED") && condition.includes("stored.grounding")) {
        for (const flag of [undefined, "false", "true"]) {
          const actual = vm.runInNewContext(`Boolean(${condition})`, {
            process: { env: { GROUNDING_ENABLED: flag } },
            env: undefined,
            stored: { grounding: {} },
          });
          assert.equal(actual, flag === "true");
        }
        grounding++;
      }
      if (/^process.env.VALIDATION_REPAIR_ENABLED === "true"/.test(condition)) {
        for (const flag of [undefined, "false", "true"]) {
          const actual = vm.runInNewContext(`Boolean(${condition})`, {
            process: { env: { VALIDATION_REPAIR_ENABLED: flag, GROUNDING_ENABLED: "true" } },
            session: { plan_json: { validation: {} } },
          });
          assert.equal(actual, flag === "true");
        }
        validation++;
      }
    }
    if (ts.isFunctionDeclaration(node) && node.name?.text === "automaticRepairEnabled") {
      for (const enabled of [undefined, "false", "true"])
        for (const policy of [undefined, "disabled", "platform_absorbs_one_per_request"]) {
          const actual = vm.runInNewContext(`${node.getText(ast)}; automaticRepairEnabled()`, {
            process: { env: { VALIDATION_REPAIR_ENABLED: enabled, AUTO_REPAIR_POLICY: policy } },
            INCLUDED_REPAIR_POLICY: "platform_absorbs_one_per_request",
          });
          assert.equal(actual, enabled === "true" && policy === "platform_absorbs_one_per_request");
        }
      repair++;
    }
    ts.forEachChild(node, inspect);
  }
  inspect(ast);
}
assert.ok(
  grounding >= 3,
  "Planning, persisted execution, and repair grounding guards must remain runtime checks",
);
assert.ok(validation >= 2, "Validation planning and execution must remain runtime checks");
assert.ok(repair > 0, "Automatic repair policy must remain a runtime check");
console.log(
  `PASS compiled runtime branches: grounding=${grounding}, validation=${validation}, repair=${repair}; all mock-only`,
);
