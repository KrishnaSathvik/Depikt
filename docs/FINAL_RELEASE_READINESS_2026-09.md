# Final non-paid release readiness — September 24, 2026

Superseded for release status by `docs/FINAL_RELEASE_CERTIFICATION_2026-09.md`: **READY FOR RELEASE — NOT DEPLOYED**, with hosted schema/RLS/storage verified through Lovable. This document remains the September 24 local-readiness record. Its browser-blocked and hosted-NOT-VERIFIED lines are historical.

Code changes and local verification are complete for this pass. This is not a release authorization. Nothing was deployed, published, activated, or live-generated. Earlier readiness verdicts in the audit/cleanup documents describe earlier, narrower scopes and are superseded by the certification report.

## 1. Revision and working tree

- Branch: `main`.
- Starting/current HEAD: `4bc4e7482ac0cf03957e4f504198836bb065fcad`.
- Started with a clean working tree. The reviewed deliverable is the **uncommitted working-tree diff**, including this document and new regression tests/helpers, not HEAD alone.
- No commit, push, fetch, deployment, migration, account mutation, or production configuration change was performed. Remote equality was not rechecked.
- Local evidence: `output/final-release/` (ignored). Tests and compiled-control verification scripts are in the repository.

## 2. Deferred findings and disposition

| Finding | Disposition |
| --- | --- |
| F19 Gallery metadata/search | All 199 local assets visually reviewed using contact sheets; deterministic human titles, subject descriptions, and search terms in `src/data/gallery-metadata.ts`. UUIDs remain internal. Catalogue tests cover portrait, product, poster, UI, character, automotive, editorial, matcha, dashboard, and cat. |
| F20 legacy routes/404 | Direct permanent redirects with query preservation; trailing-slash variants no longer add a normalization hop. Real 404, intentional title/description/social copy, noindex, Home recovery, no application JSON-LD on unknown pages. |
| F21 series | Group by session ID across loaded pages and interleaving; deduplicate pagination rows, sort by child index, retain singleton series and child labels. Neutral Series heading plus loaded image count. Read-only details expose persisted failed/pending/deleted-output states. |
| F21 retry | Failed-child-only execution is not implemented: existing submission creates a new plan/request and reserves its outputs. UI says “Start a new attempt”; saved details explain that this does not resume a failed child. No provider-economics change. |
| F22 image recovery | Shared fallback replaces broken browser icons across primary result, Account, Library, Gallery-related cards, references, and edit previews. Account/result/series/reference images attempt one existing authenticated read to refresh a URL. Gallery lightbox retains its existing SampleImage fallback. No generation retry or refresh loop. |
| F22 editing | Canvas is focusable and linked to pointer/touch instructions. Whole image is the keyboard/screen-reader path. Brush/Erase expose selection; range, Undo, Clear, and Cancel remain native keyboard controls. Full keyboard painting intentionally not introduced. |
| F23 stale paths | Removed unreachable HomeGenerateDemo after repository import search. PromptCard remains reachable from FavoritesTab. ImagoPasteHint remains conditional on explicit Imago selection. Historical examples remain test fixtures. Updated conflicting CLAUDE architecture notes and stale manifest description; Library now includes Footer. |
| F24 Account | Direct Profile settings and Sign out on `/account`; avatar focuses visible controls. Account-origin settings/detail dialogs have no redundant Account-home stack beneath them. |
| F25 lint | Semantic issues fixed first (11 unnecessary escapes and one mutable declaration). Formatting restricted to lint-reported source/scripts/tests. Full lint passes with 14 existing Fast Refresh warnings, zero errors. |
| F26 status/edge states | Grounded still requires real sources; Validated requires persisted pass and no unavailable checks. Refinement is attempt-neutral. Unavailable checks and unsuccessful repair explain review/original retention. Temporal uncertainty wording retained. |
| Release controls | Fixed grounding image retrieval bypasses in initial execution **and repair input loading**: stored snapshots cannot fetch grounding images while grounding is disabled. Production settings unchanged. |
| Observability | Added content-free structured stage/outcome logs and OCR counts alongside existing persisted economics/validation and client analytics. |

## 3. Routes and Home

Compiled Worker checks cover `/gallery` → `/library?tab=gallery`, `/templates` → `/library?tab=templates`, `/critique` → `/?mode=critique#create`, `/generate` → `/?mode=generate#create`, and `/prompt` → Home with supported mode/prefill parameters. Trailing-slash Gallery/Templates variants are direct 301s. Supported historical links remain.

Home retains Generate, Improve prompt, and Critique in the shared creator. No separate old Generate architecture was restored. Generation feature flags and auth/credit gates retain their existing behavior. Home SSR has one H1. The disabled-generation and zero-credit tests remain in the full suite; no submit was sent to a real service.

## 4. Library, Account, and references

Prompts/Templates/Gallery filtering and collection-reset tests pass. Gallery search uses reviewed visual content rather than filenames. Empty search/favorites states explain changing tabs or clearing filters. Public catalogue fetch failure now falls back to checked-in public records without caching that outage fallback; private prompts never enter that cache.

Account settings, credits, Sign out, Creations, and Reference Packs remain available in their intended surfaces. Two-owner cache isolation and late-response rejection regressions pass. Deleted/unavailable creation detail gives a recovery action instead of presenting the stale creation as current. Empty Creations and Reference Packs retain their explanatory copy and creation paths.

Private image refresh uses existing **read-only Account detail** and reference-list endpoints, not generation-session polling endpoints (which can settle credits). The refreshed URL is discarded if the owner/revision changes. Static failures show a fallback; reopening retries naturally. Missing completed-result URLs no longer leave an indefinite loading animation.

## 5. Editing and series

Supported accessible editing path: focus Whole image with Tab, activate it with Enter/Space, enter change/preserve instructions in the labelled textarea, then use Apply or Cancel. Select area requires pointer/touch painting. Its canvas has a focus indicator and described instructions; Brush, Erase, brush size, Undo, Clear, and Cancel are keyboard operable. This is not a claim of keyboard mask drawing support.

Saved series grouping uses all currently loaded rows, never adjacency. Pagination appends join the same session group. Grid counts describe loaded saved images; the explanatory note avoids implying all outputs are already loaded. Opening an output reads the session's persisted job states and indicates failed/pending children and completed jobs without a saved image. Existing version buttons open saved individual outputs. Failed-child retry is explicitly outside the current execution contract; starting another attempt is a new request.

## 6. Error and status states

| State | Local evidence / behavior |
| --- | --- |
| Empty Library/favorites | Scoped search/filter tests; clear-filter/change-tab guidance |
| Empty Account/Creations/references | Existing source review and tests; descriptive empty copy |
| Deleted creation or expired auth | Owner-scoped detail 401/403/404 recovery; existing auth gate tests |
| Expired/broken/missing image | Bounded refresh helper tests, fallback SSR, source wiring; no live storage |
| Missing source/reference | Existing image-input, edit-mask, reference ownership and stale-source tests |
| Insufficient credits | Existing preflight/server credit and refund tests; purchase/retry path retained |
| Generation disabled | Actual compiled Worker returns 404 before auth; client gate tests |
| Provider/grounding unavailable | Existing mocked pipeline failures/refunds; safe research retry message |
| Empty grounding sources | No Grounded badge; result-status regression tests |
| Validation unavailable | Review guidance without Validated badge |
| Failed/non-improving repair | Original-retained copy; no false “Refined automatically” badge |
| Partial series | Interleaved grouping tests, saved failed/missing-child tests, series SSR tests |
| Unknown route | Compiled SSR 404, noindex, recovery action |

No new user-facing V4/V5 labels, verdict enums, confidence values, validation claims, or raw grounding JSON were added. Internal telemetry may retain outcome enums for diagnosis.

## 7. SEO and machine surfaces

Local compiled sweep: **48 route variants**, including **36 sitemap URLs** and all 26 articles. Successful HTML pages have title, description, OG image, Twitter card, and parseable JSON-LD. Public route canonicals match Home/Library destinations; private Account is noindex. Unknown routes are 404/noindex with intentional metadata. Articles retain deterministic social-image fallback.

`robots.txt` is served by its route and references the canonical sitemap; API and Account paths are excluded. `llms.txt`, manifest, and icon assets are checked from the built static directory (the raw Worker import does not emulate Cloudflare's ASSETS binding). Manifest now describes Home creation and Library discovery. Legacy Build wording in historical articles and intentional internal identifiers is retained.

This sweep uses local mocked public catalogue reads; it is not a production crawl or live data test.

## 8. Accessibility and responsive certification — BLOCKED

Requested: 390×844, 768×1024, 1200×760, 1440×900 across Home's three modes, Library's three tabs, Pricing, Help, auth, Account, Creations/details, references, editing, series, and touched dialogs.

**Not rerun in this session.** Browser skill setup succeeded, selection returned “No browser is available,” and documented discovery returned an empty list. Prior-session screenshots are historical evidence only and are not counted as certification of this diff.

Source/SSR checks establish labelled controls, unrestricted viewport zoom, one primary H1, retained Radix dialog behavior, visible canvas focus, and the Whole image alternative. Fresh visual overflow, contrast, touch targets, focus trapping/restoration, and interactive image recovery still require the connected-browser pass. This is a release blocker.

## 9. Performance

Production build output (decimal KB; gzip as reported by Vite):

| Chunk | Minified KB | Gzip KB |
| --- | ---: | ---: |
| Main JS | 693.27 | 217.18 |
| Home route | 86.48 | 24.90 |
| Library route | 23.36 | 7.75 |
| Account route | 3.73 | 1.68 |
| Lazy AccountHub | 15.13 | 5.50 |
| Lazy AccountMenu | 1.05 | 0.65 |
| Lazy curated catalogue | 701.25 | 236.16 |
| Lazy avatar machinery | 876.22 | 301.50 |
| Styles | 115.21 | 19.36 |

Main gzip is approximately **2.7% above the 211.45 KB cleanup baseline**, principally from the 199 reviewed metadata records and shared image recovery/status behavior. The large catalogue and avatar machinery remain lazy. No arbitrary bundle-size rewrite was attempted. Normal dependency-directive and lazy-chunk-size build warnings remain nonfatal.

## 10. Telemetry

`src/lib/generation/telemetry.ts` emits a whitelist of IDs, operation, series flag, counts, durations, booleans, and outcomes to Worker logs. Unknown fields are dropped; logger errors cannot fail generation. No prompts, image bytes, source URLs, credentials, or raw provider errors are added for analytics.

- Generation requested/completed: job/session, generate/edit/regenerate, series/single, outcome, image latency (including failed provider attempts), validation duration, execution duration, provider-attempt count.
- Planning/grounding completion: needed/executed, planning/grounding duration, web/visual query counts, source count, cache hit, authority availability, temporal limitation, disabled/unavailable outcome.
- Validation completion: persisted verdict or unavailable, duration, OCR call count; provider telemetry also remains persisted.
- Repair: existing durable request cap and persisted trigger/outcome/cost; content-free completion/cap events, original retention, platform funding, attempt count.
- Credits: charge/refund settlement events plus authoritative existing credit ledger. Deduplicate operational events by job/session and outcome; logs are not a replacement financial ledger.

Planning and job execution are separate requests; their durations are stage measurements, not a new joined end-to-end tracing service. Existing browser analytics retain requested/succeeded/failed behavior. Hosted log ingestion/retention is not verified here.

## 11. Configuration inventory and kill switches

Read-only local inventory is in `output/final-release/env-presence.json`; values of secrets were never printed.

| Setting | Local production configuration / requirement |
| --- | --- |
| `VITE_GENERATION_ENABLED` | Existing `true`, unchanged (compiled client availability) |
| `GENERATION_ENABLED` | Not declared in committed Worker vars; runtime `false` overrides compiled availability |
| `GROUNDING_ENABLED` | `false` in production env and Worker vars, unchanged |
| `VALIDATION_REPAIR_ENABLED` | `false` in production env and Worker vars, unchanged |
| `AUTO_REPAIR_POLICY` | `disabled` in production env and Worker vars, unchanged |
| Query/source/repair caps | Frozen policy: 3 web, 2 visual, 8 sources, 1 automatic repair per request |
| Credits | 1 per requested image; grounding/validation/included repair add 0 credits |
| Refund | Failed initial image finalizes refunded; successful image charged once; automatic repair does not reserve/refund another user credit |
| Image provider | `OPENAI_API_KEY` present locally; hosted presence unverified |
| Search provider | `BRAVE_SEARCH_API_KEY` present locally; optional gateway URL/token not declared locally; hosted presence unverified |
| Validation/OCR | Existing OpenAI fallback uses local OpenAI key; optional validation gateway URL/token not declared locally; hosted presence unverified |
| Signing/HMAC | `GENERATION_PLAN_SECRET` present locally; hosted presence unverified |
| DB/storage | Supabase URL/publishable configuration present locally; service-role key not declared in local env; hosted bindings, key presence, storage policies, and migrations not rechecked |
| Billing | Existing local Stripe configuration; hosted presence/webhook settings not rechecked |

Local development settings historically enable research/validation; they were not changed or used for live calls. Verification used production builds, blocked outbound network, synthetic fetch responses, and in-memory mocks.

Compiled verification evaluates actual emitted runtime conditions for grounding planning, stored grounding execution, repair grounding inputs, validation planning/execution, and every repair policy/validation-flag combination. Actual Worker generation handler checks return 404 when disabled and reach 401 auth when enabled/unset, using dummy local auth configuration. No flag was enabled in a running production service.

**Hosted configuration-presence verification is outstanding.** Local presence does not prove Worker secrets/bindings, production log retention, or deployed policies. No secret value, provider execution, or database write is needed for that remaining read-only inventory.

## 12. Rollback plan — documentation only

Cloudflare runtime configuration updates must be applied to a new active Worker configuration/version. They require an environment update and Worker rollout; there is no separate manual process restart. They do not require rebuilding the JS bundle. The client `VITE_*` setting is compiled and requires build + redeploy to change the visible UI. Preserve the committed OFF defaults in any rollout configuration.

| Incident | Action | Effect / operational requirement |
| --- | --- | --- |
| Provider failures | Set runtime `GENERATION_ENABLED=false` | Stops new generation API handling before auth; env update + Worker rollout; UI build optional if hiding controls is also desired |
| Credit anomaly | Same generation shutdown; inspect existing ledger and job IDs | No automatic ledger rewrite; reconcile deliberately before reopening |
| Search outage | Set `GROUNDING_ENABLED=false` | Stops new research and stored grounding-image loads, including repair inputs; generation can remain available; env update + Worker rollout |
| Validation outage | Set `VALIDATION_REPAIR_ENABLED=false` | Stops validation and dependent automatic repair; generation/grounding remain independent; env update + Worker rollout |
| Repair spend anomaly | Set `AUTO_REPAIR_POLICY=disabled` | Stops automatic repair while retaining validation; env update + Worker rollout |
| Production UI regression | Restore the last known-good Worker **and matching static assets** | Redeploy the known-good artifact; keep runtime OFF flags; do not combine rollback with feature activation |
| Hide generation UI | Set `VITE_GENERATION_ENABLED=false` in the build | Requires rebuild + redeploy; runtime shutdown should precede it for immediate backend control |

A switch does not cancel a provider request already in flight. Observe terminal jobs and ledger settlement. Disabling validation also disables repair because repair depends on validation; repair can be disabled independently while validation remains on. None of these actions was executed.

## 13. Final local validation

| Check | Result |
| --- | --- |
| `npm test` | 944 passed, 0 failed/skipped |
| `npm run typecheck` | PASS: application and tests |
| `npm run build` | PASS |
| `npm run lint` | PASS: 0 errors, 14 pre-existing Fast Refresh warnings |
| `git diff --check` | PASS |
| Two-account cache isolation / late response regressions | PASS within full suite |
| Library tab/filter/search regressions | PASS |
| Compiled generation flag + actual Worker handler | PASS |
| Compiled grounding/validation/repair guards | PASS: 3 grounding, 2 validation, 1 repair-policy function |
| Local route/metadata sweep | PASS: 48 variants / 36 sitemap URLs, mocked catalogue |
| Sitemap/robots/llms/manifest/icons | Local emitted assets and SSR verified |
| Secret-value scan | 903 source/build files, 6 local private values, 0 matches; values not logged |
| Catalogue formatting integrity | String/template/numeric literal sequence matches HEAD; no prompt content changes |
| Benchmark/reference evidence integrity | No changes to benchmark results, image-evaluation records, or reference fixtures |
| Four-viewport interactive browser pass | **BLOCKED: no connected browser** |
| Hosted configuration-presence inventory | **NOT VERIFIED** |

The formatting pass excludes ignored local output/browser captures from ESLint; application, scripts, and test code remain linted. Formatting dominates the diff (notably the catalogue and generated Supabase types). Frozen benchmark/reference evidence was not reformatted.

## 14. Release boundary

| Operation | Count / status |
| --- | --- |
| Provider calls | **0** |
| Image generation/edit calls | **0** |
| Grounding/search calls | **0** |
| Validation/OCR calls | **0** |
| Repair calls | **0** |
| Database writes | **0** |
| Deployment / production publish | **NO** |
| Production flag changes / V4/V5 activation | **NO** |
| Paid benchmarks / production smoke | **NO** |

Stop here for review. Complete the connected-browser certification and read-only hosted configuration inventory before changing this verdict to **READY FOR RELEASE — NOT DEPLOYED**. Deployment and activation remain separate decisions.
