# Depikt Images 2.6 — Production Release Runbook (prepared, not executed)

**Do not run any step here without explicit release approval.**
Order matters: code first, then database, then flags, then verification.

## 0. Preconditions

- [ ] Step 6 verification report reviewed; GO decision recorded.
- [ ] Paid benchmark pilot completed; GIF pricing decided and landed in
      `src/lib/generation/media-pricing.ts` (or GIF stays disabled).
- [ ] Full suite green, isolated DB harness green (90/90), build OK on the
      exact release commit.
- [ ] Release commit hash recorded here: `<commit>`.

## 1. Deploy application code

- [ ] Publish the release commit. The app must tolerate the pre-migration
      database: `job-transition.ts` and `settle-credits.ts` legacy fallbacks
      exist for exactly this window. Do not remove them before step 2
      completes and is verified.

## 2. Apply database migrations in this exact order

All files live in `supabase/pending/`. Apply via the database SQL interface,
one at a time, verifying each before the next:

1. `lock_down_credit_functions.sql` — revokes raw credit functions from
   anon/authenticated; `settle_generation_job` becomes the only signed-in
   settlement path.
2. `step2_job_security.sql` — job transition/validation RPCs, direct-UPDATE
   revocation, expired-plan-credit refund guard.
3. `step2_cron_schedule.sql` — 15-minute stale-job reconciliation schedule.
4. `step3_job_execution_tokens.sql` — execution_token column, claim RPC,
   token-gated transitions.
5. `step4_media_metadata.sql` — `image_versions.media_metadata`, grants.
6. `step4d_execution_boundary.sql` — token secrecy hardening (job-creation
   RPCs stop returning tokens; service_role-only reader).

- [ ] After each migration, run its verification block from the matching
      harness script against production (read-only checks only).
- [ ] Confirm `generation_jobs` direct UPDATE is denied for authenticated.

## 3. Reconcile state

- [ ] Credit ledger reconciliation: every `reserved` job older than 15 min
      settled by the reaper; spot-check 3 accounts' balances vs ledger sums.
- [ ] The known stuck 2026-09-13 job (1 reserved credit) is recovered by the
      reaper — confirm its refund ledger entry.
- [ ] Confirm the scheduled stale-job sweep is registered and ran once.

## 4. Feature flags (only after 1–3 verified)

- [ ] `IMAGES_MODEL_FAMILY=2.6` (server) and `VITE_IMAGES_MODEL_FAMILY=2.6`
      (client) together — never server-only, or SVG stays greyed out while
      the server accepts it.
- [ ] GIF execution flag stays OFF unless the pricing decision from the
      pilot is landed.

## 5. Smoke tests (production, real account)

- [ ] Sign in; generate one raster image; confirm exactly one credit charged
      and one ledger entry.
- [ ] Cancel a queued job; confirm refund exactly once.
- [ ] Edit with mask; confirm original preserved and version history intact.
- [ ] SVG generation (family 2.6): parses, previews, downloads.
- [ ] Library, Gallery, Templates, Account, Pricing render; no console
      errors.

## 6. Monitoring and alerts

- [ ] Watch settlement-failure log/metric for 24h; alert on any
      `settle_generation_job` error.
- [ ] Alert on reserved-credit total growing for > 1 hour (reaper failure).
- [ ] Alert on generation error rate > 2× baseline.

## 7. Rollback / forward recovery

- **App rollback:** republish the previous commit. The pre-migration code
  works against the migrated database only if migrations are additive — steps
  1, 5 are; steps 2–4, 6 revoke permissions, so prefer **forward recovery**:
  the legacy fallbacks in the new code keep working either way.
- **Migration rollback:** each pending migration's objects are new or
  REVOKE-only; re-GRANT statements are the rollback for revocations (keep the
  pre-release permission dump from step 2 verification as the reference).
- **Flag rollback:** set `IMAGES_MODEL_FAMILY` back to `2.5` (server and
  client) — instant, no deploy.
- **Credit recovery:** any job stuck reserved is settled by the reaper; manual
  settlement is `settle_generation_job(job_id, outcome)` as service_role —
  never raw credit functions.
