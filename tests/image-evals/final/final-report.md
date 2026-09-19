# Final VNext verification — NOT READY

Run `final-vnext-verification-2026-09` completed its single authorized attempt on 2026-09-18. **8 PASS, 0 SOFT FAIL, 6 FAIL.** Four planned outputs were blocked before an image-provider attempt. No retries or replacement scenarios were run.

Production activation is blocked by incorrect series planning, destructive teapot geometry changes within the edit mask, rejection of both grounded-generation jobs, and irrelevant grounding constraints causing false V5 failures. Browser coverage also has limitations below.

## Final accounting

| Measure | Actual |
|---|---:|
| Starting QA credits | 86 |
| Ending QA credits | 72 |
| Initial/requested image calls | 14 / 18 |
| Automatic repair image calls | 1 / 1 |
| Total provider image calls | 15 / 19 |
| Persisted selected outputs | 14 |
| Charged user credits | 14 |
| Refunded user credits | 0 |
| Web queries | 8 |
| Visual queries | 8 |
| Grounding cache hits | 1 |
| Visual validation provider calls | 11 |
| OCR provider calls | 9 |
| Additional user credits for grounding / validation / repair | 0 |

The ledger contains 14 reservations of -1 and 14 zero-amount settlement entries. No refund entries occurred: every image-provider request returned HTTP 200, and the three blocked scenarios failed before charging. Provider-failure refunds were therefore not exercised in this live run. Manual masked edit, whole-image edit and regenerate each charged the normal one credit/output. Validation counts exclude local deterministic checks; 20 validation/OCR provider calls combined. Planning additionally used 15 intent calls and one series-decomposition call. These are paid-capable non-image calls, separate from the 15 paid image attempts.

Scenario 4 consumed the sole automatic repair. Its result was `not_improved`; the original initial edit was retained, not replaced by the unsuccessful repair. The source cobalt image remains separately preserved. Scenario 13 naturally passed, so no second repair was requested. The later explicit authorization allowing an earlier scenario to use the global repair slot governed this run.

## Frozen scenario scorecard

| # | Scenario | Outputs actual / planned | Score | Evidence |
|---|---|---:|---|---|
| 1 | single | 1 / 1 | PASS | Cobalt teapot, two pears, walnut table, north-window light; 1024×1280. Validation passed. |
| 2 | series | 0 / 2 | FAIL | Planner selected collage, desiredCount=1, autoCount=1, separateAssets=false despite two separate standalone images and No collage. Stopped before jobs/provider; 0/2 outputs. |
| 3 | contact-sheet | 1 / 1 | PASS | One image with six consistent orange/white robots in two rows of three, distinct poses, no text. Validation passed. |
| 4 | precision-edit | 1 / 1 | FAIL | Matte ivory recolor achieved, but teapot became taller/narrower with changed spout, lid and handle. Outside-mask normalized difference 0.014734 passed deterministic preservation. Validator repairable at 0.90; sole repair not_improved; initial edit retained. |
| 5 | whole-edit | 1 / 1 | PASS | Cool rainy mood and softer light with original cobalt teapot, pears and composition preserved. Source was Scenario 1 original. Validation passed. |
| 6 | character | 1 / 1 | PASS | Sofia identity recognizable against approved references: red hair, freckles and facial features retained in conservatory scene. Validation passed. |
| 7 | product | 1 / 1 | FAIL | Product identity visually passes: lavender square bottle, silver cap and NEMORI/BERRY label preserved. Unexpected grounding introduced unrelated perfume-portrait criteria; V5 incorrectly failed the correct still life. Extra background props visible, but no explicit no-props requirement. |
| 8 | entities | 1 / 1 | FAIL | Maya and Sofia remain distinct; Sofia holds recognizable NEMORI Berry bottle. Unexpected grounding introduced irrelevant milk-cap/editorial-dinner criteria, empty facts and encoded source material; V5 failed unrelated constraints. Visual identity subcheck passes. |
| 9 | brand-series | 3 / 3 | PASS | Three separate VELORA images: bookstore, greenhouse and rooftop. Consistent bottle, wordmark, lemon emblem and palette; no scene-name headlines/captions. Incidental bookstore book titles appear. All three validations passed. |
| 10 | game-grounding | 0 / 1 | FAIL | Grounding performed, but job creation returned HTTP 400: Editing requires a sourceVersionId or a reference image. 0/1 output; game-faithful visual result unverified. |
| 11 | location-grounding | 0 / 1 | FAIL | Grounding performed, but same HTTP 400 blocked job creation. 0/1 output; relative skyline placement unverified. Non-image cache lookup reused identical snapshot with zero new searches. |
| 12 | exact-text | 1 / 1 | PASS | All six supplied text lines present with correct spelling, date, time and punctuation; no additional visible copy. OCR/validation passed. |
| 13 | repair | 1 / 1 | PASS | Exactly five enamel pins around one centered card reading FIVE IDEAS. ONE SYSTEM. No extra objects/text. Natural validation passed; no repair requested or forced. Global repair slot had already been consumed by Scenario 4. |
| 14 | plain-regression | 2 / 2 | PASS | Two distinct blood-orange still lifes, one initial and one authorized regenerate. No entities/search/grounding; both validations passed. Two normal user credits. |

## Grounding and provenance

| Scenario | Web | Visual | Selected sources | Visual references | Initial cache hit |
|---|---:|---:|---:|---:|---|
| 7 Product | 2 | 2 | 7 | 2 | No |
| 8 Multi-entity | 2 | 2 | 3 | 2 | No |
| 10 Game | 2 | 2 | 7 | 2 | No |
| 11 Location | 2 | 2 | 8 | 2 | No |

Each stayed within 3 web queries, 2 visual queries and 8 sources. Queries, selected URLs/titles/quality classifications, visual references and fact provenance are preserved in `benchmark-results/final-verification/grounding-provenance.json` and each scenario's original `planPayload.grounding`. Provider event logs preserve actual query attempts/statuses. Scenario 11's subsequent cache lookup reused the exact snapshot with 0 web and 0 visual queries (`location-cache-check.json`). No image was generated for cache testing.

Grounding quality is not approved: the fictional product scenarios were searched unnecessarily and unrelated source content became validation requirements. The game/location sources were collected, but no grounded image was produced; neither game fidelity nor current Sydney skyline accuracy can be scored as a pass.

## Browser pass using existing outputs

Actual Chromium desktop (1200×738 and 1440×1000) and mobile viewport (390×844), authenticated through the existing QA sign-in UI against the real QA database. The local browser server had the image key blanked and the verification guard installed; no image-generation action was submitted. Viewport checks do not establish physical-device/touch compatibility.

| Check | Result and limits |
|---|---|
| Generate | PASS for screen, navigation, balance and disabled empty submit. Generation itself covered by matrix route execution. |
| Series | Three brand assets persisted and are individually accessible in Account. Grouped live-series/resume UI remains unverified; Scenario 2 failed planning. |
| Contact sheet | PASS: opened existing robot output as one image; desktop screenshot saved. |
| Edit | PASS for entering existing-output edit UI and switching whole-image/select-area modes; no extra edit submitted. |
| Mask editing | PASS for selecting a region and Undo; mobile canvas/control layout inspected. Actual mask generation covered by Scenario 4, which failed geometry preservation. |
| Reference packs / locked chips / budget | PASS: existing Sofia pack selectable, Identity locked chip and 3/8 images displayed. |
| Grounding / Sources | BLOCKED for final grounded-result UI because Scenarios 10/11 produced no result. Backend provenance preserved; not counted as browser pass. |
| Validation / Repair state | NOT VERIFIED in browser: saved precision-edit Creation Details exposed dimensions and prompt, but no validation verdict or repair outcome. Backend state is recorded. |
| Regenerate | Authorized second image completed through normal request path in Scenario 14. Browser re-execution omitted; no extra image permitted. Regenerate control from saved-output route not verified. |
| Refresh / resume | Account data survives navigation/reload. Refreshing an unsent edit opened from Account returned to the empty Generate composer; draft/source was not restored. Active multi-child resume remains unverified. |
| Credits | PASS: Account and Generate both show 72, matching final DB balance. |
| Account References | PASS: character/product/brand sections, reference images, roles and counts render. No pack modified during browser pass. |
| Download | PASS: existing regenerated orange image downloaded as PNG. |
| Result / version navigation | Individual saved results open. Precision edit labeled Edited from a previous version; no parent-version navigation was exposed in the inspected modal. Full version-chain browser navigation unverified. |
| Desktop / mobile | Inspected result modals, Generate/edit, reference selection and Account. Mobile uses scrolling; development auth overlay remains visible. |

Additional observations: Open in Generate navigated to edit mode while the Creation modal remained open until Close. Job polling during generation recorded null result URLs even though stored PNGs could be fetched and Account later displayed/downloaded them; cause was not investigated or fixed. Account labels reference-based brand outputs Edited and displays the expanded internal reference instruction as Prompt. These observations are preserved for review, not repaired.

Browser screenshots are in `output/playwright/final-*.png`; snapshots and console logs from this pass are copied to `output/playwright/final-session/`. No additional provider call was made for browser coverage.

## Integrity, process and remaining boundaries

- Frozen matrix SHA256: `082a3cb04029a1763e7750f9e1a63a1f1d4356c3570800d35d9efc86de22dff1`. Matrix, guard and runner hashes match run-start evidence. All 17 approved fixture/manifest entries still match.
- Durable `benchmark-results/final-verification/state.json` and initialization marker retained. They were initialized once and never deleted/reset. The matrix's historical `frozen-not-executed` template field was deliberately not edited; the durable state and this report record actual execution.
- QA effective V4/V5 flags ON. Production configuration V4/V5 OFF, auto-repair disabled. No production activation or deployment. This is configuration evidence, not a new remote-production deployment audit.
- Execution used actual application route handlers in-process with real QA authentication, credit ledger, storage, planning, grounding, validation and repair; the verification-only transport guard enforced provider accounting. User prompts were unchanged. Normal production prompt compilation/decomposition still occurred.
- Before Scenario 4's first provider attempt, an incorrectly encoded local mask failed upload validation (dimension mismatch). The same planned teapot mask was encoded correctly and uploaded. Both upload records and invalid/corrected masks are retained. This was a harness preparation error, not an extra image attempt or product fix.
- Preflight previously passed 783 tests, typecheck, build, changed-file lint and DB/RLS/concurrency checks, with migration history synchronized. These are preflight results; no test rerun or implementation fix followed this live run.
- No extra seeds, reference fixtures, quality retries, historical benchmarks or repairs were generated. Existing generation/history data was preserved. Four unused initial slots remain unused; they do not authorize replacement runs.

## Evidence

The local evidence directory `benchmark-results/final-verification/` contains `start-evidence.json`, `state.json`, `provider-events.jsonl`, per-scenario plans/results/telemetry/version metadata and selected PNGs, `scorecard.json`, `grounding-provenance.json`, `location-cache-check.json`, `accounting.json`, `credit-ledger-complete.json`, `end-balance.json`, `end-flags.json` and `end-integrity.json`. It is local benchmark output; retain it for review.

**Stopped after verification and reporting. No fixes, reruns, production activation or deployment.**
