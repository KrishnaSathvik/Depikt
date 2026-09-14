# Task 7 Report: Resume helper + session stale-fail

**Status:** DONE
**Branch:** `vnext-1-intent-to-generate`
**Commit:** `4ca1ef9e071d3f26e3f10f37d189317e4d578a9a`

## TDD RED

Created `tests/unit/generation-series-resume.test.ts` first with coverage for:

- selecting only queued series children, in input order;
- stale-failing queued and running jobs only when their age strictly exceeds
  the six-minute limit;
- treating a duplicate start response with `claimed: false` as HTTP success.

Command:

```text
node --test tests/unit/generation-series-resume.test.ts
```

Result: **failed as expected** with `ERR_MODULE_NOT_FOUND` for the not-yet-created
`src/lib/generation/series-resume.ts`.

## TDD GREEN

Implemented:

- `jobsNeedingStart(jobs)` in `src/lib/generation/series-resume.ts`;
- `duplicateStartResponse(status, headers)`, used by the existing run route to
  preserve the duplicate-start contract of HTTP 200 with
  `{ claimed: false, status }`;
- pure `applyStaleFailure(job, now, staleMs)` in
  `src/lib/generation/stale-job.ts`;
- shared `STALE_MS`, stale error copy, and `failAndRefundStaleJob(...)` in the
  same module.

The focused test then passed all **3/3** cases.

## Route integration

- `GET /api/generation/jobs/:id` now delegates stale detection, failure, and
  credit refund to the shared stale-job helper.
- `GET /api/generation/sessions/:id` now loads the session's jobs with
  `id`, `status`, `series_index`, `series_label`, and `created_at`, plus the
  private refund inputs `user_id` and `idempotency_key`.
- Every stale queued/running sibling is failed and refunded through that same
  helper before the session response is returned.
- Private refund fields are not exposed. The response is now
  `{ sessionId, versions, jobs }`.
- The queued-to-running CAS in `POST /api/generation/jobs/:id/run` was not
  changed.
- No client session persistence, `/plans`, or `/jobs` rewrite was added.

## Verification

- `npm test`: **pass**, 469 tests, 0 failures.
- `npm run typecheck`: **pass**.
- ESLint on all six changed files: **pass**.
- `git diff --check`: **pass**.
- `git show --check HEAD`: **pass**.

## Concerns

- Repository-wide `npm run lint` still fails on the pre-existing formatting
  backlog: 3,565 findings across unrelated files. The Task 7 files pass their
  focused ESLint run.
- Session stale-fail/refund behavior is covered through pure helper tests and
  type checking; there is no route-level Supabase integration test harness in
  this task.

## Files changed

- `src/lib/generation/series-resume.ts` (new)
- `src/lib/generation/stale-job.ts` (new)
- `tests/unit/generation-series-resume.test.ts` (new)
- `src/routes/api/generation/jobs.$id.ts`
- `src/routes/api/generation/jobs.$id.run.ts`
- `src/routes/api/generation/sessions.$id.ts`

## Critical finding follow-up

Fixed stale-job settlement so the conditional `queued`/`running` → `failed`
update selects its updated row and inspects both `data` and `error`. Refunds now
occur only when this request wins that transition. A zero-row update re-reads
the live status, so a concurrent success remains `succeeded`; an update error
keeps the snapshot status and never refunds. Both job and session GET handlers
use the helper's returned live status.

Added `tests/unit/generation-stale-job.test.ts` with fake-client coverage for:

- winning the transition and refunding exactly once;
- losing to `succeeded` without refunding;
- an update error without refunding or reporting failure.

Verification:

- `node --test tests/unit/generation-stale-job.test.ts`: pass, 3 tests, 0 failures.
- `npm test`: pass, 472 tests, 0 failures.
- `npm run typecheck`: pass.
- focused IDE lint diagnostics: clean.
- `git diff --check`: pass.

No changes were made to the `/run` CAS.

## Remaining Critical and Important findings

Worker completion now conditionally transitions `running` → `succeeded`.
Credits are charged only when that transition succeeds; a stale-fail winner
returns `timed_out` without a charge or a second failure update. Worker failure
updates are also restricted to `running`.

Stale timeout refunds now retry the existing idempotent
`finalize_generation_credits` RPC when a live or initially loaded job is already
failed with `error_code = 'timed_out'`. RPC errors and rejections leave the job
failed and allow later polls to retry. The stale result carries the live safe
message, and the job GET route uses timeout copy only when its own stale
transition was applied, preserving ordinary failure messages.

Added coverage for a lost worker success CAS, zero-row timeout refund retry,
terminal timeout retry, and both returned and rejected refund RPC errors.

Verification:

- `node --test tests/unit/generation-stale-job.test.ts tests/unit/generation-job-pipeline.test.ts`:
  pass, 16 tests, 0 failures.
- `npm test`: pass, 477 tests, 0 failures.
- `npm run typecheck`: pass.
- Focused IDE lint diagnostics: clean.
- `git diff --check`: pass.

Concern: a worker that loses the final success CAS may already have uploaded an
image and inserted its version before learning that stale-fail won. This fix
prevents the incorrect charge and terminal-state overwrite; artifact cleanup is
outside Task 7.

## Final Critical findings follow-up

The worker's running transition now conditionally updates only `queued` or
`running` jobs and returns whether it found an eligible row. A worker that loses
this transition to stale-fail returns `timed_out` before generation and performs
no charge or refund.

Charge settlement now runs only after the generation failure catch is no longer
reachable. Once the success CAS wins, a charge error preserves the succeeded
job and never marks it failed or refunds it; the same idempotency key can be
retried later.

Added pipeline coverage proving both invariants.

Verification:

- `node --test tests/unit/generation-job-pipeline.test.ts tests/unit/generation-stale-job.test.ts`:
  pass, 18 tests, 0 failures.
- `npm test`: pass, 479 tests, 0 failures.
- `npm run typecheck`: pass.
- Focused IDE lint diagnostics: clean.
- `git diff --check`: pass.

Concern: charge failures are intentionally returned as successful job outcomes;
the persistent settlement retry mechanism remains future work.

## Important finding follow-up: charge settlement retry

Added `settleSucceededJobCredits(...)`, which retries the idempotent
`finalize_generation_credits` RPC with `p_outcome: "charged"` and swallows RPC
errors so a later poll can retry. Both the job GET route and every succeeded job
in the session GET route invoke it after stale handling. Succeeded jobs are never
refunded, and the pipeline charge/catch split is unchanged.

Verification:

- `node --test tests/unit/generation-stale-job.test.ts tests/unit/generation-job-pipeline.test.ts`:
  pass, 20 tests, 0 failures.
- `npm test`: pass, 481 tests, 0 failures.
- `npm run typecheck`: pass.
- Focused IDE lint diagnostics: clean.
- `git diff --check`: pass.

Concern: settlement remains poll-driven, so a succeeded job is charged when its
job or session endpoint is next polled.

## Important finding follow-up: status CAS query errors

`markJobRunning` and `markJobSucceeded` now throw Supabase query errors instead
of returning `false`, so the worker cannot misclassify a database failure as a
lost CAS or stale timeout. A successful query returns `Boolean(data)`, preserving
`false` exclusively for a zero-row conditional update. `markJobFailed` already
threw its query error and required no change.

Added `tests/unit/generation-supabase-data-access.test.ts` with focused helper
coverage distinguishing a thrown query error from a zero-row CAS result.

Verification:

- `node --test tests/unit/generation-supabase-data-access.test.ts`: pass, 2 tests,
  0 failures.
- `npm test`: pass, 483 tests, 0 failures.
- Focused IDE lint diagnostics: clean.
- `git diff --check`: pass.

Concern: none.
