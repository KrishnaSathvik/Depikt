# V4 authority retrieval hardening

Non-paid implementation complete. No live searches, image generation, deployment, or production activation performed. The claim compiler and V5 validation contract/engine are byte-for-byte unchanged from the final grounding gate.

## Changes

- Explicit authority/current requests use compact subject queries instead of the complete rendering prompt. Ordinary grounding retains its existing queries.
- If the first web response lacks relevant authoritative evidence, one site-scoped authority query runs within the existing **3 web / 2 visual / 8 selected source** ceilings. It consumes an existing slot, never increases the cap. Duplicate planned/fallback web queries are not repeated.
- Trusted configured subject/domain bindings target official company/product/project documentation, institutions, tourism authorities, or standards bodies. Without a trusted binding, fallback searches controlled government namespaces; it never guesses that a brand-looking domain is official. No Sydney/KSP-specific query or classification rules were added.
- The second visual-search slot can target authority when the first visual response lacks it. Source categories are handled separately: authoritative web context does not imply that authoritative visual references exist.
- Source order remains official documentation/product → institutional → reputable secondary → community. Community context is excluded when better context is available; authority-request visual selection now likewise excludes community when better visual sources exist. Community visuals can still be used when no better visuals are available.
- Domain classification recognizes more controlled government/academic namespaces and an explicit small institutional registry (standards, heritage, museum). `.org`, arbitrary `.com`, words in page titles, and hostname substrings do not confer authority. Trusted operator overrides can explicitly downgrade community subdomains.
- Removed the blanket past-week publication filter for requests saying “current.” It excluded evergreen official reference pages; a page's publication age is not the same as the depicted subject's current appearance. No claim of recency is inferred from retrieval alone.
- Signed bundles record the authority request, fallback query when used, and whether authoritative web/visual evidence was found. The existing user-origin claim compiler still determines V5 claims. Retrieval never creates an obligation.
- Cache namespaces changed to avoid reusing earlier community-only acquisition results. Legacy signed snapshots remain readable. Cache-hit checks make no searches.

## Trusted domain configuration

`GROUNDING_SOURCE_RULES_JSON` remains a trusted server setting. Optional `subjects` aliases let the fallback target a known source for a named subject. For example (illustrative domains only):

```json
[
  {"host":"acme.example.com","quality":"official_product","subjects":["Acme camera"]},
  {"host":"docs.project.example.com","quality":"official_documentation","subjects":["Example game"]},
  {"host":"tourism.example.com","quality":"institutional","subjects":["Example region"]},
  {"host":"reviews.example.com","quality":"secondary","subjects":["Acme camera"]},
  {"host":"forum.acme.example.com","quality":"community"}
]
```

These must represent verified ownership/classification. Unknown commercial/museum/tourism domains remain community until a trusted rule/provider establishes their authority. This pass did not change environment credentials, domain-rule configuration, or production flags. No live retrieval result is promised by mocked regression coverage.

Authority and recency remain different: an authoritative page is better evidence, but neither retrieval time nor removal of a publication filter proves current appearance. The micro-gate must assess whether selected evidence actually supports the requested viewpoint/current fidelity. Missing authority must remain documented rather than hidden by omitted validation checks.

## Non-paid verification

- **826/826 tests pass** (10 new authority acquisition/classification regressions and one location-only budget-profile regression).
- `npm run typecheck`: pass.
- `npm run build`: pass; dependency bundler warnings remain non-fatal.
- Changed-file ESLint and `git diff --check`: pass.
- Disposable local PostgreSQL DB/RLS/concurrent repair checks: pass. No hosted database migrations or changes.
- Claim compiler, V5 contract/engine, all three historical verification states, and all three historical frozen matrices match the before-change hashes.
- All **17** approved reference fixture hashes match.
- Production V4/V5 **OFF**, repair disabled. QA development V4/V5 **ON**.
- **0 paid image calls; 0 live grounding/search/validation calls**.

Evidence and check logs: `output/authority-retrieval/`.

## Location micro-gate prepared, not executed

- Scenario: **location-grounding only**, exact unchanged scenario record from the previous frozen grounding matrix. No game/KSP rerun.
- Matrix: `tests/image-evals/final/location-authority-matrix.json`.
- SHA-256: `c1d9115d031200f114a1b21bd73090e3c750cc3147e4217d37ba104c5b7c24f1`.
- Run ID: `final-location-authority-2026-09`.
- State: `benchmark-results/final-location-authority/state.json`.
- Guard profile: `authority`.
- Limits: **1 requested image attempt + ≤1 automatic repair = ≤2 total provider image attempts**. Failure/rejection consumes its slot; no retries, altered prompts, new seeds or extra scenarios.
- Grounding: ≤3 web, ≤2 visual, ≤8 selected sources. Cache check blocks any search/image generation.
- Expected user charge on requested-image success: **1 credit**; no extra grounding/validation/repair credits.
- Read-only QA balance refresh and flags/fixture/matrix/prior-state verification before one-time initialization. All three prior states preserved.
- Prepared operational runner: `output/location-authority-live.mts`; syntax checked but **not executed**. New state and initialization marker do not exist.
- After execution: report source authority/provenance, actual queries, claims, image/validation/repair result, remaining recency limitations, cache and credits, then stop without fixes or reruns.

Live execution awaits explicit authorization. Production remains NOT READY pending this gate or a documented product decision about unavailable authority/current evidence.
