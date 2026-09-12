import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveSupabasePublicConfig } from "../../src/lib/supabase-public-env.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

test("resolveSupabasePublicConfig prefers the SSR window payload, then Vite, then process.env", () => {
  assert.deepEqual(
    resolveSupabasePublicConfig({
      runtime: { url: "https://runtime.supabase.co", key: "runtime-key" },
      viteUrl: "https://vite.supabase.co",
      viteKey: "vite-key",
      processUrl: "https://process.supabase.co",
      processKey: "process-key",
    }),
    { url: "https://runtime.supabase.co", key: "runtime-key" },
  );
  assert.deepEqual(
    resolveSupabasePublicConfig({
      viteUrl: "https://vite.supabase.co",
      viteKey: "vite-key",
      processUrl: "https://process.supabase.co",
      processKey: "process-key",
    }),
    { url: "https://vite.supabase.co", key: "vite-key" },
  );
  assert.deepEqual(
    resolveSupabasePublicConfig({
      processUrl: "https://process.supabase.co",
      processKey: "process-key",
    }),
    { url: "https://process.supabase.co", key: "process-key" },
  );
});

test("resolveSupabasePublicConfig derives the URL from the project id and accepts the anon key", () => {
  assert.deepEqual(
    resolveSupabasePublicConfig({
      viteProjectId: "cexsqtqcrbvhgzkhtgqo",
      processAnon: "legacy-anon",
    }),
    { url: "https://cexsqtqcrbvhgzkhtgqo.supabase.co", key: "legacy-anon" },
  );
});

test("resolveSupabasePublicConfig treats blank strings as missing", () => {
  assert.deepEqual(
    resolveSupabasePublicConfig({
      viteUrl: "  ",
      viteKey: "",
      processUrl: "https://ok.supabase.co",
      processKey: " ok-key ",
    }),
    { url: "https://ok.supabase.co", key: "ok-key" },
  );
});

test("Vite env reads are static property access so production inlines the keys", () => {
  const src = read("src/lib/supabase-public-env.ts");
  assert.match(src, /import\.meta\.env\.VITE_SUPABASE_URL/);
  assert.match(src, /import\.meta\.env\.VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(src, /import\.meta\.env\.VITE_SUPABASE_ANON_KEY/);
  assert.match(src, /import\.meta\.env\.VITE_SUPABASE_PROJECT_ID/);
  assert.doesNotMatch(src, /import\.meta\.env\[`VITE_\$\{/);
  const client = read("src/integrations/supabase/client.ts");
  assert.doesNotMatch(client, /import\.meta\.env\[`VITE_\$\{/);
  assert.match(client, /detectSessionInUrl: true/);
});

test("root HTML boots window.__DEPIKT_SUPABASE__ before the app module", () => {
  const root = read("src/routes/__root.tsx");
  assert.match(root, /supabasePublicEnvInlineScript/);
  assert.match(root, /supabaseBoot \? \[{ children: supabaseBoot }\]/);
});
