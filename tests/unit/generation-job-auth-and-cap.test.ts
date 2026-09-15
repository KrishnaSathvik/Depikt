import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { HARD_SERIES_CAP } from "../../src/lib/generation/plan.ts";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

const MIGRATION = "supabase/migrations/20260914220000_generation_job_auth_and_series_cap.sql";

test("create_generation_job binds auth.uid() to p_user_id in the DB function", () => {
  const sql = read(MIGRATION);
  const jobFn = sql.slice(
    sql.indexOf("CREATE OR REPLACE FUNCTION public.create_generation_job("),
    sql.indexOf("CREATE OR REPLACE FUNCTION public.create_generation_jobs("),
  );
  assert.match(jobFn, /auth\.uid\(\) IS NULL OR auth\.uid\(\) <> p_user_id/);
  assert.match(jobFn, /create_generation_job: authenticated user does not match p_user_id/);
  assert.match(jobFn, /create_generation_job: session does not belong to user/);
  assert.match(jobFn, /create_generation_job: source version does not belong to user/);
});

test("create_generation_jobs rejects a series larger than HARD_SERIES_CAP", () => {
  const sql = read(MIGRATION);
  const plan = read("src/lib/generation/plan.ts");
  assert.match(plan, new RegExp(`export const HARD_SERIES_CAP = ${HARD_SERIES_CAP}`));
  assert.match(sql, new RegExp(`IF v_count > ${HARD_SERIES_CAP} THEN`));
  assert.equal(HARD_SERIES_CAP, 20);
});

test("POST /jobs clamps the verified plan and rejects selectedCount above the hard cap", () => {
  const jobs = read("src/routes/api/generation/jobs.ts");
  assert.match(jobs, /payload = \{ \.\.\.payload, plan: clampGenerationPlan\(payload\.plan\) \}/);
  assert.match(jobs, /req\.selectedCount != null && req\.selectedCount > HARD_SERIES_CAP/);
});
