# Step 2 — Job Security, Refund Integrity & Credit Reliability

Constraints: no publish, no production DB changes, preserve Step 1, no Images 2.6.

- [x] 1. Job security: transition_generation_job + save_generation_job_validation RPCs; REVOKE direct UPDATE on generation_jobs; image_versions insert gated on non-terminal job
- [x] 2. Settlement integrity: DB tests for settle_generation_job (replay, conflicts, race, no-reservation)
- [x] 3. Missing refunds: observable settlement failures (no silent catch), reap_stale_generation_jobs() + cron schedule file (prepared, not applied)
- [x] 4. Expired credits: refund must not restore plan credits reset by a renewal; documented in migration + report
- [x] 5. Stuck job: investigated (reaper is poll-driven, session never reopened); scheduled reconciliation designed + tested locally; balance untouched per constraints
- [x] 6. Balance sync: refresh credits when settled-job count grows and on window focus
- [x] 7. Verification: isolated Postgres harness rebuilt, 44/44 DB tests, 956/958 app tests (2 pre-existing failures), typecheck clean, build OK
- [x] Report: /mnt/documents/audits/step2-report-2026-11-05.md

Open (blocked on user): publish the app, then apply supabase/pending/lock_down_credit_functions.sql, step2_job_security.sql, step2_cron_schedule.sql to production and re-verify.
