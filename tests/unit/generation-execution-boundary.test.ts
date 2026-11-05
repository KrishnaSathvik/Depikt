import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

test("only the server-only helper reads execution tokens", () => {
  const readers = files("src").filter((f) =>
    readFileSync(f, "utf8").includes("get_generation_execution_token"),
  );
  assert.deepEqual(readers, ["src/lib/generation/execution-token-server.ts"]);
});

test("no app code persists or merges tokens into session data", () => {
  for (const f of files("src")) {
    const s = readFileSync(f, "utf8");
    assert.ok(!s.includes("merge_generation_execution_tokens"), f);
    assert.ok(!s.includes("executionTokensEnc") || f.endsWith("execution-auth.ts"), f);
    assert.ok(!/row\??\.execution_tokens?\b/.test(s), f);
  }
});

test("Step 4D migration grants the token reader to service_role only", () => {
  const sql = readFileSync("supabase/pending/step4d_execution_boundary.sql", "utf8");
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION public\.get_generation_execution_token\(uuid, uuid\) FROM PUBLIC, anon, authenticated;/,
  );
  assert.match(
    sql,
    /GRANT EXECUTE ON FUNCTION public\.get_generation_execution_token\(uuid, uuid\) TO service_role;/,
  );
  assert.doesNotMatch(sql, /RETURNS TABLE \([^)]*execution_token/);
});
