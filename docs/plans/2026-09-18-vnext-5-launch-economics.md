# Frozen VNext 5 launch economics

Policy is agreed and encoded; activation is not authorized. VNext 4 and VNext 5 remain disabled. No provider images, live judging, research, or final matrix execution were performed for this change.

## User credits

One requested output costs one credit, including generation, manual regeneration and editing. Grounding, validation and the server-selected automatic repair cost zero extra credits. Initial provider failures retain the existing refund behavior. Validation uncertainty, imperfect results and failed automatic repairs retain the original usable image and its single charge. There is no free-repair button.

## Repair budget and selection

`LAUNCH_ECONOMIC_POLICY` and `MAX_AUTO_REPAIR_ATTEMPTS_PER_REQUEST` fix the allowance at one repair for the entire request/session, including a series. Initial images are published before optional refinement. The coordinator waits for every initial child to be terminal, verifies signed assessments bound to owner/session/job, and selects one eligible child. The migration adds an owner-readable, non-owner-writable ledger with a unique session key; atomic claims serialize on the session. It retires the old per-job claim and carries forward previously consumed allowances. Completion, failure, retries and interrupted workers cannot replenish the budget.

Eligibility requires a repairable verdict, measurable evidence and confidence of at least 0.90 on every failed non-deterministic check. Rank locked identity/product/brand, exact text, outside-mask preservation, object count, grounded contradiction, then major composition instructions. Aesthetic preferences do not trigger repair. Ties retain the original result; an improvement must reduce hard failures without introducing unavailable evidence or invalid dimensions. A failed provider call, unavailable revalidation, storage failure or exhausted budget keeps the original. There is no second repair and no credit RPC on the deferred repair path.

The old `platform_absorbs_one` setting no longer enables repairs. The new policy identifier is `platform_absorbs_one_per_request`, and the validation feature gate must also be explicitly enabled. No environment flags were changed. The migration must be applied before any separately authorized activation; it has only been exercised in a disposable local database.

## Validation and grounding

Cheap dimensions, counts and reference checks run where relevant. OCR and visual judging are requested only for strict requirements: exact text, locks, preservation, masked changes, multiple entities, reference composition, strict counts and grounded requirements. A generic watercolor dragon uses no OCR or judge call. Masked edits check both the requested change and preservation outside the region.

Grounding is capped at three web queries, two visual queries and eight sources. Signed cached snapshots are reused unless refresh is explicitly requested. Search query costs use optional server configuration `GROUNDING_WEB_QUERY_COST_USD` and `GROUNDING_VISUAL_QUERY_COST_USD`; missing rates are recorded as unknown, not zero. Cache hits incur zero new search cost. Grounding cost is allocated to the first child to avoid counting it for every series image.

## Reporting and interface

Per-job usage records initial image cost, validation cost, grounding cost, repair image cost, repair validation cost, trigger, outcome and success. Unknown provider costs remain null. Request totals can aggregate children; grounding appears once. `generation_result_accepted` records a download as an acceptance proxy, and regeneration events include session/job identifiers for correlation. These are behavioral analytics, not a claim that downloading proves satisfaction. Initial `userAccepted`/`userRegenerated` fields are unknown until correlated with events.

The interface shows “Refining details…” during pending refinement and optionally “Some requested details may not be exact.” It keeps the original version in history and selects a successfully improved version when available.

## Verification boundary

Offline unit tests use mocked provider responses and tiny synthetic pixel buffers. Disposable PostgreSQL tests cover migration upgrade, RLS, consumed-budget preservation, terminal-child gating, failure persistence and concurrent claims for different series children. Typecheck, production build and changed-file lint are the final non-billable bar; unrelated repository-wide lint failures are outside scope.

`tests/image-evals/final/matrix.json` remains frozen and unexecuted: 14 scenarios, at most 18 initial images, at most one repair image. SHA-256: `d49ffa6119afb0d63b5040ab4106fbc2a7d9b14508dd85ea8d97111883621aa2`. Final live verification still requires separate explicit user activation.
