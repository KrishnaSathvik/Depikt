> Final live run completed: **NOT READY**. See [consolidated final report](final-report.md): 14 initial + 1 repair = 15 provider images; QA credits 86 → 72. Earlier preflight entries below are historical.

> Latest: the verification-only run-wide budget guard is implemented and its mock/non-paid checks pass. See [budget guard verification](budget-guard-verification.md). QA remains at 86 credits; production configuration remains OFF; the final matrix is still unexecuted. Earlier findings below are retained for auditability.

> Latest update: the three migration-history entries have now been repaired through Lovable. See [QA migration verification](qa-migration-verification.md). All rerun non-billable checks pass and credits remain 86. Final execution is still blocked on run-wide provider budget enforcement; no live calls have occurred.

> Update: the user has since applied the migrations. Expected schema objects now exist; migration-history entries are missing. See [QA migration verification](qa-migration-verification.md) for the latest checks. The original preflight report below is retained for auditability.

# Final Depikt VNext verification — preflight blocked

Recommendation: **NOT READY** for production activation. Live verification has not started; this is not a scored image run.

## Blocker

The Brave Search key is now present in the effective local development environment. No key values were printed and no search requests were made.

Authenticated, read-only QA database preflight found:

- `credit_accounts`: 86 available credits (0 plan / 86 extra), sufficient for 18 requested outputs.
- `generation_grounding_cache`: unavailable through the database API (`PGRST205`, table absent from schema cache).
- `generation_request_repairs`: unavailable through the database API (`PGRST205`, table absent from schema cache).
- `generation_jobs.validation_result`: column does not exist (`42703`).

The configured QA database therefore does not meet the V4/V5 schema requirements. Stop before paid execution. No migrations or fixes were applied. Applying the missing migrations requires separate authorization under the final verification stop-on-failure instructions.

Runtime enforcement of the cross-session 18 initial / 1 repair / 19 total provider-output limits also remains unverified. Matrix limits alone do not establish runtime enforcement. This remains a mandatory gate before paid execution.

## Repository and non-billable checks

- Inspected local `main` at `c37c165`, four commits ahead of origin/main.
- The launch-policy commit already exists: `245b808`; local-only configuration already exists: `c37c165`. No duplicate policy commit was created.
- Pre-existing uncommitted generation/UI/session changes were left intact and uncommitted.
- `npm test`: PASS, 766 tests, zero failures, both before and after the matrix update.
- `npm run typecheck`: PASS, both before and after the matrix update.
- `npm run build`: PASS before the matrix update; no application source was changed by this verification.
- Changed-file lint: PASS for the 20 pre-existing changed/untracked source and test files. The added matrix-integrity assertion initially needed line wrapping; only that new assertion was formatted and rechecked.
- Disposable PostgreSQL migration/RLS and concurrent series repair cap checks: PASS. Initial sandbox execution could not allocate shared memory; authorized execution outside the sandbox passed. No hosted database migration was applied.
- Frozen V3 corpus: all 17 manifest file hashes match.
- Configuration unit tests: development V4/V5 ON; production configuration and Worker V4/V5 OFF; search caps 3 web / 2 visual / 8 sources; session repair allowance 1.
- Production was not enabled, deployed, or modified.

## Frozen matrix

Original v1 is preserved byte-for-byte at `matrix-v1.json`, SHA-256 `d49ffa6119afb0d63b5040ab4106fbc2a7d9b14508dd85ea8d97111883621aa2`.

Fresh v2 is `matrix.json`, status `frozen-not-executed`, SHA-256 `082a3cb04029a1763e7750f9e1a63a1f1d4356c3570800d35d9efc86de22dff1`. Fourteen scenarios total exactly 18 requested outputs, including edits and the single manual regenerate. Maximum automatic repairs: 1. Absolute maximum provider outputs: 19. Prompts are copied from the authorized request. The integrity test checks both frozen hashes and the v2 budget.

## Scenario results

No image scores are assigned to unexecuted scenarios. PASS / SOFT FAIL / FAIL scoring requires actual outputs.

| Scenario | Case | Planned requested images | Execution |
| --- | --- | --- | --- |
| 1 | single | 1 | Not executed: preflight blocked |
| 2 | series | 2 | Not executed: preflight blocked |
| 3 | contact-sheet | 1 | Not executed: preflight blocked |
| 4 | precision-edit | 1 | Not executed: preflight blocked |
| 5 | whole-edit | 1 | Not executed: preflight blocked |
| 6 | character | 1 | Not executed: preflight blocked |
| 7 | product | 1 | Not executed: preflight blocked |
| 8 | entities | 1 | Not executed: preflight blocked |
| 9 | brand-series | 3 | Not executed: preflight blocked |
| 10 | game-grounding | 1 | Not executed: preflight blocked |
| 11 | location-grounding | 1 | Not executed: preflight blocked |
| 12 | exact-text | 1 | Not executed: preflight blocked |
| 13 | repair | 1 | Not executed: preflight blocked |
| 14 | plain-regression | 2 | Not executed: preflight blocked |

## Browser pass and V1–V5 coverage

All final desktop/mobile browser checks are blocked pending matrix outputs: Generate, Series, contact sheet/result presentation, Edit, mask editing, reference packs, locked chips/budget, grounding status/sources, validation state, repair state if applicable, Regenerate, refresh/resume, credits, Account References, download, and version navigation.

V1–V5 have automated regression evidence from the passing suite. None has final live visual or browser verification evidence from this run. No claim is made about image quality, identity fidelity, exact typography, real grounding quality, or live repair behavior.

## Economic accounting and provider calls

| Metric | This verification attempt |
| --- | --- |
| Starting credits | 86, authenticated QA database preflight |
| Ending credits | Not separately re-read; no credit-mutating calls made |
| Planned charged requested outputs | 18 |
| Actual charged requested outputs | 0; no live generation invoked |
| Refunded failures | 0; no live provider attempt |
| Validation extra user credits | 0 |
| Grounding extra user credits | 0 |
| Automatic-repair extra user credits | 0 |
| Repair images generated | 0 |
| Provider image calls / outputs | 0 / 0 |
| Web queries | 0 |
| Visual queries | 0 |
| Live grounding cache hits | 0 |
| Live validation calls | 0 |
| Estimated incurred provider cost | No live provider calls; telemetry estimate not collected |

The expected policy remains one credit for each requested generation, edit, or manual regenerate; no extra credits for validation, grounding, or automatic repair; initial provider failures refunded. These are policy expectations, not live accounting verification.

## Stop state

No image generation, prompt retry, fixture regeneration, live search, live judging, browser generation, deployment, or production activation occurred. No product fixes were made. Live execution remains unstarted and must not proceed until the database blocker is resolved with separate authorization and the remaining preflight gates pass. This report is not a request to rerun any scenario: none has been executed.
