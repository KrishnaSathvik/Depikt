import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import configureVite from "../../vite.config.ts";
import {
  automaticRepairEnabled,
  LAUNCH_ECONOMIC_POLICY,
  MAX_AUTO_REPAIR_ATTEMPTS_PER_REQUEST,
} from "../../src/lib/generation/economic-policy.ts";

const keys = ["GROUNDING_ENABLED", "VALIDATION_REPAIR_ENABLED", "AUTO_REPAIR_POLICY"] as const;

test("actual dev configuration enables existing VNext flags; production configuration disables them", async () => {
  const previous = keys.map((key) => process.env[key]);
  try {
    for (const mode of ["development", "production"]) {
      // Model separate process starts, without flags left by the preceding mode.
      for (const key of keys) delete process.env[key];
      await configureVite({ command: "serve", mode });
      const enabled = mode === "development";
      assert.equal(process.env.GROUNDING_ENABLED === "true", enabled);
      assert.equal(process.env.VALIDATION_REPAIR_ENABLED === "true", enabled);
      assert.equal(automaticRepairEnabled(), enabled);
      assert.equal(
        process.env.AUTO_REPAIR_POLICY,
        enabled ? "platform_absorbs_one_per_request" : "disabled",
      );
    }
  } finally {
    keys.forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    });
  }
});

test("production Worker runtime explicitly disables grounding, validation and automatic repair", () => {
  const source = readFileSync(new URL("../../wrangler.jsonc", import.meta.url), "utf8");
  const config = JSON.parse(source.replace(/,\s*([}\]])/g, "$1"));
  assert.deepEqual(Object.fromEntries(keys.map((key) => [key, config.vars[key]])), {
    GROUNDING_ENABLED: "false",
    VALIDATION_REPAIR_ENABLED: "false",
    AUTO_REPAIR_POLICY: "disabled",
  });
  assert.equal(automaticRepairEnabled(config.vars), false);
});

test("verification activation preserves launch caps and the byte-identical frozen matrix", () => {
  assert.equal(MAX_AUTO_REPAIR_ATTEMPTS_PER_REQUEST, 1);
  assert.equal(LAUNCH_ECONOMIC_POLICY.maxAutomaticRepairsPerRequest, 1);
  assert.deepEqual(
    [
      LAUNCH_ECONOMIC_POLICY.maxWebQueries,
      LAUNCH_ECONOMIC_POLICY.maxVisualQueries,
      LAUNCH_ECONOMIC_POLICY.maxGroundingSources,
    ],
    [3, 2, 8],
  );
  const bytes = readFileSync(new URL("../image-evals/final/matrix.json", import.meta.url));
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "d49ffa6119afb0d63b5040ab4106fbc2a7d9b14508dd85ea8d97111883621aa2",
  );
  const matrix = JSON.parse(bytes.toString());
  assert.equal(matrix.status, "frozen-not-executed");
  assert.equal(matrix.scenarios.length, 14);
  assert.deepEqual(
    [matrix.maxScenarios, matrix.maxInitialImages, matrix.maxRepairImages],
    [14, 18, 1],
  );
});
