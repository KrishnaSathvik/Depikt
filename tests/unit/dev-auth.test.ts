import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isDevAuthEnabled, isLocalDevHost } from "../../src/lib/dev-auth-guard.ts";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

const localDev = {
  DEV: true,
  PROD: false,
  MODE: "development",
  VITE_DEV_AUTH_ENABLED: "true",
} as const;

test("dev auth is allowed only for opted-in local Vite development", () => {
  assert.equal(isDevAuthEnabled(localDev), true);
});

test("dev auth is off in production and preview even if the opt-in flag is set", () => {
  assert.equal(
    isDevAuthEnabled({
      DEV: false,
      PROD: true,
      MODE: "production",
      VITE_DEV_AUTH_ENABLED: "true",
    }),
    false,
  );
  assert.equal(
    isDevAuthEnabled({
      DEV: false,
      PROD: true,
      MODE: "preview",
      VITE_DEV_AUTH_ENABLED: "true",
    }),
    false,
  );
  assert.equal(isDevAuthEnabled({ ...localDev, VITE_DEV_AUTH_ENABLED: "false" }), false);
  assert.equal(isDevAuthEnabled({ ...localDev, DEV: false }), false);
  assert.equal(isDevAuthEnabled({ ...localDev, PROD: true }), false);
  assert.equal(isDevAuthEnabled({ ...localDev, MODE: "production" }), false);
});

test("dev auth overlay host allowlist is localhost only", () => {
  assert.equal(isLocalDevHost("localhost"), true);
  assert.equal(isLocalDevHost("127.0.0.1"), true);
  assert.equal(isLocalDevHost("[::1]"), true);
  assert.equal(isLocalDevHost("depikt.com"), false);
  assert.equal(isLocalDevHost("preview.depikt.com"), false);
  assert.equal(isLocalDevHost("something.workers.dev"), false);
});

test("root mounts the banner only under import.meta.env.DEV", () => {
  const root = read("src/routes/__root.tsx");
  assert.match(root, /import\.meta\.env\.DEV \? <DevAuthBanner \/> : null/);
  const banner = read("src/components/DevAuthBanner.tsx");
  assert.match(banner, /isDevAuthEnabled\(\)/);
  assert.match(banner, /isLocalDevHost\(\)/);
});
