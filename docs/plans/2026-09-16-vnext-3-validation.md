# VNext 3 implementation and validation

Status: release gates complete. Owner visually scored the targeted mini-gate 9/9 PASS on generated images and waived `character-beach` as a documented provider false-positive (`req_58b1afdad04848a989350ed119fc3ec9`). Browser product workflow PASS; deleted-locked-reference UI race was not completed interactively (hosted refund smoke PASS). Automated bar: 708/708 tests, typecheck, production build, and VNext 1 live 11/11. Approved fixtures are frozen in commit `e93e792`. The hosted migration is applied.

## Implemented

- An 8-image Depikt product budget for entity jobs, including source and ad-hoc images; ad-hoc uploads remain capped at 4. The installed SDK and the [OpenAI schema](https://github.com/openai/openai-python/blob/main/src/openai/types/image_edit_params.py) document a 16-image provider ceiling.
- Private reference entities and assets, owner RLS, a composite owner foreign key, constrained storage paths, duplicate-primary protection, transaction-serialized limits (50 packs / 8 assets), and storage deletion scoped to entity assets.
- Authenticated, feature-flagged, rate-limited list/create/update/delete/upload APIs. The first character/product asset must be primary; the first brand asset must be its logo. The primary is removed last when deleting individual views.
- Deterministic role selection, per-entity allocation capped at 3, type-derived intent override, Sunburst routing, signed entity snapshots, deterministic preservation instructions, and entity context for series decomposition.
- Source → ad-hoc → entity image order. Malformed entity metadata and unavailable locked files fail with `entity_reference_unavailable` and refund. With entities attached, unavailable preceding inputs also fail: skipping them would invalidate image numbering. No-entity degradation remains unchanged.
- Session identity compares explicit metadata values and reference order; JSONB object-key reordering is ignored. Reference order is deliberately significant because preservation instructions bind identities to image positions.
- Account → References in both the account page and Account Hub, plus the Generate picker and locked chips. Entity ids survive submit, regenerate, edit again, and pending-auth resume. Analytics use only counts, type and role.

## Fixture corpus

15 fictional WebPs across two characters, two products and a brand. The directory, including a contact sheet and prompts, is approximately 1.2 MB. Images were authored with the repository's Sunburst API runner at high quality and compressed with cwebp quality 82. Brand images received an explicit pre-approval correction after the first logo view incorrectly depicted a product scene. Raw revisions and logs are retained separately; final brand views now use the same fictional beverage identity.

- Review: `tests/image-evals/vnext-3/fixtures/review.jpg`
- Pack descriptions: `tests/image-evals/vnext-3/fixtures/prompts.json`
- Exact image prompts: adjacent `*.webp.prompt.txt` files
- SHA-256 manifest: `tests/image-evals/vnext-3/manifest.json`
- Frozen candidate cases: `tests/image-evals/vnext-3/cases.json`

The owner explicitly approved the exact corpus in chat on 2026-09-16. Approval is recorded in the manifest and commit `e93e792`; all 17 existing hashes are unchanged. The authoring script refuses changes after approval; the live runner checks every recorded hash and refuses billable execution until approval is recorded. Tests and benchmarks never invoke the fixture generator.

## Verified

- Unit suite: 708/708 passed, including the frozen scene cases, ownership, token tampering, fail-closed metadata, image order, and independent refund handling.
- TypeScript source and test checks pass.
- Production build passes.
- Changed-file ESLint has no errors; the existing `pollSession` effect dependency warning remains in `use-generation.ts`.
- VNext 1 live intent → plan gate: 11/11 passed on 2026-09-16, with real provider calls.
- Migration applied twice in isolated PostgreSQL 16. Ownership, cross-owner foreign keys, case-insensitive name uniqueness, path constraints, the 50-pack limit, and scoped storage deletion passed. The test uses minimal Supabase auth/storage stubs; hosted integration also passed as described below.
- Fixture integrity check verifies 17 hashes (15 images, descriptions and cases).

## Hosted validation

Target: Depikt Supabase `cexsqtqcrbvhgzkhtgqo`. The migration is applied; the owner confirmed it was applied. No additional migration is needed.

- Hosted authenticated Storage API smoke: 8 PASS, with successful cleanup. Owner create/upload/download, valid ownership, duplicate-primary rejection, invalid owner rejection, scoped deletion and missing-file detection.
- Hosted rollback-only SQL smoke: own entity creation/read, foreign-user read/update exclusion and cross-owner foreign-key rejection PASS. Real Storage API calls verify deletion; direct SQL deletion is blocked by Supabase and was not bypassed.
- Baseline and post-smoke: 45 existing image versions and 83 generation bucket assets. No existing generated images/references removed.
- Local application routes against hosted Supabase: character, product and brand creation, primary/secondary upload, rename, description, signed previews, delete/re-add and cleanup PASS (7 checks). This is API validation, not browser validation.
- Missing-reference lifecycle through local application routes and hosted DB: signed job reserves one credit, deletion of its locked pack makes execution fail without output, and credit balance returns to its original value (4 PASS checks). The failed smoke job/credit ledger is retained as audit evidence; its temporary pack/assets were removed. Evidence: `benchmark-results/vnext-3-refund-smoke.json`.
- Evidence: `benchmark-results/vnext-3-hosted-smoke.json`, `benchmark-results/vnext-3-api-smoke.json`; repeatable scripts in `scripts/` and hosted SQL in `tests/sql/reference-entities-hosted-smoke.sql`.

## Fixes found during validation

- Private storage can serve a cached asset after deletion. Locked entity downloads now include a per-job cache nonce so a later job cannot reuse a deleted reference from an earlier job's cache.
- Refresh previously lost the in-memory regeneration inputs. Owner-bound, expiring session persistence now retains entity IDs, source/mask and ad-hoc paths for regeneration/edit after refresh. Unit coverage passes; the browser workflow still needs verification.
- Reference management previously consumed the public generation 10/minute budget. An ordinary multi-view editing workflow hit 429. It now has a separate authenticated 60/minute per-owner budget; generation limits remain unchanged. The route smoke passes with cleanup after this fix.

## Live visual validation

Run: `benchmark-results/vnext-3-2026-09-16T20-05-27.006Z`. Approved hashes checked before execution. The frozen 20 cases plus a four-child brand series and the requested two-characters/one-product café stress case target 25 outputs. Three cases run concurrently; resume retains completed images and failed requests without retrying them.

The initial sandbox-only attempt failed network access and produced no images; the network-enabled run above is the release evidence. Visual scores are recorded separately in `scores.json` while the runner writes `results.json`. Scoring uses only PASS / SOFT FAIL / FAIL. The completed run produced 23 images and two provider rejections, and exited 1 because of those failures. All 25 planned outputs/cases have explicit visual or execution verdicts: **16 PASS, 7 SOFT FAIL, 2 FAIL**. Scores are also copied into `results.json`. A browsable local gallery is at `benchmark-results/vnext-3-2026-09-16T20-05-27.006Z/review.html`. That baseline is preserved; the 2026-09-17 targeted mini-gate is the current visual quality evidence.

Provider rejected `character-beach` and `two-characters-beach` with a sexual-content safety classification despite the benign fictional-person scene prompts. Both are FAIL for execution; no image exists to judge identity. Frozen prompts were not altered or retried. The pool product image also drops the circle around the lemon mark (SOFT FAIL for label fidelity). These results do not clear the proposed merge rule.

### Scenario verdicts

| Scenario | Verdict | Evidence |
| --- | --- | --- |
| Single character ×4 | FAIL | Three identity PASS outputs; beach request rejected, no output. |
| Single product ×4 | SOFT FAIL | Three PASS; pool image loses the circle around the lemon logo. Does not meet the requested single-product PASS gate. |
| Character + product ×4 | SOFT FAIL | Identity/product preserved; café has minor tiny label text distortion; other three PASS. |
| Two characters ×2 | FAIL | Café preserves both distinct identities; beach request rejected. |
| Two products | PASS | Both geometries, labels and caps remain distinct; no swapping. |
| Brand ads ×4 | PASS | Logo, palette, typography and product system coherent across all four scenes. |
| Four-child brand series | SOFT FAIL | All four retain recognizable brand identity but render unrequested scene-name text and simplify bottle labels. |
| No entities | PASS | Flare generate, zero references, expected casual natural-light image. |
| Two characters + product | SOFT FAIL | Core lock behavior PASS: 3/3/2 references, distinct Maya/Sofia, Maya holds correct VELORA. Minor tiny label text distortion. |

The brand-series intent incorrectly includes studio/beach/pool/city-at-night as `exact_text`. Child prompts carry these scene names as text to render, and append all variants' exact text to every child. This is a concrete intent/decomposer follow-up; approved fixture inputs were not changed to hide it. The benchmark uses the real intent, resolver, preamble, routing, decomposer and image-provider modules, but does not replace the authenticated browser/job/UI gate.

## Remaining release gates

Closed. Remaining work is the VNext 3 PR.

## Commands

```sh
npm test
npm run typecheck
npm run build
bash scripts/test-reference-entities-migration.sh
node tests/eval/vnext-3-live.ts --check
npm run test:vnext-1-live
# Explicit billable quality gate (fixture approval recorded):
npm run test:vnext-3-live
```

## Narrow release-defect follow-up — 2026-09-17

**Still not merge-ready.** Deterministic fixes and local checks are complete; the new live and browser gates remain unvalidated.

### Baseline preservation and rejection investigation

The original `vnext-3-2026-09-16T20-05-27.006Z` directory remains byte-for-byte unchanged, including images, results, scores and gallery. SHA-256 receipts are in `benchmark-results/vnext-3-baseline-audit/sha256.txt`; the live runner rejects resuming into that baseline. All 17 frozen corpus hashes still pass. No fixtures or benchmark prompts were edited.

`benchmark-results/vnext-3-baseline-audit/provider-comparison.json` compares the three passing café/city requests and the two rejected beach requests. Passing payloads are recorded evidence. The old runner stored only an error for failed requests, so their effective prompts and reference order are explicitly **reconstructed**, not presented as captured payloads. Their original analyzed intents cannot be recovered. For these non-series cases, the runner sends only the deterministic preamble plus the frozen prompt; analyzed exact text is not appended to the image request.

- `character-beach`: `req_a953a34633d244cf97d4ac7ccd61ef9c`, sexual-content rejection.
- `two-characters-beach`: `req_9399e4e0f8eb47659f9643f893d8a990`, sexual-content rejection.
- The café/city and beach requests use the same identity descriptions and primary → three-quarter → full-body reference order (Maya first, then Sofia when present). The preamble preserves facial structure, age appearance, hair and defining features, and permits clothing/pose/expression/environment/lighting changes. It introduces no body-proportion instruction. “Full-body” and “beach” come from the frozen user prompts. The character+product beach case also passed with that wording in the baseline.
- This does not establish a preamble cause. Character wording remains unchanged; no safety-filter circumvention or easier substitute scene was introduced.

### Changes

- Added deterministic `exact_text` evidence filtering before series decomposition, without changing the Intent schema. Copy cues must apply to the actual phrase, so a headline elsewhere in the sentence cannot authorize scene names as text. Quoted scene names alone do not become copy.
- Scoped numbered/ordinal and scene-qualified copy per child, retained shared copy, and removed other children's literal copy from generated/fallback briefs. Added decomposition instructions distinguishing scene metadata from renderable copy. Existing product/logo text remains preserved.
- Strengthened generic product locks to include enclosing mark shapes, symbols, typography placement, illustrations and proportions, and forbid simplifying/substituting/redesigning marks. Brand locks explicitly forbid redrawing supplied logo geometry. Environmental variation remains allowed.
- Added `--cases` filtering to the live runner. It now captures effective prompts, preambles, intents, selected roles, image order/hashes, provider parameters and response request IDs/status, including failed image requests. It never records API credentials.
- Regressions cover four scenes without copy, a shared headline, child-specific copy, mixed headline/scene lists, scene-qualified copy, and leakage in model responses/outage fallbacks.

### Validation and blocked gates

- `npm test`: **708/708 PASS**.
- `npm run typecheck`: **PASS**.
- `npm run build`: **PASS**.
- Changed-file ESLint: **PASS**.
- Frozen corpus hashes and original baseline checksums: **PASS**.
- Targeted live attempt: `benchmark-results/vnext-3-2026-09-17T19-32-38.408Z`. All seven selected cases stopped at Intent network access, before any image generation. This is infrastructure evidence, not a quality scorecard.
- Automatic approval review rejected the network-enabled retry because it requires sending fixture images/prompts to OpenAI with credentials and the reviewer did not recognize explicit external-transfer authorization. Explicit authorization was requested. VNext 1 live tests were not rerun while that authorization remained pending.
- Chrome runtime reported `Browser is not available: chrome`; discovery returned `[]`. Connect Chrome through Settings → Computer use. No browser workflow is claimed validated, and the gate is not waived.

After authorization, run this **10-output** mini-gate (the requested nine outputs plus the separately requested two-product regression):

```sh
npm run test:vnext-3-live -- --cases character-beach,two-characters-beach,product-pool,character-product-cafe,two-characters-one-product-cafe,two-products-studio,brand-series-four
npm run test:vnext-1-live
```

Visually score the new outputs against the existing gates before running the full browser checklist above. No new live PASS, PR approval, deployment or merge is claimed.


## Authorized targeted mini-gate — 2026-09-17 (2026-09-18 UTC)

The user explicitly authorized sending the approved frozen fictional fixture images, frozen prompts, entity descriptions, selected references and generated child prompts to OpenAI using configured credentials. This supersedes the earlier pending-authorization blocker. No full rerun, fixture regeneration, safety-oriented prompt rewrite or additional image retry was performed.

Executed exactly:

```sh
npm run test:vnext-3-live -- --cases character-beach,two-characters-beach,product-pool,character-product-cafe,two-characters-one-product-cafe,two-products-studio,brand-series-four
npm run test:vnext-1-live
```

Run: `benchmark-results/vnext-3-2026-09-18T01-47-53.760Z`.

**Execution result: 10 image requests, 9 images saved, 1 provider rejection.** The VNext 3 runner exited 1, correctly retaining the failure. These are execution results, not visual quality scores.

| Target | Execution | Visual review |
| --- | --- | --- |
| character-beach | FAIL — HTTP 400 sexual-content safety rejection | No image; waived as provider false-positive |
| two-characters-beach | SUCCESS — HTTP 200 | **PASS** — both identities distinct; no merging |
| product-pool | SUCCESS — HTTP 200 | **PASS** — lemon enclosing circle restored; geometry/cap/label hold |
| character-product-cafe | SUCCESS — HTTP 200 | **PASS** — character identity strong; VELORA mark/layout correct |
| two-characters-one-product-cafe | SUCCESS — HTTP 200, 8 references | **PASS** — distinct people; product with intended character |
| two-products-studio | SUCCESS — HTTP 200 | **PASS** — VELORA and NEMORI remain distinct |
| brand-series-four ×4 | All four SUCCESS — HTTP 200 | **PASS** — no scene-name typography; brand identity holds |

The repeated `character-beach` rejection has request ID `req_58b1afdad04848a989350ed119fc3ec9`. Its complete effective prompt, preamble, entities, reference roles, ordering/hashes, provider parameters and HTTP status/request ID are saved in `character-beach-1.request.json`. The frozen prompt and generic character preamble were not changed.

**Owner visual scores (2026-09-17):** generated outputs **9/9 PASS**. Execution **9/10**. The two targeted defects — product-mark enclosing circle and series scene-name contamination — are closed. Multi-entity lock (two characters + one product, 8 references) PASS.

**`character-beach` waiver:** classified as a known provider false-positive / nondeterministic safety rejection, not a VNext 3 identity-lock defect. Frozen prompt unmodified. No retry gaming. Related character scenarios, including the harder two-character beach case, succeeded. Do not add euphemisms, moderation-evasion retries, or beach-specific handling.

**VNext 1: 11/11 live intent → plan cases PASS**, no skips. Log: `vnext-1-live.log` in the run directory.

### Review artifacts

- `review.html`, `contact-sheet.jpg`, `results.json`, ten `*.request.json` files
- `user-scores.json`: owner verdicts recorded from the targeted contact-sheet review
- `execution-summary.json`: request/output counts and artifact audit results
- `run-metadata.json`: authorization scope and source hashes
- `browser-gate.md`: interactive product-workflow evidence

### Integrity

- All 17 frozen corpus hashes pass after execution.
- Every file in the original 16 PASS / 7 SOFT FAIL / 2 FAIL baseline matches its pre-change checksum.
- All ten image requests have captured prompts, roles, reference ordering and matching image hashes, model/size/quality parameters, request IDs and response statuses.

## Owner visual scoring — 2026-09-17

The owner reviewed the actual targeted contact sheet. Generated images **9/9 PASS**. This is a substantial improvement over the original **16 PASS / 7 SOFT FAIL / 2 FAIL** baseline. The strengthened generic product-lock wording and exact-text sanitization/scoping are validated. No further `character-beach` retries are authorized.

## Browser product workflow — 2026-09-17

Driver: Cursor host-native browser against `http://127.0.0.1:8080`. Account: `depikt-dev-qa@example.com`. Evidence: `benchmark-results/vnext-3-2026-09-18T01-47-53.760Z/browser-gate.md` and `benchmark-results/vnext-3-browser-gate/series-*.png`.

| Check | Result |
| --- | --- |
| Account → References CRUD (character/product/brand, roles, edit, primary-removal rule, signed previews) | **PASS** |
| Generate attach chips, `n/8` budget, mixed packs, 4-pack cap | **PASS** |
| Chips survive submission as plan `entityIds` / `entityResume` (idle-only picker unmounts chips after submit) | **PASS** |
| Regenerate / Edit again / refresh resume keep packs | **PASS** |
| Pending-auth resume keeps packs | **PASS** |
| VNext 2 precision mask + locked entities; source remains image `[0]` | **PASS** |
| Entity-backed 4-image brand series; identity consistent; no scene-name text | **PASS** |
| No-entity ordinary Generate on Flare | **PASS** |
| Create job with locked pack, delete required entity, execution fails, credit refunded | **NOT RUN** interactively (automation reviewer blocked mid-job deletion). Hosted route smoke **PASS**: `benchmark-results/vnext-3-refund-smoke.json` |

Interactive product workflow: **PASS**. The deleted-locked-reference UI race remains unproven in the browser; fail-closed refund is evidenced by hosted application-route smoke, not waived as a visual defect.

## Release-gate scoreboard

| Gate | Status |
| --- | --- |
| Architecture | PASS |
| Hosted migration/security | PASS |
| Fixture corpus | PASS |
| Product fidelity fix | PASS |
| Series text fix | PASS |
| Single character visual consistency | PASS where provider executes |
| Multi-character | PASS |
| Multi-product | PASS |
| Character + product | PASS |
| Brand consistency | PASS |
| No-entity regression | PASS |
| Provider execution | known one-case false-positive (`req_58b1afdad04848a989350ed119fc3ec9`) |
| Browser product workflow | PASS |
| Deleted-locked-reference UI race | NOT RUN; hosted refund smoke PASS |
| Automated bar | PASS — 708/708, typecheck, build, VNext 1 live 11/11 |
