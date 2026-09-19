# Targeted VNext blocker verification — NOT READY

Run `targeted-vnext-blockers-2026-09`, executed 2026-09-18 America/Chicago (2026-09-19 UTC). **4 PASS, 2 FAIL.** All six frozen scenarios were attempted exactly once and all seven requested image-provider calls returned HTTP 200. No automatic repair, retry, alternate prompt/seed, full-matrix rerun, or previously passing scenario rerun occurred.

Three original blockers are resolved in this targeted evidence. The owned-reference portion of grounding relevance is resolved, but the broader grounding-to-validation relevance blocker remains: retrieved topic-related excerpts still become unsupported output obligations.

## Scenario verdicts

| Scenario | Outputs | Verdict | Evidence |
|---|---:|---|---|
| series | 2 | PASS | Two separate 1024×1024 assets: sunrise observatory exterior and night control room. No collage. Both child validators passed count, dimensions and no-text OCR. |
| precision-edit | 1 | PASS | Original source/mask reused. Ivory matte surface with recognizable original silhouette, proportions, spout, lid and handle. Outside-mask normalized difference 0.013890 passed; requested attribute 0.96 and inside-mask structure 0.94 confidence passed. No repair. |
| product | 1 | PASS | Owned NEMORI pack retained square lavender bottle, silver cap, three-diamond mark and label. Product identity validation passed at 0.98. Grounding absent; zero web/visual calls and zero grounding constraints. |
| entities | 1 | PASS | Maya and Sofia remain distinct; Sofia holds NEMORI Berry. Character identities, product identity and distinction all passed (0.94–0.98 confidence). Grounding absent; zero web/visual calls and zero grounding constraints. |
| game-grounding | 1 | FAIL | Grounded reference inputs now generate successfully. V5 still judges retrieved craft-specific counts/attribution and general game/forum text as output requirements: 2 failed and 4 unavailable grounding checks. No repair eligible. Image resembles the requested game scene, but stock-part/mechanical fidelity is not certified by this evidence. |
| location-grounding | 1 | FAIL | Grounded reference inputs now generate successfully; visual output places Opera House left/front and Bridge behind/right at blue hour. V5 incorrectly requires fireworks from a viewpoint excerpt; 1 failed and 2 unavailable grounding checks. Exact current skyline fidelity is not independently certified. Cache snapshot reuse passed without another search/image. |

## Original blocker status

| Original blocker | Status | Finding |
|---|---|---|
| Series precedence/count parsing | RESOLVED in this run | Exactly two standalone child images, correct scenes, no collage; count/OCR checks passed. |
| Precision-edit geometry preservation | RESOLVED in this run | Original shape and parts retained while changing to ivory; independent inside-mask structure and outside-mask checks passed. |
| Grounded image operation/input plumbing | RESOLVED in this run | Both game and location created jobs and completed with grounding reference inputs through the image-edit endpoint. No missing-source rejection. |
| Grounding relevance and supported validation claims | PARTIALLY RESOLVED; still a release blocker | Owned product/entities make zero searches and pass validation. External grounding still promotes incidental facts and nonvisual claims into mandatory checks. |

Game examples: two different retrieved crafts contributed incompatible 122-part and 22-part counts plus author attribution, although the user requested a compact stock-style lander, not those crafts. General game/platform information and forum discussion were also unmeasurable as image requirements. Location example: a viewpoint excerpt about fireworks became a requirement for pyrotechnics, although the user requested an ordinary blue-hour view. Relevant topic overlap is insufficient to establish a relevant output constraint.

Each grounding bundle has seven selected sources and two visual references. All selected sources were classified `community` by the configured provider; no selected source had an official quality classification. The bundles do not establish the requested official/current evidence standard. Saved images alone do not prove every stock-game part or present-day skyline detail. No additional research was performed to supplement the run.

## Guard and economics

| Measure | Result |
|---|---:|
| Starting QA credits | 72 |
| Ending QA credits | 65 |
| Requested image attempts | 7 / 7 |
| Automatic repair image attempts | 0 / 1 |
| Total provider image attempts | 7 / 8 |
| Selected outputs persisted | 7 |
| Charged credits | 7 |
| Refunded credits | 0 |
| Extra user credits for grounding, validation, repair | 0 |
| Web queries | 4 |
| Visual queries | 4 |
| Grounding cache hits | 1 |
| Visual validation provider calls | 5 |
| OCR provider calls | 3 |

The ledger reconciles seven -1 reservations and seven zero-amount success settlements. No image-provider failure occurred, so live provider-failure refunds were not exercised. Initial provider transport split: two generations and five edits. Planning used six intent calls and one series-decomposition call, separate from the image budget. No image generation tools were used through Responses.

The single repair slot remained unused. Series, precision-edit, product and multi-entity validation passed naturally. Both grounded results contained unavailable/uncertain checks, so normal repair policy did not consider them eligible. All original usable outputs were retained. No repair was forced to exercise the allowance; repair quality is not newly verified by this run.

## Grounding accounting and provenance

| Scenario | Web | Visual | Selected sources | Visual refs |
|---|---:|---:|---:|---:|
| Series | 0 | 0 | 0 | 0 |
| Precision edit | 0 | 0 | 0 | 0 |
| Product | 0 | 0 | 0 | 0 |
| Multi-entity | 0 | 0 | 0 | 0 |
| Game | 2 | 2 | 7 | 2 |
| Location | 2 | 2 | 7 | 2 |

Both grounded requests stayed below 3 web queries, 2 visual queries and 8 sources each. The post-run location cache check returned the identical signed snapshot with cacheHit=true, zero web queries, zero visual queries and zero new image calls. Queries, selected URLs/titles, fact/source IDs, visual-reference provenance and cache usage are preserved in the evidence directory.

## Integrity and stop conditions

- Separate state: `benchmark-results/targeted-vnext-blockers/state.json`, initialized once and retained with its initialization marker.
- Original final-verification state SHA256 still matches run-start evidence; original counters remain 14 initial / 1 repair / 15 total.
- Targeted matrix hash: `2395998088202a644a0e920771034c36cab38b4d13df28bd7c962f47f926e39d`. Both frozen matrices and guard/runner code match run-start hashes. All 17 approved fixture hashes remain unchanged.
- Original stored teapot source and mask were downloaded read-only and matched their original local bytes before any provider call. No new source or mask was generated/uploaded.
- QA V4/V5 stayed ON; production configuration V4/V5 stayed OFF and auto-repair disabled. No deployment or production activation occurred.
- Actual application route handlers ran in-process against QA, with the verification transport guard controlling initial and automatic-repair calls. Runtime operational orchestration is saved at `output/targeted-live.mts`; no product implementation changes were made during/after this run.
- No new browser pass or full test-suite rerun was performed. The separate browser follow-ups remain open. In these seven final job reads, result URLs were populated; the earlier null-URL observation was not reproduced by these reads and remains a separate follow-up.
- The live runner was stopped after accounting. No fixes or further live attempts follow this report. Production remains **NOT READY**.

## Evidence

`benchmark-results/targeted-vnext-blockers/` contains the durable state, start/end integrity evidence, per-scenario plans/results/job telemetry/versions, all seven selected PNGs, provider event log, scorecard, grounding provenance, location cache result, and reconciled accounting. The original full-matrix evidence remains intact.
