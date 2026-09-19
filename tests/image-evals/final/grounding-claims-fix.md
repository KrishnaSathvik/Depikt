# Grounding → validation claim boundary

Implemented after the targeted blocker run. No live verification performed for this change.

New grounding bundles carry `contextFacts`, `visualReferences`, and `validationClaims`. Context excerpts remain available to generation, but the brief explicitly treats them as background rather than mandatory output content. The deterministic claim compiler takes the actual user request, literal user-backed intent spans, and selected evidence. Requirement strings come only from the request; retrieval supplies provenance, never independent requirements. V5 recompiles at the boundary so persisted or legacy excerpts cannot independently authorize checks.

Claims record `origin: "user"`, selected source IDs, and visual checkability. Retrieval-origin claims and missing source IDs are schema errors. Empty, unrelated, research-only, and nonvisual claims create no grounding check, rather than an unavailable/failing check. Hidden component counts are retained as user-origin audit claims when explicitly requested, but are not claimed to be verifiable from a photograph. Existing non-grounding validation behavior is unchanged.

Official/current requests require authoritative support before grounding checks become visually checkable. Missing authority is recorded as `official evidence unavailable`; it does not create a check or trigger repair. Source preference remains official documentation/product → institutional → secondary → community. Trusted government/academic namespace recognition now includes UK/Australian government, Australian education, UK academic, NZ government and Canadian government namespaces. Commercial first-party classification still requires trusted provider/configuration rules; page titles saying “official” confer no authority.

New cache namespaces prevent reuse of pre-compiler/source-classification entries. Existing signed legacy `facts` snapshots remain readable without rewriting their seals, histories, or database schema.

## Non-paid verification

- **815/815 unit tests pass**, including incidental craft counts/attribution, incidental and explicitly requested fireworks, explicit 22-part fidelity, generic camera examples, empty/irrelevant context, authority absence, claim tampering, legacy signatures, cache reuse, trusted source classification and the new 2/1/3 guard profile.
- Typecheck, production build, changed-file lint, and `git diff --check`: pass. Build reports dependency bundler warnings but exits successfully.
- Disposable local PostgreSQL DB/RLS/concurrent repair checks: pass. The sandbox initially blocked PostgreSQL shared memory; the same local-only check passed with approved execution outside that restriction. No QA/production migrations were run.
- Original and targeted frozen matrices retain their hashes. All 17 approved reference fixture hashes match.
- Production: V4 OFF, V5 OFF, repair disabled. QA development configuration: V4 ON, V5 ON, one platform-funded repair per request; verification guard supplies the stricter global cap.
- Original final state remains 14 initial + 1 repair = 15. Targeted state remains 7 initial + 0 repair = 7. Neither state was modified/reset.
- **0 paid image calls, 0 live search/validation calls** in this task. No deployment or browser follow-up changes.

Logs, integrity evidence, and offline compilation of the previous run's recorded sources: `output/grounding-claims/`.

## Recorded-evidence result and limits

Offline compilation of the failed targeted run produces a single user-derived compact stock-style Mun lander claim, without 122/22-part or author requirements. The location request produces its user-derived viewpoint/landmark claim, no fireworks requirement, and `official evidence unavailable` because the recorded selected sources were classified community. That claim is retained for audit but omitted from mandatory V5 checks.

This is a conservative deterministic compiler: it does not infer new paraphrased obligations from ambiguous research language. Source matching establishes topical provenance, not proof of recency or hidden mechanics. A missing-authority omission must remain documented in the live scorecard; omission alone does not prove current factual fidelity or clear the release gate.

## Prepared gate — authorization pending

Only `game-grounding` and `location-grounding`, unchanged from the frozen targeted matrix, are in `grounding-matrix.json`.

- Run ID: `final-grounding-claims-2026-09`
- State: `benchmark-results/final-grounding-claims/state.json`
- Guard profile: `grounding`
- Budget: **2 initial attempts, ≤1 automatic repair globally, ≤3 total provider image attempts**. Failed/rejected attempts consume slots; no retries or extra images.
- Grounding: ≤3 web queries, ≤2 visual queries, ≤8 sources per scenario. Cache verification cannot search or generate an image.
- Expected user charge if both requested outputs succeed: 2 credits. Grounding/validation/automatic repair add no user credits.
- Read-only QA balance refresh and production-OFF check before initialization. Preserve both prior verification states.
- Prepared operational runner: `output/grounding-live.mts` (syntax checked, not executed); it uses the existing verification transport and the new isolated guard profile.
- New live state has **not** been initialized. After authorized execution: score both outputs, report authority limitations, validations, repair/search/image/credit accounting, then stop without fixes, reruns or deployment.

Matrix SHA-256: `9f2379b3a28f9ff9e2536018abd2604531e2c3e707e788dd32be8cda8d7a5bc7`.
