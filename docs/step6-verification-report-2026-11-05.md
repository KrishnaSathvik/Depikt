# Step 6 — Consolidated Verification & Release Readiness Report

**Development only.** No publish/deploy, no production database changes, no
paid provider calls, no payment operations, no price changes. GIF execution
remains disabled pending measured pricing.

## 1. Consolidation audit (Steps 1–5 together)

- **Migration order** (all in `supabase/pending/`, none applied to
  production): `lock_down_credit_functions.sql` → `step2_job_security.sql` →
  `step2_cron_schedule.sql` → `step3_job_execution_tokens.sql` →
  `step4_media_metadata.sql` → `step4d_execution_boundary.sql`. No conflicting
  schema changes between them; each builds on the previous.
- **Outdated fallbacks:** the legacy paths in `job-transition.ts` and
  `settle-credits.ts` are intentional pre-migration bridges and must stay
  until the migrations are applied and verified in production. Not removed.
- **Model-family config:** `models.ts` defaults to family `2.5`; `2.6` ids are
  registered but inactive. Server (`IMAGES_MODEL_FAMILY`) and client
  (`VITE_IMAGES_MODEL_FAMILY`) must flip together — documented in the runbook.
- **Media capabilities** (markup, SVG, GIF) all ride the existing job +
  credit infrastructure: signed plans, execution tokens, reservation/settle.
  No parallel billing path exists.
- **Release dependencies** documented in `docs/release-runbook-images-2-6.md`.

## 2. The two test failures — root causes and fixes

1. **`previous VNext PNG fixture…`** — root cause: the fixture was produced by
   a paid provider run (2026-09-16, logged in `_fixtures/log.json`) and was
   never committed; it exists nowhere on disk or in git history. It cannot be
   restored offline. Fix: the test now skips with an explicit reason when the
   file is absent and keeps every assertion when present. Restoring it
   requires an approved paid regeneration — noted as a pilot candidate.
2. **`series validation scopes exact text…`** — root cause: the test still
   expected the old cancel-on-mismatch behavior. The intended behavior (proven
   in the Halloween-printable incident) is that a child whose prompt doesn't
   quote its exact text is simply not text-checked. Fix: the outdated
   `assert.throws` was replaced with assertions matching the proven behavior
   (child a keeps its check, child b has none). No assertion weakened.

**Full suite: 990 passed / 991 total / 0 failed / 1 skipped (the fixture
skip above).** Typecheck clean.

## 3. Offline security & reliability (isolated Postgres, real roles)

Full harness re-run (`step4d.sh` — superset covering Steps 1, 3, 4, 4D):
**90/90 pass**, including anonymous/authenticated restrictions, execution-token
secrecy, idempotent job creation and replay, concurrent claims (one claimed,
one already_running), cancellation during execution, exactly-once charge and
refund, refund replay no-op, and plan_json immutability. No regressions across
Steps 1–5.

## 4. Media compatibility (offline only)

Covered by the unit suite: capability registry for Flare/Sunburst 2.5/2.6,
markup alignment/validation, SVG sanitization (parse, allowlist, script/event/
external-ref rejection), GIF structure parsing (frame counts, durations, loop),
raster generation/editing paths, reference workflows, version history.
**None of this is real-provider verification** — mocked provider tests prove
our plumbing, not OpenAI behavior. That gap is exactly what the pilot closes.

## 5. Paid benchmark pilot (prepared, not executed)

`docs/images-2-6-benchmark-pilot.md`: 28 generations, estimated ≤ $8, covering
Flare vs Sunburst, 2.5 vs 2.6, typography/layout, reference fidelity, markup
editing, SVG, and GIF with actual cost measurement. Expansion criteria to the
full 150-generation / $40-cap benchmark are defined there. **Awaiting explicit
approval — no paid calls made.**

## 6. Credit economics

- Raster charges unchanged (1 credit per still image); no evidence supports a
  change yet.
- GIF stays disabled: `media-pricing.ts` returns no quote for GIF, so it
  cannot reserve credits or execute. Pricing decision pending pilot group F.
- SVG rides the existing 1-credit raster path; pilot group E confirms whether
  provider cost justifies that.
- Server-side pricing controls and pre-submission quotes verified in the unit
  suite (`generation-economics`, media pricing tests). No subscription or
  credit-price changes introduced.

## 7. Final UI/UX verification

Step 5 results stand: signed-in walkthroughs at 1280/820/390/360px with no
overflow, nine screens axe-clean (WCAG 2 A/AA + 2.1 AA), markup keyboard
workflow verified. Physical-device touch test: **unverified** (no device
available in this environment).

## 8. Release preparation

`docs/release-runbook-images-2-6.md` covers: release commit recording, env
vars/flags, the six migrations in order with per-step verification, ledger
reconciliation, stale-job reaper confirmation, smoke tests, monitoring/alerts,
and rollback/forward-recovery. **Not executed.**

## Confirmed remaining defects and risks

| Item                                                     | State                                                      |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| Paid-run fixture `vnext3-brand-a-logo.png` missing       | Test skips cleanly; restore via approved paid regeneration |
| Markup/SVG/GIF never exercised against the real provider | Pilot plan ready; needs approval                           |
| GIF pricing unknown                                      | Execution disabled until measured                          |
| Physical-device markup touch                             | Unverified                                                 |
| Stuck 2026-09-13 job (1 reserved credit)                 | Reaper recovers it once Step 2 cron is applied             |
| Legacy fallbacks in job-transition/settle-credits        | Intentional until migrations verified in production        |

## GO / NO-GO assessment

**NO-GO for production release today**, by design — two approvals are still
open:

1. **Paid benchmark pilot** (≤ $8, 28 calls): required to provider-verify
   markup/SVG/GIF and price GIF. Plan ready.
2. **Production release**: runbook ready; execute only after the pilot passes
   and this report is reviewed.

Everything that can be verified offline **is** verified: 990/991 unit tests,
90/90 isolated DB security tests, typecheck clean, accessibility clean,
migration order audited, runbook written. The remaining unknowns are exactly
the ones that require paid calls and a production window.
