> Latest: the verification-only run-wide budget guard is implemented and its mock/non-paid checks pass. See [budget guard verification](budget-guard-verification.md). QA remains at 86 credits; production configuration remains OFF; the final matrix is still unexecuted. Earlier findings below are retained for auditability.

> Update: migration-history bookkeeping is now synchronized through the connected Lovable database tool. The Supabase CLI cannot access this Lovable-managed project. Three individual history-only INSERTs recorded versions `20260917120000`, `20260917130000`, and `20260918120000` with their existing migration names; a subsequent SELECT returned all three. No migration SQL was rerun, no schema or generation/history data was changed, and no other migration entries were modified. Statements were not executed or stored as part of this repair.
>
> After repair: 766 tests, typecheck, build, changed-file lint, disposable DB/RLS/concurrency checks, frozen matrix integrity, and all 17 fixture hashes passed. QA balance remains 86. Local development V4/V5 flags are ON; committed production and Worker configuration remain OFF. Zero paid images, search calls, or live validation calls were made. The final matrix remains unexecuted.
>
> Migration blocker: CLEARED. Remaining final-run preflight blocker: the existing application enforces repair allowance per session, while the matrix file only declares run-wide caps. No execution guard currently enforces the whole-run 18 initial / 1 repair / 19 total allowance across sessions. Under the explicit instruction not to start if configuration permits exceeding the frozen caps, live execution remains stopped. A QA-only run guard is required before paid calls.
>
> The previous report below is retained as historical evidence.

# QA migration verification

The user reported applying the migrations. The agent applied zero migrations and performed no hosted database writes. Verified schema effects are present, but the three version entries are absent from `supabase_migrations.schema_migrations`. Therefore the requested recorded/applied gate is not fully green. Do not rerun the non-idempotent migrations merely to populate history.

## Existing migration files

- `20260917120000_generation_grounding_cache.sql`: schema effects present; version not recorded.
- `20260917130000_generation_validation_repair.sql`: schema effects present; version not recorded.
- `20260918120000_request_repair_economics.sql`: schema effects present; version not recorded.

No SQL execution failure occurred in this verification; no migration application was attempted after the user reported completion. Manual application success is inferred from the resulting schema, not from a migration execution log.

## Hosted schema/security inspection

Authenticated QA API reads now succeed for the grounding cache, session repair ledger, and job validation fields. Administrative read-only catalog inspection of the Depikt database confirms:

- `generation_grounding_cache`: composite owner/hash primary key; owner foreign key; 64-character hex hash check; 32,768-byte snapshot limit; RLS enabled; owner-only authenticated CRUD; no anonymous table access.
- `generation_jobs.validation_result`: nullable JSONB.
- `generation_jobs.repair_attempts`: non-null integer default 0, constrained to 0–1.
- `generation_repair_budget_monotonic`: before-update trigger using `prevent_generation_repair_reset`, preventing budget resets and job restarts.
- `generation_request_repairs`: session primary key, session/user/job foreign keys, running/complete state constraint; RLS enabled; owner-only SELECT; authenticated direct INSERT/UPDATE/DELETE denied; anonymous table access denied.
- `claim_generation_repair`: retired implementation returns false.
- `claim_generation_request_repair` and `finish_generation_request_repair`: expected owner checks, terminal-child gating, atomic session claim, and permitted outcomes; SECURITY DEFINER with fixed public search path; anonymous execution denied and authenticated execution allowed.

Hosted checks were reads only; behavioral RLS and concurrency tests ran against disposable local PostgreSQL. No generation/history data was changed by the agent. Preservation during the user's earlier migration cannot be independently proven without a before snapshot.

## Non-billable checks

| Check | Result |
| --- | --- |
| All three version entries recorded | FAIL: entries absent |
| Expected schema objects/constraints | PASS |
| Hosted RLS/policy/privilege inspection | PASS |
| Disposable DB migration/RLS/concurrency suite | PASS |
| npm test | PASS: 766 tests, zero failures |
| npm run typecheck | PASS |
| npm run build | PASS |
| Changed-file lint | PASS: 21 source/test files |
| Frozen v2 matrix integrity | PASS: unchanged hash, 14 scenarios, 18 requested, 1 repair, 19 total cap |
| Approved fixture integrity | PASS: all 17 hashes |
| Production configuration | V4/V5 OFF; automatic repair disabled in .env.production and wrangler.jsonc |
| QA credits | 86 available, sufficient for planned 18 |

Production deployment/runtime settings were not changed. Local configuration tests passed; no deployment was performed.

## Stop state

Paid image calls: **0**. Grounding/search calls: **0**. Live validation calls: **0**. Final matrix: **unexecuted**. No product changes, migration edits, new schema, or migration-history repairs were made. Execution is stopped as requested. The missing migration-history entries remain the documented verification gap; final-run budget enforcement remains a separate live preflight requirement.
