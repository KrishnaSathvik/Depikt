# Final product cleanup — September 24, 2026

**Verdict: READY TO DEPLOY WITH V4/V5 OFF. Deployment has not been performed.**

This closes the bounded cleanup requested after `FINAL_PRODUCT_AUDIT_2026-09.md`. The original audit remains a historical record of the pre-fix working tree. This pass includes that previously uncommitted Home/Create, three-tab Library, and Account architecture; it is not a patch intended for the old `203048a` product alone.

Support and privacy contact supplied by the operator: **depiktapp@gmail.com**. Published in Help, Privacy, Terms, and llms.txt. No operator identity or service-response promise was invented.

## Privacy and release controls

- **F01:** Creations caches require a user ID and an authentication revision. An owner transition synchronously clears every registered private cache before React receives the new identity. Requests captured under an old revision cannot read or populate the new session, including A → B → A. Creations UI remounts by owner/revision; filter requests also reject superseded responses. Account overlay, full Account page, reference lists, profile responses, and open Library details cannot retain a previous owner's presentation.
- Private user prompts no longer enter the public module cache or TanStack route-loader cache. Public queries explicitly select public rows; owned queries explicitly select the current owner, with cancellation and authentication-revision checks. The public catalogue remains shareable.
- **F02:** Server runtime `GENERATION_ENABLED=false` wins over the compiled Vite flag. Runtime true/unset defers to the build configuration. The committed `scripts/verify-compiled-generation-flag.mjs` inspects the actual production output and exercises its Worker handler: disabled requests return **404 before authentication**, enabled/unset requests reach the **401 authentication gate**, with dummy local configuration and no provider request.

## Selected fixes

| Finding | Implemented behavior |
| --- | --- |
| F03 | Home explicitly says research-backed generation and automatic validation/refinement are not enabled in the current release. No feature activation. |
| F05 | Prompts/Templates/Gallery remain the three tabs. Switching to Templates or Gallery resets the model collection and category; filtering ignores incompatible model collections even on direct URLs. Search names/placeholders follow the tab. |
| F06 | Saved-result Open in Generate closes Account before handing the selected version to the Home editor. |
| F07–F10 | Zoom restrictions removed; auth dialog returns focus to its invoking control; tertiary text darkened to `#6b6b6b`; Home creator is the H1 inside main; Account has a persistent H1 across content tabs; edit textarea has an associated label. |
| F11 | Global application schema uses Depikt at Home. llms.txt and MCP instructions describe Home/Create, Library discovery, private Account, and the current feature availability. |
| F12 | Home social card now says Generate · Improve · Critique, composed from existing local assets without generation. Articles without a cover use the existing Blog card deterministically. Known cards publish matching dimensions; root no longer forces dimensions onto arbitrary article covers. |
| F13 | A new owner-scoped, read-only GET creation-detail endpoint reads saved versions, job validation, and session grounding. It returns display fields only, never execution seals or diagnostics. Detail view shows persisted status, source links, and version navigation. Validation is attached to the selected result, not an unselected repair candidate. Historic absent metadata stays absent. |
| F14 | Display sanitization removes the specific legacy compiler signature and series-consistency suffix while preserving ordinary user instructions. Stored generation prompts are not rewritten. |
| F15 | Help explains per-image/series credits, individual references and saved packs, available passwordless sign-in options, and current profile controls. Live Imago paste guidance appears only after choosing the Imago action. |
| F16 | Pack and individual-view removal open confirmation dialogs. Cancel sends no deletion. Generated images are retained. |
| F17 | Account overlay, account/avatar menu, Buy Credits UI, and generation auth UI load on demand. Large catalogue datasets load asynchronously outside Home's initial bundle. |
| F18 | The operator-supplied support/privacy email is published. |
| F26 | Grounded requires actual sources. Included refinements are not described as a count of corrected issues. |

Existing generation persistence already stores grounding in `generation_sessions.plan_json` and validation in job `usage_json`. The new detail read uses those fields for existing and newly saved results; no migration, provider call, historical backfill, or invented metadata is needed.

## Verification

**Zero provider calls, zero benchmark runs, zero live account mutations, zero deployments.** Node tests/build/Worker checks ran with outbound fetch/http blocked. Browser traffic was local-only; account/auth/reference endpoints were intercepted. Existing recorded image files were reused. Identity, failure, version-display, and reference fixtures were synthetic; these browser checks do not claim a fresh production database round trip.

| Check | Result |
| --- | --- |
| Unit tests | **937 passed, 0 failed**, including new cache/session, saved-metadata, repair-selection, and sanitization regressions |
| Typecheck | Passed, application and tests |
| Production build | Passed |
| Compiled kill switch | Passed: extracted production helper plus actual Worker handler, false/true/unset |
| Compiled Worker Home SSR | 200, creator rendered without lazy-import initialization error |
| Changed JS/TS lint | 0 errors; four existing context/hook-colocation Fast Refresh warnings |
| Formatting | Changed source/tests formatted only; no repository-wide fix |
| `git diff --check` | Passed |
| Account A → logout → B, B refresh fails | No A images/text; B profile and explicit creations error |
| Delayed A response after B signs in | No A images/text; stale response rejected |
| Private Library A → B, B fetch fails | A prompt and its open detail disappear; B-scoped failure state |
| Four viewports | 390×844, 768×1024, 1200×760, 1440×900 |
| Home/auth | One Home H1, no horizontal page overflow, unrestricted zoom metadata; keyboard focus stays inside auth and returns to Generate on Escape at all four widths |
| Library | Images 2.5 collection → Templates/Gallery remains populated; 30 templates and a populated Gallery; type-aware accessible search names |
| Account/results/references | Account H1, saved-version presentation/navigation, cleaned prompt, overlay-to-editor handoff, edit-field label, and deletion confirmations at all four widths |
| Public metadata | 39 routes checked; 36 sitemap entries; all 26 articles; JSON-LD parses, deterministic social images, canonical tags, robots rules, llms architecture/contact |
| Social assets | All 14 route PNGs are 1200×630 |
| Tertiary contrast | Approximately 4.97:1 against `#f7f7f7` |
| Production feature flags | `GROUNDING_ENABLED=false`, `VALIDATION_REPAIR_ENABLED=false`, `AUTO_REPAIR_POLICY=disabled`, including compiled Wrangler config |

## Bundle comparison

| Asset | Audit baseline | Cleanup |
| --- | ---: | ---: |
| Main JS, minified | 2,414.40 KB | 666.49 KB |
| Main JS, gzip | 793.78 KB | 211.45 KB |
| Home route JS, gzip | 24.41 KB | 24.48 KB |

Main gzip decreased about **73.4%**. The curated catalogue (236.16 KB gzip) and avatar machinery (301.50 KB gzip) still exist, but are separate chunks loaded when needed. This is a bounded critical-path improvement, not a total dependency-size rewrite. Existing build warnings about vendor directives and large lazy chunks remain.

## Evidence and release boundary

Local replay scripts, screenshots, metadata snapshots, and logs are in ignored `output/final-product-cleanup/`. The original audit evidence remains in `output/final-product-audit/`. Regression unit tests and the compiled-artifact verification script are committed with the product code.

The complete audited/fixed tree is intended for one commit on main and a verified push; use that commit, not `203048a`, for the subsequent production release. Readiness here covers the requested non-paid cleanup and verification. Production deployment remains paused for the separate release step, with V4/V5 OFF.

Deferred as requested: Gallery labeling, legacy redirect-chain cleanup, advanced series grouping/retry, keyboard mask drawing, dead-component cosmetics, avatar/sign-out discoverability, and repository-wide lint debt. No All tab, redesign, model activation, new image benchmark, or blanket lint fix was introduced.
