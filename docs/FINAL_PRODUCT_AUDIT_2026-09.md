# Depikt Final Product Audit

Audit date: September 24, 2026. Scope: the **current local working tree**, including the pre-existing uncommitted Home/Library changes. This is an audit, not a cleanup pass.

## Executive verdict

**NOT READY.** One privacy blocker was reproduced without contacting a real account: after an in-tab account switch, the new account can see the previous account's cached creations. Several important conversion, accessibility, discoverability, and release-control issues also remain.

The current direction is coherent: Home owns creation; Library owns discovery; Account owns creations and saved references. The shared draft works, public routes render, the build succeeds, and the mock-backed editing controls work. Preserve those working areas. The required next step is a bounded cleanup of the findings below, followed by non-paid verification—not a redesign or another generation benchmark.

**Execution limits honored:** paid provider calls **0**; image calls **0**; grounding/search/visual-search calls **0**; validation/OCR/repair calls **0**; benchmark reruns **0**; database writes **0**; deployments **NO**; production flag changes **NO**. No application source or existing tests were edited by this audit.

### Evidence and limits

- **Browser:** local Vite app, public navigation, 4 viewports, authenticated presentation with local API mocks, existing recorded image outputs, keyboard checks, metadata, screenshot inspection. Screenshots and logs: [`output/final-product-audit/`](../output/final-product-audit/).
- **Recorded outputs:** `benchmark-results/final-verification/{single,brand-series,repair}.json` and their existing PNGs. A presentation adapter maps these to the Account API shape; its output is [`recorded-creations-mock.json`](../output/final-product-audit/recorded-creations-mock.json). Authentication and the 5-credit balance are synthetic. Missing parent-version metadata is not invented as persistence evidence. Creation timestamps use recording completion times. Series labels/indexes are mapped from the recorded jobs.
- **Source/tests/build:** inspected routes, auth, billing, RLS migrations, reference ownership, result presentation, flags, generated production code, and existing tests.
- **Network isolation:** Node fetch/HTTP preload rejected non-loopback requests. Browser interception blocked external requests and application mutations; selected account GETs were fulfilled locally. Public Library SSR used checked-in fallback data because Supabase config was blanked for this audit process. A dummy browser-only Supabase config enabled auth presentation. DEV AUTH was disabled in this process. No environment files were changed.
- External fonts, analytics, and hosted thumbnails were blocked. Thus screenshots use fallback fonts and public prompt thumbnails can be absent. Those intentional blocks are **not** reported as production failures. Local hero/gallery images were inspected. Hosted asset reachability, OAuth completion, actual production configuration, deployed RLS, and current database contents are **NOT VERIFIED**.
- No fresh account or paid fixture was created. No actual delete, purchase, provider submission, or live session-maintenance request was made. Some generation GET handlers mutate stale-job/credit state; they were deliberately excluded from real-account inspection.
- Screenshot capture was corrected to wait for hydration and local images, and use reduced motion before capturing full pages. Early captures were replaced. Audit-only scripts lived under `/private/tmp`; only documentation/evidence was added to the workspace. No product/harness source fix was needed.

### Classification

**PASS** means the stated check passed at the cited evidence level. **PARTIAL** means implementation/evidence covers only part of the requirement or a known gap remains. **FAIL** means a reproducible discrepancy. **NOT VERIFIED (NV)** means no adequate current evidence. Mock/browser success does not establish live backend success. Accessibility ratings include global zoom/contrast defects; they do not claim WCAG conformance.

## Release blockers — P0

### F01 — Previous account's creations survive an in-tab account switch

**Surface:** Account/Creations, shared-device privacy. **FAIL — browser reproduced with local mocks and recorded outputs.**

1. Load recorded creations as mock account A.
2. Open Account on Home and sign out through the real UI.
3. Establish mock account B through the same Supabase client's normal session API, without reloading the SPA. Verify the session now belongs to B.
4. Return a local 503 for B's creations GET.
5. Open Account: A's teapot, brand series, and other cached images/captions remain visible. The failed refresh does not replace them or display an error when a cache exists.

[`cross-account-cache.png`](../output/final-product-audit/cross-account-cache.png) records the result. Both accounts and the failure are local simulations; no real account was accessed.

**Cause:** `src/lib/profile/creations-cache.ts` keys its map only by `all/generated/edited`; `CreationsGrid.tsx` hydrates that cache and suppresses refresh errors when cached data exists. The comment assumes sign-out/sign-in always changes the full page context, but `auth-context.tsx` and `AccountHub.tsx` do not enforce that. **Expected:** user-scoped caches, clearing/invalidation on owner changes, and rejection of stale async responses. Audit the analogous merged user-prompt cache in `src/lib/library.ts` too; that second path is a source-level risk, not a second browser reproduction. **Provider calls required to verify fix: NO.**

## P1 before launch

The exact fix table below supplies files and acceptance criteria. Important findings:

- **F02:** built server generation flag is constant true; changing `GENERATION_ENABLED=false` alone cannot switch it off.
- **F03:** Home advertises grounding and validation/refinement while the repository's production configuration disables them.
- **F04–F05:** requested Library All/universal discovery is absent; a retained Images 2.5 collection filter empties Templates/Gallery.
- **F06:** Open in Generate navigates but leaves the Account dialog covering the editor.
- **F07–F09:** user zoom is disabled, auth-gate focus is lost on close, and small tertiary text falls below 4.5:1 on white.
- **F10–F12:** Home has no H1; global schema, `llms.txt`, social cards, and most article share images are stale or unstable.
- **F13–F15:** saved Account details omit result provenance/status/versions; old compiled series instructions remain in displayed prompts; Help/credit/reference guidance is incomplete or stale.
- **F16:** deleting a saved reference pack or its view has no confirmation/undo.
- **F17:** primary client bundle is 2.41 MB minified / 794 KB gzip.
- **F18:** no working support/privacy contact is established in the repository's launch checklist or public Help surface.

## P2 after launch

- Gallery's generic numbered names avoid UUIDs but are weak labels and weak search metadata (F19).
- Legacy redirect chains, template/gallery footer absence, redundant fallback share metadata on 404/private surfaces, and inactive code/copy need a bounded cleanup (F20/F23).
- Account series headings/grouping, signed-URL/image errors, and Account-page logout discoverability need improvement (F21/F22/F24).
- Full-repository lint debt should be handled separately from this product pass (F25). The changed source/test files already pass lint.

## What is already strong

- All **930 unit tests pass**; source and test typechecks pass; production build passes.
- **47 changed/untracked source and test files pass ESLint**; `git diff --check` passes.
- Prompt text survives Generate → Improve prompt → Critique → Generate. All three live in the same Home shell and use shared draft/reference/generation ownership.
- Signed-out Generate opens a contextual auth gate, preserves the entered prompt, explains 5 free credits, prioritizes Google, exposes email, and de-emphasizes Lovable. No job submission is needed to reach it.
- Library cards, search, category controls, favorites, and template dialogs share consistent components. Favorites persist locally across reload; template completion returns to Home for review without auto-submitting.
- Existing image results render in Account. Brush input paints a real mask overlay; Undo removes it; Whole image hides the canvas; Cancel retains the source. Apply was not clicked.
- No QA Reference Pack defaults were found in `src`; ownership checks exist in both server entity queries and the creation picker, backed by owner RLS migrations.
- Public sitemap pages respond; core page canonicals are correct; legacy creation URLs redirect. Page-specific titles/descriptions are distinct across the 36 sitemap entries.
- Private generation storage, short-lived signed URLs, owner checks, sanitized API errors, and one-credit/included-repair policies are present. Their deployed enforcement is not re-certified here.

## Release baseline

| Item | Evidence |
|---|---|
| Branch | `main` |
| HEAD | `203048aeb4c2d04f721619f03b747aa871b3b0e4` |
| Cached origin/main | `203048aeb4c2d04f721619f03b747aa871b3b0e4` |
| Local HEAD == cached remote ref | YES |
| Fresh remote equality | NOT VERIFIED: `git ls-remote origin refs/heads/main` failed DNS resolution; no fetch/push performed |
| Working tree equals committed/released state | NO: 35 tracked dirty files and 13 untracked source/test files before audit |
| Exact pre-audit paths | [`baseline-status.txt`](../output/final-product-audit/baseline-status.txt); also reproduced in Appendix A |
| Local mode | Vite development, loopback `127.0.0.1:4173`; production build separately checked |
| Ignored artifacts present | `.output`, `dist`, `node_modules`, `.tanstack`, `.wrangler`, `.playwright-cli`, portions of `.playwright-mcp`, `benchmark-results`, `output`, `outputs`, research runs, `supabase/.temp`; `.env.local` is ignored |
| Audit changes | This report and local evidence only; no existing user changes reverted or committed |

| Flag | Repository development | Repository production / Worker | Audit runtime |
|---|---|---|---|
| `VITE_GENERATION_ENABLED` | true | true in `.env.production` | unchanged from development; submissions intercepted |
| `GENERATION_ENABLED` | true | no corresponding Worker var declared; compiled Vite value wins | unchanged from development; outbound providers blocked |
| `GROUNDING_ENABLED` | true | false | development value; outbound providers blocked |
| `VALIDATION_REPAIR_ENABLED` | true | false | development value; outbound providers blocked |
| `AUTO_REPAIR_POLICY` | `platform_absorbs_one_per_request` | disabled | development value; outbound providers blocked |
| `VITE_DEV_AUTH_ENABLED` | true in ignored local config | production guards disallow it | overridden false for audit server |

Only flag values are reported; no secrets are printed. These are **local configuration facts**, not claims about deployed Worker settings.

## Route scorecard

P = PASS, ~ = PARTIAL, F = FAIL, NV = NOT VERIFIED. Public functional ratings concern non-provider behavior only. All public accessibility cells inherit F07/F09. Source-only signed-in verification is explicitly identified.

| Route / surface | Purpose | Functional | UX clarity | Visual consistency | Mobile | Accessibility | SEO | Status / issues |
|---|---|---|---|---|---|---|---|---|
| `/` | Create + launch hero | ~ | ~ | P | P | F | F | PARTIAL; F03, F07–F12 |
| Home Generate | Prompt/reference/ratio/auth gate | P | P | P | P | ~ | NV | PASS for idle/auth gate; provider/result execution excluded |
| Home Improve prompt | Improve/reuse prompt | ~ | ~ | P idle | P idle | ~ | same Home | PARTIAL; result handoffs source/tests only; Imago remnants |
| Home Critique | Review/rewrite prompt | ~ | ~ | P idle | P idle | ~ | same Home | PARTIAL; result presentation source/tests only |
| `/library` / Prompts | Prompt discovery | ~ | ~ | P | P | ~ | ~ | PARTIAL; F04/F05; hosted thumbnails NV |
| Library All | Mixed discovery | F | F | NV | NV | NV | NV | FAIL; absent, `tab=all` falls back to Prompts |
| `/library?tab=templates` | Guided starting briefs | ~ | P | P | P | ~ | ~ | PARTIAL; F05; completion handoff verified |
| `/library?tab=gallery` | Visual references | ~ | ~ | P | P | ~ | ~ | PARTIAL; F05/F19; local images render |
| `/library?favorites=true` | Device favorites | P | ~ | P | P | ~ | ~ | PASS for local persistence; not cloud-synced |
| `/library?collection=gpt-image-2.5` | Current collection | ~ | ~ | P | P | ~ | ~ | PARTIAL; canonical is Library, no unique feature card; DB content NV |
| `/pricing` | Plans/credits | P read-only | P | P | P | ~ | ~ | PARTIAL overall; checkout intentionally not submitted |
| `/sign-in` | Existing account access | ~ | P | P | P | ~ | P noindex | PARTIAL; provider completion NV |
| `/sign-up` | First conversion | ~ | P | P | ~ | ~ | P noindex | PARTIAL; provider completion NV |
| `/account` | Private account/creations | F | ~ | P mock | P mock | ~ | P noindex | FAIL; F01/F24 |
| Account Creations | Browse saved images/series | F | ~ | P mock | P mock | ~ | noindex | FAIL; F01/F14/F21 |
| Creation details | Image/prompt/actions | ~ | ~ | P mock | P mock | ~ | private | PARTIAL; F06/F13/F14 |
| Account References | Manage packs | ~ | P | P empty/form | P empty/form | ~ | private | PARTIAL; F16; no H1 in this tab |
| Saved-reference picker | Attach owned packs | ~ | P | P source | NV populated | ~ | private | PARTIAL; ownership source/tests, signed-out/empty states reviewed |
| Edit / mask | Change whole image/area | P controls | P | P | P | ~ | private | PASS for mask/Undo/Cancel; Apply excluded |
| Series result grid | Multi-output status/actions | ~ | ~ | ~ source | NV live | ~ source | private | PARTIAL; recorded Account grouping, source/tests for live grid |
| Sources / validation / refinement | Explain trust/status | ~ | ~ | ~ source | NV populated | NV | private | PARTIAL; F03/F13; no live checks |
| `/history` | Local prompt-tool history | P empty | ~ | P | ~ | ~ | P noindex | PARTIAL; Home History does not mean image creations |
| `/blog` | Guide discovery | P | ~ | P | P | ~ | ~ | PARTIAL; historical navigation assertions persist |
| `/blog/$slug` (26 posts) | Article/guide | P SSR | ~ | ~ | NV all | ~ | ~ | Every slug individually listed in Appendix B; F11/F12 |
| `/help` | Instructions/FAQ | P | F | P | P | ~ | ~ | PARTIAL; F15/F18 |
| `/integrations/mcp` | Read-only integration explainer | P page | P | P | P | ~ | ~ | PARTIAL; endpoint invocation NV; source exposes published tools |
| `/privacy`, `/terms` | Public legal text | P | ~ | P source | NV dedicated | ~ | ~ | PARTIAL; F18, legal adequacy not certified |
| `/generate` | Legacy creation link | P 301 | P | inherited | inherited | inherited | P | Redirects to Home/create with prompt context |
| `/prompt` | Legacy tools link | P 301 | P | inherited | inherited | inherited | P | Redirects to Home/create with mode/prefill |
| `/critique` | Legacy critique link | ~ | P | inherited | inherited | inherited | ~ | 301 via `/prompt`, avoidable extra hop |
| `/templates` | Legacy templates | P 301 | P | inherited | inherited | inherited | P | Canonical Library Templates destination |
| `/gallery` | Legacy gallery | ~ | P | inherited | inherited | inherited | ~ | 307 normalization then 301 Library; F20 |
| `/favorites` | Legacy favorites | P 301 | P | inherited | inherited | inherited | P | Redirect to Library favorites |
| Unknown route / missing post/template | Recovery | P 404 | P | P | ~ | ~ | ~ | Real 404, helpful home/blog action; generic root meta remains |
| `/robots.txt`, `/sitemap.xml`, `/llms.txt` | Discovery files | P/P/F | ~ | NV | NV | NV | ~ | F11; sitemap parses and excludes private/legacy pages |
| `/mcp`, RSS, OAuth discovery | Machine surfaces | ~ source | NV | NV | NV | NV | NV | Source inspected selectively; not executed end-to-end |

## Home audit

**Implementation PASS for shared idle workspace; overall PARTIAL.** The Images 2.5 hero retains New in Depikt, headline, supporting copy, five real local images, Explore, and Read what's new. Local images decode at all four widths, have descriptive alt text, and are contained in ratio-constrained boxes. Desktop/laptop composition is coherent; mobile stacks naturally. Main creator width is intentionally narrower (1040px) than the 1400px hero/capabilities; this is not an accidental misalignment.

Header has logo, Library, and loading-aware sign-in/account control. It intentionally omits Pricing, which remains in the footer: this matches the newest local architecture note but differs from this audit brief. Treat that as a specification discrepancy, not a broken link. No redundant Generate nav. Footer links point to Blog/MCP/Help/Pricing/Privacy/Terms, and the year is 2026.

Shared prompt switching was exercised with `Audit: red ceramic cup on a white table`; every mode retained the exact text. Improve/Critique textareas have associated labels despite no `aria-label`. Their compact shells match Generate. `CreatorDraft` owns shared references/entities and clears them on owner change. Browser verification of populated pack/reference switching and complete tool-result streams remains NV; source and unit evidence supports it.

**FAIL:** neither the hero nor creator uses an H1. Hero H2 is outside `<main>`. Also, capability claims do not reflect the production-off grounding/validation flags. These claims need qualification, not unauthorized feature activation.

Home History links to local Improve/Critique history, not Account Creations. That distinction is not explained beside the Home link. Mobile examples form an intentionally scrollable row; no page overflow was observed.

## Library audit

**PARTIAL.** Three tabs share one search/category/card system. Prompt cards have preview, category-derived labels, favorite and use actions; detail source contains prompt, explanation, provenance and copy controls. Template cards use a consistent typographic visual anchor. Gallery local files render with contain fitting.

**All view FAIL:** `BrowseType` and the helper can interleave types, but the route schema excludes `all` and the UI has exactly three tabs. Search is confined to the active tab; the universal-sounding placeholder overstates that scope. The newest local `CLAUDE.md` intentionally specifies three tabs, whereas this audit request explicitly expects All. Record and resolve this disagreement before implementing anything.

**Filter trap FAIL, reproduced:** open `/library?collection=gpt-image-2.5`, then click Templates. The URL carries the collection filter, the result count is zero, and the page says “No starting points match your search.” Templates/Gallery have no model, so `filterBrowseEntries` rejects every entry. Categories reset, but collection does not. Clear filters recovers. Categories are based on type-wide content, not the remaining collection/search subset; some combinations can still be empty.

Local fallback search results: `portrait` 122; `calm` 34; `watercolor` 20; `Posters` 198. Template `portrait` returns 5. Gallery `Gallery reference 1` returns 119 substring matches; `portrait` returns 0 because UUID-based entries have only numbered fallback names. These counts describe checked-in fallback data, not production DB counts.

**Favorites PASS locally:** add first gallery card, filter Favorites → 1 result, reload → 1 result. Controls are always visible and accessible on touch. Favorites are stored in device IndexedDB, not user-scoped cloud data; Account copy distinguishes them from Creations, but the Library should state device-local persistence.

**Template handoff PASS:** fill Portrait / Photography subject → Continue to Generate → `/?mode=generate#create`, prompt begins `Template: Portrait / Photography\nSubject: A portrait of a gardener`. No auth dialog/job auto-start. Dialog captured at all four sizes. The current fallback lists 30 active templates; `llms.txt` claims 15.

Gallery “Use as reference” processing/handoff is implemented in `use-gallery-reference.ts`; source and reference tests support it. A full signed-in upload was not sent. Prompt Library handoffs also default to review rather than autoStart. Browser Back across every handoff is NV; mode switches intentionally replace history rather than creating a new history entry per tool.

## Account audit

**FAIL on privacy; otherwise PARTIAL with local recorded-data evidence.** Five recorded images render with captions, dates, Generated/Edited labels, and a three-image series. Responsive Account screenshots exist at all requested widths. Source sanitizes entity preambles and avoids raw IDs as titles. Images/details use human captions. Delete creation opens a confirmation dialog by implementation; actual deletion was excluded. Download implementation uses signed URLs; a completed file download was not verified.

The Account menu correctly does not nest an Account hub over `/account`. However, on that route its button does nothing and the full-page surface has no Sign out action. Sign out is only in the hub available elsewhere. This is a discoverability defect, not an authentication failure.

**Open in Generate FAIL:** source result and edit UI load behind the still-open Account dialog. Closing it manually exposes the working editor. Fix the handoff to close the hub as part of navigation.

**Saved details PARTIAL:** `CreationDetailView` displays image, prompt, date, dimensions, download/open/delete. It has no source list, Grounded/Validated/Refined status, or version strip, and its API model lacks those fields. Opening a creation sends only one `sourceVersion`, no session lineage or original reference list. Full reload/history restoration is not established by this handoff.

**Prompt sanitization PARTIAL:** recorded brand outputs lose the leading entity reference block, but retain compiler-added sentences such as “Keep these series consistency requirements…” and “Do not add scene-name labels…”. The API returns `image_versions.prompt` directly, and `userFacingPrompt` strips leading blocks only. The original user brief should be presented separately from execution instructions.

Reference-tab selection removes the only H1 (Creations); the tab renders H2/H3 only. Credits display one mock authoritative balance, with starter/plan/extra distinctions. This does not verify a live ledger or actual balance.

## Creation tools audit

### Auth and first conversion

**PASS presentation / PARTIAL end-to-end.** Signed-out Generate preserves prompt, opens a bounded Radix dialog, displays continuation and 5 free credits, and offers Google → Apple/Microsoft → email → secondary Lovable. Dedicated sign-in/up are noindex and have legal links. Loading reserves header space before revealing Sign in. Closing the modal retains the draft and clears the pending intent in the checked state.

**Focus return FAIL:** after Escape and dialog removal, `document.activeElement` is BODY, not Generate. The controlled dialog has no trigger/focus restoration target. Dialog fits all four test dimensions; focus trapping is supplied by Radix, but exhaustive keyboard/screen-reader testing is NV. OAuth/email delivery and redirect completion were intentionally not executed. Pending reference persistence has unit/source evidence, not a fresh OAuth round trip.

### Editing

**PASS for exercised controls.** Open recorded teapot → dismiss obstructing hub → Select area. Pointer stroke changes canvas alpha; Undo enables, removes stroke, then disables. Whole image removes mask canvas. Cancel retains source and exposes result actions. Brush size, Brush/Erase/Clear, bounded layout, and disabled Apply conditions are implemented. Four responsive editor screenshots exist. No Apply, regenerate, mask upload, or repair was sent.

**Accessibility PARTIAL:** the mask canvas has a name but no keyboard drawing alternative; whole-image edit is available. The edit textarea is preceded by text rather than an associated label. Retention of the original generation's reference packs on Account handoff is unsupported by its empty `references` array. Version linkage is prepared by source-version ID; full remote lineage persistence remains NV.

### Series

**PARTIAL.** Recorded brand-series outputs render as a group in Account; individual opening uses the same detail component. Live grid code handles queued/running/succeeded/failed children and labels. Existing unit tests cover result selection, resume, credit counts and lineage. No new series was started.

The known limitation remains: failed-child retry/new action calls `onNew`/`startNew`; it starts a new request rather than resuming only that failed child. Account group header uses the first child's `seriesLabel` instead of a series title/count when present. Grouping requires contiguous rows; interleaving/pagination can split a series. Account returns saved versions, so missing/failed children are not explained there. Persisted-series reload and partial-failure browser states are NV in this audit.

### Grounding, validation, refinement

**PARTIAL, source/recorded-test evidence.** `resultStatusLines` maps internal verdicts to Grounded, Validated, limitations, and Refined automatically. Temporal code includes “Current appearance could not be independently verified.” No raw V4/V5, confidence or validationClaims is intentionally rendered by these status components. Source links open with `noopener noreferrer`.

`validateAndRepair` keeps the original on failed/non-improving repair. Economics allow one included repair per request without extra credits. `refinedDetail` reports repair attempts as “issues corrected”; an attempt count does not prove a corrected-issue count. The source drawer also labels any non-null grounding object “Grounded” even when its source list is empty; clarify that edge case. Long/duplicate/bad source URLs and populated mobile source UI have not been browser-verified. Account details omit this information entirely (F13). Do not infer current output quality from a passing mapping test or a prior generation report.

## Reference Packs audit

**Ownership implementation PASS; deployed data safety NOT VERIFIED.**

- API authenticates JWT, queries `reference_entities` with `.eq("user_id", userId)`, checks entity ownership on mutation, validates asset ownership/storage prefix, and signs owned previews for 600 seconds.
- Migration enables owner RLS on both entities/assets with a composite entity/owner relationship. Private `generation-assets` storage uses user-scoped paths. No production seed injection is evident.
- Picker resets loading state on owner change, discards cancelled responses, filters entities to the current user, and does not provide global defaults. Draft owner change clears selected references.
- Empty mock account showed “No reference packs yet…” and Create reference pack. Character/product/brand choice and named edit form are implemented and the form fits four widths. No pack was actually created or edited.
- Limits distinguish **4 attached packs / 8 total input images** from **4 ad-hoc uploads**, **8 images per stored pack**, and **50 stored packs per user**. Picker describes the attachment budget. Help currently conflates this with a universal 4-reference limit.
- Existing-pack metadata/image editing is source-verified. **Delete pack and remove-view actions dispatch immediately**, without confirmation or undo (F16). Signed-URL expiry and populated pack dialogs are NV in current browser evidence.

### QA-name inventory

The scoped scan of `src`, `supabase`, `scripts`, `tests`, and `docs` found **107 text occurrences** of Maya/Sofia/NEMORI/VELORA and the requested QA variants. Every hit's file/line is classified in [`fixture-classification.json`](../output/final-product-audit/fixture-classification.json); exact text is in [`fixture-occurrences.txt`](../output/final-product-audit/fixture-occurrences.txt).

| Classification | Hits | Assessment |
|---|---:|---|
| Production application `src` | 0 | No hard-coded default pack/QA name found |
| Unit test | 32 | Intent/identity/validation and anti-leak fixtures |
| Verification fixture / historical QA evidence | 59 | Frozen test corpus, recorded prompts/reports |
| Local QA script | 4 | Smoke/refund scripts; not executed |
| Historical documentation | 11 | Prior verification descriptions |
| Public prompt example in SQL | 1 | “Maya Okonkwo” in a sample prompt; unrelated to account Reference Pack injection |

Ignored recorded outputs additionally contain the expected QA names; they were used only as local evidence. Hosted reference tables/seeds were not read, so **absence of bad production rows cannot be certified**. F01 is a separate cache leak and means overall account privacy still fails despite sound entity ownership paths.

## SEO audit

53 local HTTP route variants were inspected, including all **36 sitemap entries / 26 blog posts**, auth/private pages, legacy links, query variants and invalid routes. Full route metadata: [`metadata.json`](../output/final-product-audit/metadata.json); compact statuses: [`route-summary.json`](../output/final-product-audit/route-summary.json).

- Core indexable routes have distinct titles/descriptions, canonical www HTTPS URLs, OG/Twitter metadata and a single H1 **except Home**. No duplicate titles/descriptions among the 36 canonical sitemap entries.
- Templates/Gallery have distinct metadata and canonical Library query-tab URLs. This is a legitimate current architecture choice; do not redirect their canonical tab URLs back to the generic prompt view. Old standalone routes redirect.
- Prompts default canonical is `/library`; explicit `tab=prompts` normalizes there. Search, favorites, collection and pagination canonicalize to the active tab. Pagination therefore relies on navigation/SSR crawlability rather than self-canonical pages; review discoverability of later entries without inventing detail routes.
- Sign-in/sign-up are correctly `noindex, follow`; account/history are noindex. Account/history do not have full private-route canonical/share overrides; low priority compared with public SEO.
- The Images 2.5 collection intentionally shares Library canonical/OG. The feature article exists, but its fallback share image is random.
- Invalid paths and blog/template IDs return actual 404, not soft 200. Root 404 inherits generic homepage title/description/random image; specific noindex/error metadata would be cleaner.
- Historical model names and 2026 article dates are not errors by themselves. Historical articles' current-product navigation advice may be obsolete; preserve dated factual history and update only navigational guidance.
- No external link status, ranking, Search Console coverage, or public-model factual claims were re-verified through the internet under the no-search constraint.

## Metadata/OG audit

All 14 branded PNGs exist and measure **1200×630**. Home, Library, Pricing, Blog, Templates and Gallery were visually opened. Logos/headlines are readable and unclipped, with opaque light backgrounds that remain legible in dark preview surrounds. Real social-platform crop/render tests are NV.

**FAIL — Home card:** `public/og/home.png` still says **Build · Critique · Explore**, omitting current native creation. Library card says Prompt Library/543 prompts rather than the full Library offering; less severe since Prompts remains the default. Pricing and Blog cards remain appropriate.

**FAIL — article cards:** only generation/MCP posts in the inspected set use fixed local cards. The other **24** articles use random hosted prompt thumbnails when `cover_image` is absent. `getOgImageForPath()` randomly selects a thumbnail on every call; the Images 2.5 launch article therefore gets an unrelated, unstable image. Inherited `og:image:width/height=1200/630` also need not match those thumbnail dimensions. Hosted images were not fetched. Use deterministic existing/static assets; no paid image generation is needed.

Root favicon, SVG/PNG icons, apple-touch icon, manifest, viewport/theme-color and language are present. Font stylesheets use `display=swap`; exact production-font layout remains NV because external font requests were blocked.

## Sitemap/robots audit

**PASS local structure / PARTIAL deployment.** `sitemap.xml` parses, has 36 URLs with canonical www HTTPS spelling and excludes account/auth/history, legacy standalone routes and 404s. Includes Library prompts, Gallery/Templates tabs, Pricing, Help, MCP, legal pages and every known post. `robots.txt` allows public crawling, disallows `/api/` and `/account`, and points to the sitemap. There are no special AI-crawler directives.

Observed redirects: `/generate?prefill=audit` → 301 `/?prefill=audit&mode=generate#create`; `/prompt?mode=critique&prefill=audit` → 301 Home/critique; `/critique` → 301 `/prompt?mode=critique` → Home; `/templates` → 301 Library/Templates; `/favorites` → 301 Library favorites. `/gallery` first normalizes with 307 to `?page=1`, then uses its permanent redirect. `/library/` normalizes with 307. These are extra hops, not indexable duplicate content.

`site.ts` standardizes www and rewrites auth-return aliases, but DNS/edge apex→www and HTTP→HTTPS redirects are **NOT VERIFIED** and are not established merely by canonical tags. Sitemap is generated, not a static file. Current query URLs contain only one parameter, so no malformed XML ampersands were observed.

### Structured data

JSON-LD parsed successfully. Root emits WebSite plus **“Depikt Prompt Workspace” at `/prompt` on every page**; Home additionally emits SoftwareApplication. This stale duplicate app identity is F11. Library emits CollectionPage; posts emit Article/BreadcrumbList and FAQPage when applicable; Help FAQ schema has visible FAQ content. `author` is always Organization, including the individual author name “Krishna”; review that minor type mismatch. No spam schema is needed.

### LLM / AI discoverability

**FAIL:** `public/llms.txt` still teaches Prompt workspace/Build/Critique, separate Generate/Gallery/Templates destinations, “recipes,” and 15 templates. Its links redirect but its architecture is wrong. It needs a factual description of Home creator, unified Library, Account/reference packs and currently enabled capabilities. MCP remains read-only; do not conflate website generation with MCP write tools. No `llms.txt` sitemap pointer is present.

## Accessibility audit

**PARTIAL/FAIL; not a compliance certification.** Positive evidence: named primary nav, main landmarks, creator labels, tab roles/arrow-key implementation, visible card actions, named favorite buttons, image alt attributes, Radix dialog titles, correctly associated template/reference form labels, and reduced-motion styles.

- **F07:** root viewport includes `maximum-scale=1`, `minimum-scale=1`, `user-scalable=no`.
- **F08:** auth gate loses focus on dismissal, as reproduced above.
- **F09:** `--text-tertiary: #777777` on white is approximately **4.48:1**, below 4.5:1 for small normal text; on `#f7f7f7` it is worse. Header Sign in and several 11–13px labels use it. This is a token-level static calculation, not a full contrast sweep.
- **F10:** no Home H1; no Account H1 with References selected. Hero outside main weakens landmark reading order.
- **F22:** edit textarea lacks label association; canvas requires pointer painting, without keyboard area selection. Whole-image editing remains available.
- Avatar and some delete/favorite controls are 28–32px. They are smaller than the requested generous touch treatment; spacing/exceptions must be assessed before claiming a standards violation from size alone.
- No missing `alt` attributes were found in the sampled public DOMs. Empty alt on an image inside an already named preview button is intentional, not an automatic failure. Generic gallery names are nevertheless poor alternatives for understanding image subject/style.

No axe-core or Lighthouse package was found in the installed project dependencies; none was downloaded. Automated metadata/overflow/label checks and manual inspection were used. Full keyboard order, screen-reader announcements, browser zoom behavior across engines, and every loaded/error state remain NV.

## Responsive audit

**PASS for the tested layouts; PARTIAL for complete state coverage.**

Tested 390×844, 768×1024, 1200×760, 1440×900. Home, Library Prompts/Templates/Gallery, Pricing, Sign in, Blog index, Help and MCP had **no horizontal document overflow in 36 checks**. Account mock and empty/reference-create forms also fit. Auth, template, creation-detail and edit screenshots exist at all four sizes. Mobile hero, footer, card grids and modal scrolling are coherent.

The auth dialog at 390px measured about 362×676px and stayed within the viewport; laptop height also fit. Full-page screenshots of fixed modals can show the underlying document outside the viewport-sized backdrop; that is a screenshot artifact, not overlay escape. Template/mobile result source panels with long real content, all blog bodies, fully populated Reference Packs, live series errors, and on-screen keyboard interactions remain NV.

## Performance audit

**PARTIAL; static production build evidence, not a Lighthouse score.**

| Artifact | Minified | Gzip |
|---|---:|---:|
| Main `index-Bar0eEYG.js` | 2,414.40 KB | 793.78 KB |
| Supabase vendor | 194.86 KB | 51.59 KB |
| Radix vendor | 106.06 KB | 34.32 KB |
| Dexie/db | 97.03 KB | 32.73 KB |
| Home route | 85.21 KB | 24.41 KB |
| TemplateSetup | 48.67 KB | 16.30 KB |
| Library route | 22.06 KB | 7.21 KB |
| Styles | 114.98 KB | 19.34 KB |

The build explicitly warns about chunks over 500 KB. Main bundle includes the full checked-in prompt corpus (505 `why_it_works` markers), and root imports AccountHub/avatar machinery. Investigate catalogue delivery and lazy account/avatar UI before tuning minor components. Do not claim a measured attribution percentage without a bundle analyzer. Header logo is a 128 KB PNG displayed at 24px. OG PNGs are roughly 0.5–0.94 MB each.

Hero uses five eager WebPs with reserved CSS aspect boxes. Likely LCP candidates are the large headline or largest visible collage image depending on viewport/font loading; actual LCP/CLS values are **NV**. There is no explicit hero fetch-priority/preload. Font swap and auth hydration are possible shift sources, though header placeholder dimensions and image aspect boxes reduce risk. Initial Library shows 12 cards with lazy images; Gallery does not render every original simultaneously. Gallery originals have no responsive `srcset` in the shared card. Hashed `/assets/*` get one-year immutable cache headers; other static-image/CDN delivery was not measured.

## Error/empty states

| State | Result / evidence |
|---|---|
| Empty/no-match Library | PASS browser: clear recovery text; retained collection creates an avoidable empty trap |
| No favorites | PASS implementation; favorite/reload flow verified; empty copy shared with Library no-match |
| Empty creations | PASS source; populated/failing-cache states exercised; real empty account NV |
| Empty Reference Packs | PASS mock browser; no seeded pack appears |
| Invalid template/blog/route | PASS local HTTP 404 + recovery |
| Invalid Home template query | PARTIAL: source falls back; detailed invalid-slug browser handoff NV |
| Missing gallery image | PARTIAL: SampleImage handles preview error; LibraryCard itself lacks onError fallback |
| Deleted/unavailable creation | PARTIAL: null URL placeholder exists; stale signed URL/img error recovery is incomplete |
| Expired auth | PARTIAL: server 401/error mappings and auth gate exist; real token expiry NV |
| Insufficient credits | PARTIAL: GenerationCreditGate/OutOfCreditsPanel implemented, no paid submit; exact browser state NV |
| Generation flag off | PARTIAL: creator falls back to Improve; built runtime kill switch defective (F02) |
| Provider disabled/unavailable | PARTIAL: safe server errors and client retry/reset paths; actual call excluded |
| Grounding unavailable/missing sources | PARTIAL: fallback/temporal mapping exists; empty source object can still say Grounded |
| Failed/non-improving repair | PASS unit/source policy keeps original; no fresh provider attempt |
| Image fails after URL supplied | FAIL recovery gap: primary result/card `<img>` paths lack meaningful retry/re-sign handling |
| Account read fails after owner switch | FAIL privacy blocker F01, stale cached creations retained |
| Partial series failure | PARTIAL source/tests; retry means new request, not failed-child continuation |

## Security/privacy surface

This was a product review, not penetration testing. **Overall FAIL because of F01.**

Server reference ownership, user-bound JWT clients, private storage paths, composite owner FK/RLS, safe errors, and validated next-return paths are positive. No source evidence of default QA pack injection. A value-based scan of the **generated public bundle** found **0 matches** for configured OpenAI, dev-auth password, Stripe, generation-signing, or Supabase service-role secret values. Values were never printed. This is scoped evidence, not proof that every possible secret is absent everywhere.

DEV AUTH requires DEV true, PROD not true, development mode, opt-in flag and localhost. Root conditionally excludes the component in production; no dev-auth/password markers were found in the generated public JS scan. Therefore **PASS for this production build's DEV AUTH exclusion**. No alternate deployment build or hosted setting was inspected.

Reference pack deletion has no confirm/undo, unlike creation deletion. Account cached creations are not user-scoped. Library's module cache merges private user prompts without an owner cache key or logout invalidation; investigate with the same two-user test before signing off. Public curated prompt/image content is intentionally public; Reference Packs and generated assets are intended private. Deployed policies and actual bucket flags were not queried.

Public Privacy/Terms exist and contain no owner-input placeholders. The internal legal-launch checklist still lists unresolved operator identity/contact/refund details. This report flags absent product contact/recovery information; it does not make a legal compliance determination.

## Production flag safety

**FAIL for generation runtime rollback; PARTIAL overall.** The new production artifact contains:

```js
function isNativeGenerationEnabled(explicitValue) {
  const fromVite = "true";
  typeof process !== "undefined" ? process.env.GENERATION_ENABLED : void 0;
  return fromVite === "true";
}
```

This was read from `.output/server/_ssr/router-DUlBJJv_.mjs`, not inferred solely from source. `feature-flag.ts` prioritizes Vite over process env, and `.env.production` sets Vite true. A runtime `GENERATION_ENABLED=false` therefore does not disable this artifact. Fix server/runtime precedence and document a tested rollback method. No switch was toggled here.

Grounding/validation/repair remain off in `.env.production` and `wrangler.jsonc`. Their development-on/production-off policy is documented in `docs/plans/2026-09-18-final-verification-config.md`, and repair policy requires both validation enablement and included-repair policy. Actual deployed secrets/overrides are NV. Marketing must not promise currently disabled capabilities without qualification. Production activation is out of scope.

## Dead/stale product paths

- `JSONLD_NAMES.prompt`, root WebApplication URL, `llms.txt`, old route comments and several earlier `CLAUDE.md` sections describe the old Prompt product. The newest architecture section supersedes those instructions, but the contradictory documentation should be consolidated later.
- `HomeGenerateDemo.tsx` is untracked and has no current route import; Home uses real CreateWorkspace. Do not delete it during audit.
- Imago is no longer primary navigation, but Improve/Critique result action areas still render Open in Imago plus an unconditional paste hint when a result exists. This is live optional result UI, not merely dead constants. Its wording should be scoped to the actual Imago action so native users are not told to paste elsewhere.
- `PromptCard` remains used by the old Account Favorites component while Library uses `LibraryCard`; verify reachability before removal. Legacy route files are intentional compatibility paths, not automatically dead code.
- Internal V4/V5, repairable and pass_with_limitation occur in implementation/tests/docs. Do not remove legitimate internal vocabulary. Current status components translate them; old compiled series prompt tails remain a separate user-facing defect.
- “recipe” in food prompts or dated blog titles is legitimate historical/content vocabulary; `llms.txt` using it to describe current product navigation is stale.

## Exact fix list

All fixes below can be implemented and verified with **provider calls required = NO**. “NO” does not authorize changes during this audit. Choose the final list first.

| ID / severity | Surface / observed | Expected behavior / verification | Likely files |
|---|---|---|---|
| **F01 P0** | Account A's cached creations visible to B after sign-out/sign-in and failed B refresh | Key cache by owner, clear on owner change, guard async responses; replay two-account failure/delay test; inspect merged private Library cache too | `src/lib/profile/creations-cache.ts`, `src/components/account/CreationsGrid.tsx`, `src/lib/auth-context.tsx`, `src/lib/library.ts` |
| F02 P1 | Built server ignores runtime generation disablement | Runtime server kill switch must override enabled client/build default; test compiled artifact under both values | `src/lib/generation/feature-flag.ts`, `.env.production`, `wrangler.jsonc`, release docs |
| F03 P1 | Home promises production-disabled research/check/refinement | Qualify/hide unavailable capabilities using a truthful public availability model; do not activate flags | `src/lib/product.ts`, `src/routes/index.tsx` |
| F04 P1 | No All tab; search only active type | Resolve brief vs current architecture; implement requested mixed All or explicitly narrow labels/spec; test cross-type results | `src/routes/library.tsx`, `src/lib/library-browse.ts`, architecture note |
| F05 P1 | Collection persists into Templates/Gallery and empties results | Reset inapplicable collection on type switch; contextual categories; browser regression from hero collection | `src/routes/library.tsx`, `src/lib/library-browse.ts` |
| F06 P1 | Account overlay covers editor after Open in Generate | Close hub on successful handoff; verify Home editor focus/visibility and Back | `src/components/account/CreationDetailView.tsx`, `AccountHubProvider.tsx` |
| F07 P1 | Zoom disabled globally | Allow browser/user zoom; test at enlarged text/zoom without clipping | `src/routes/__root.tsx` |
| F08 P1 | Auth dialog dismissal focuses BODY | Restore focus to submitting control; verify Escape/Close and keyboard trap | `src/components/auth/AuthGateDialog.tsx`, `AuthChooserDialog.tsx`, `CreatorDraft.tsx` |
| F09 P1 | Small #777 labels on white/subtle backgrounds lack sufficient contrast | Adjust tertiary token or usage; measure all affected text/background pairs | `src/styles.css`, `src/components/Header.tsx`, small-label components |
| F10 P1 | Home and References tab lack H1 | One meaningful page H1 independent of active tab; keep hero in logical landmark order | `src/components/LaunchModule.tsx`, `src/routes/index.tsx`, `src/routes/account.tsx` |
| F11 P1 | Global Prompt Workspace schema; old llms architecture/template count | Current app name/Home URL, consistent schema identity, factual Home/Library/Account descriptions and actual counts | `src/routes/__root.tsx`, `src/lib/product.ts`, `public/llms.txt` |
| F12 P1 | Home share card says Build/Critique; 24 article cards random | Static deterministic existing-assets cards, accurate wording/dimensions; inspect all article fallback cases | `public/og/home.png`, `src/lib/og-image.ts`, `src/routes/blog.$slug.tsx`, `src/data/posts.ts` |
| F13 P1 | Saved details omit provenance/status/version history; one-version handoff loses context | Persisted result detail should retain explainable statuses/sources/lineage; do not infer them from compiled prompt | `src/components/account/CreationDetailView.tsx`, `src/lib/profile/client.ts`, `src/routes/api/account/creations.ts`, generation handoff |
| F14 P1 | Old stored series prompt exposes compiler-added tails | Display original request; sanitize legacy tails narrowly using recorded fixtures without changing provider prompt | `src/lib/generation/user-facing-prompt.ts`, creations API/data model |
| F15 P1 | Help says universal 4 references/one reserved credit; old Build and auth instructions; extras unclear | Explain ad-hoc vs pack limits, per-output series credits, free improvement, included grounding/validation/repair, current sign-in methods | `src/data/legal.ts` (Help FAQ), `src/lib/billing/copy.ts`, `src/lib/product.ts` |
| F16 P1 | Delete pack/view dispatches immediately | Confirm destructive action or provide reliable undo; test locally without real deletion | `src/components/account/ReferencesTab.tsx` |
| F17 P1 | 794 KB gzip main client chunk | Identify/remove critical-path catalogue/avatar/account weight; retain lazy route boundaries; compare production build | `src/lib/library.ts`, `src/data/curated-prompts.ts`, account/avatar imports, `vite.config.ts` |
| F18 P1 | Help/privacy has no established contact channel; launch checklist unresolved | Operator supplies real contact/support route and resolves factual launch checklist; no invented details | `docs/internal/legal-launch-todos.md`, `src/data/legal.ts`, `src/routes/help.tsx` |
| F19 P2 | Gallery reference N/photo N are uninformative; subject search fails | Add reviewed human labels/style/subject metadata; retain UUID only internally | `src/lib/gallery-labels.ts`, `src/data/gallery-images.ts`, `src/lib/library-browse.ts` |
| F20 P2 | `/gallery` normalization + redirect; `/critique` extra hop; 404 generic metadata | Direct permanent legacy destinations; intentional trailing-slash policy and error head | `src/routes/gallery.tsx`, `critique.tsx`, `__root.tsx` |
| F21 P2 | Series heading uses first child label; grouping depends on adjacency; retry is new request | Display true group/count/child labels; group by session across pagination; state retry limitation clearly | `src/components/account/CreationsGrid.tsx`, `src/components/generate/SeriesJobsGrid.tsx` |
| F22 P2 | Broken/expired images lack recovery; edit field unlabelled; canvas pointer-only | Visible image retry/re-sign/fallback, associated edit label, accessible editing alternative | `src/components/generate/GenerationCanvas.tsx`, `GenerationEditForm.tsx`, `GenerationMaskEditor.tsx`, `src/components/library/LibraryCard.tsx` |
| F23 P2 | Imago paste hint appears in native result workflow; unused demo/copy; Library lacks footer | Scope export hint to action, consolidate only proven dead copy/components, provide consistent secondary navigation | `src/components/prompt/BuildMode.tsx`, `CritiqueMode.tsx`, `ImagoPasteHint.tsx`, `src/routes/library.tsx` |
| F24 P2 | Account avatar is no-op on `/account`; Sign out only in hub elsewhere | Expose account controls on full page without redundant nested hub | `src/routes/account.tsx`, `src/components/auth/AccountMenu.tsx` |
| F25 P2 | Whole-repo lint fails despite clean changed files | Separate formatting/generated-content lint debt from launch changes; no blanket formatting during audit | `eslint.config.js`, files identified in `output/final-product-audit/lint.log` |
| F26 P2 | Empty sources can still say Grounded; repair attempts described as issue count | Require actual evidence for trust label; use attempt-neutral refinement wording; mock empty/long/duplicate sources | `src/components/generate/GenerateWorkspace.tsx`, `src/lib/generation/result-status.ts`, `src/lib/product.ts` |

### Validation record

| Check | Result |
|---|---|
| `npm test` with non-loopback network guard | PASS: 930 tests, 0 failures/skips |
| `npm run typecheck` | PASS: application and tests |
| `npm run build` with network guard | PASS; large client chunk warning |
| `npm run lint` | FAIL: 3,550 errors + 14 warnings. 3,536 are Prettier; remaining errors: 11 unnecessary escapes, 2 explicit-any, 1 prefer-const |
| Changed/untracked source/test ESLint | PASS: 47 files |
| `git diff --check` | PASS |
| Local HTTP metadata sweep | 53 variants; 36 sitemap URLs all 200; intended redirects/404s recorded |
| Public responsive measurements | 36/36 no horizontal document overflow |
| Local Account/mask/mock privacy checks | Findings above; no provider/mutation endpoint passed through |
| Automated axe/Lighthouse | NOT RUN: not installed; no download/network dependency added |
| Live auth, deployed DB/RLS, runtime production flags, hosted assets | NOT VERIFIED |

No fixes were started after the audit. No pricing changed. Stop here for review and selection of the final non-paid cleanup list.

## Appendix A — Exact pre-audit working tree

These changes predate the audit and were preserved.

```text
 M CLAUDE.md
 M src/components/Header.tsx
 M src/components/account/ReferencesTab.tsx
 M src/components/composer/CreationComposer.tsx
 M src/components/generate/GenerateWorkspace.tsx
 M src/components/generate/ReferencePackPicker.tsx
 M src/components/prompt/BuildMode.tsx
 M src/components/prompt/CritiqueMode.tsx
 M src/data/composer-examples.ts
 M src/lib/generation/handoff.ts
 M src/lib/generation/pending-generation.ts
 M src/lib/generation/use-generation.ts
 M src/lib/product.ts
 M src/routes/favorites.tsx
 M src/routes/gallery.tsx
 M src/routes/generate.tsx
 M src/routes/index.tsx
 M src/routes/library.tsx
 M src/routes/prompt.tsx
 M src/routes/sitemap[.]xml.tsx
 M src/routes/templates.index.tsx
 M tests/unit/account-tabs.test.ts
 M tests/unit/commercial-auth.test.ts
 M tests/unit/composer-examples.test.ts
 M tests/unit/creation-composer.test.ts
 M tests/unit/generate-idle-no-visual.test.ts
 M tests/unit/generate-launch.test.ts
 M tests/unit/generate-workspace-layout.test.ts
 M tests/unit/inline-generation-no-navigate.test.ts
 M tests/unit/library-generate-autostart.test.ts
 M tests/unit/product-phase3.test.ts
 M tests/unit/product-story-ux.test.ts
 M tests/unit/prompt-modes.test.ts
 M tests/unit/seo-lock.test.ts
 M tests/unit/templates.test.ts
?? src/components/CreateWorkspace.tsx
?? src/components/CreatorDraft.tsx
?? src/components/HomeGenerateDemo.tsx
?? src/components/library/GalleryBrowser.tsx
?? src/components/library/LibraryCard.tsx
?? src/components/library/TemplatesBrowser.tsx
?? src/data/home-generate-examples.ts
?? src/hooks/use-gallery-reference.ts
?? src/lib/creator-search.ts
?? src/lib/library-browse.ts
?? tests/unit/creator-search.test.ts
?? tests/unit/library-browse.test.ts
?? tests/unit/unified-creator.test.ts
```

## Appendix B — Individual public route metadata

Generated from local SSR responses. All rows inherit the stale root app schema; blog visual/mobile body review is not implied by successful HTTP/metadata checks. The JSON artifact contains full titles, descriptions, canonicals, robots, OG/Twitter, icons and JSON-LD per route.


| Route | HTTP | H1 count | Canonical | Robots | Title/description | Share image |
|---|---:|---:|---|---|---|---|
| `/` | 200 | 0 | `/` | index, follow | present, unique | fixed local card |
| `/library` | 200 | 1 | `/library` | index, follow | present, unique | fixed local card |
| `/library?tab=gallery` | 200 | 1 | `/library?tab=gallery` | index, follow | present, unique | fixed local card |
| `/blog` | 200 | 1 | `/blog` | index, follow | present, unique | fixed local card |
| `/integrations/mcp` | 200 | 1 | `/integrations/mcp` | index, follow | present, unique | fixed local card |
| `/library?tab=templates` | 200 | 1 | `/library?tab=templates` | index, follow | present, unique | fixed local card |
| `/pricing` | 200 | 1 | `/pricing` | index, follow | present, unique | fixed local card |
| `/help` | 200 | 1 | `/help` | index, follow | present, unique | fixed local card |
| `/privacy` | 200 | 1 | `/privacy` | index, follow | present, unique | fixed local card |
| `/terms` | 200 | 1 | `/terms` | index, follow | present, unique | fixed local card |
| `/blog/depikt-image-generation` | 200 | 1 | `/blog/depikt-image-generation` | default index | present, unique | fixed local card |
| `/blog/your-ai-assistant-can-now-use-depikt` | 200 | 1 | `/blog/your-ai-assistant-can-now-use-depikt` | default index | present, unique | fixed local card |
| `/blog/chatgpt-images-2-5-whats-new` | 200 | 1 | `/blog/chatgpt-images-2-5-whats-new` | default index | present, unique | random hosted fallback — F12 |
| `/blog/how-to-prompt-chatgpt-images-2-5` | 200 | 1 | `/blog/how-to-prompt-chatgpt-images-2-5` | default index | present, unique | random hosted fallback — F12 |
| `/blog/chatgpt-images-2-5-precise-edits-reference-images` | 200 | 1 | `/blog/chatgpt-images-2-5-precise-edits-reference-images` | default index | present, unique | random hosted fallback — F12 |
| `/blog/chatgpt-images-2-5-posters-infographics-slides` | 200 | 1 | `/blog/chatgpt-images-2-5-posters-infographics-slides` | default index | present, unique | random hosted fallback — F12 |
| `/blog/chatgpt-images-2-5-prompt-examples` | 200 | 1 | `/blog/chatgpt-images-2-5-prompt-examples` | default index | present, unique | random hosted fallback — F12 |
| `/blog/how-to-prompt-gpt-image-2-for-logos` | 200 | 1 | `/blog/how-to-prompt-gpt-image-2-for-logos` | default index | present, unique | random hosted fallback — F12 |
| `/blog/how-to-prompt-gpt-image-2-for-infographics` | 200 | 1 | `/blog/how-to-prompt-gpt-image-2-for-infographics` | default index | present, unique | random hosted fallback — F12 |
| `/blog/how-to-prompt-gpt-image-2-for-ui-mockups` | 200 | 1 | `/blog/how-to-prompt-gpt-image-2-for-ui-mockups` | default index | present, unique | random hosted fallback — F12 |
| `/blog/how-to-prompt-gpt-image-2-for-storyboards` | 200 | 1 | `/blog/how-to-prompt-gpt-image-2-for-storyboards` | default index | present, unique | random hosted fallback — F12 |
| `/blog/how-to-prompt-gpt-image-2-for-product-shots` | 200 | 1 | `/blog/how-to-prompt-gpt-image-2-for-product-shots` | default index | present, unique | random hosted fallback — F12 |
| `/blog/ai-image-aspect-ratios-guide-gpt-image-2` | 200 | 1 | `/blog/ai-image-aspect-ratios-guide-gpt-image-2` | default index | present, unique | random hosted fallback — F12 |
| `/blog/free-alternative-to-promptbase-for-gpt-image-2` | 200 | 1 | `/blog/free-alternative-to-promptbase-for-gpt-image-2` | default index | present, unique | random hosted fallback — F12 |
| `/blog/best-free-ai-image-prompt-generator-2026` | 200 | 1 | `/blog/best-free-ai-image-prompt-generator-2026` | default index | present, unique | random hosted fallback — F12 |
| `/blog/how-to-prompt-gpt-image-2-for-posters` | 200 | 1 | `/blog/how-to-prompt-gpt-image-2-for-posters` | default index | present, unique | random hosted fallback — F12 |
| `/blog/depikt-vs-prompthero-for-gpt-image-2` | 200 | 1 | `/blog/depikt-vs-prompthero-for-gpt-image-2` | default index | present, unique | random hosted fallback — F12 |
| `/blog/ai-image-prompt-vocabulary-cheat-sheet` | 200 | 1 | `/blog/ai-image-prompt-vocabulary-cheat-sheet` | default index | present, unique | random hosted fallback — F12 |
| `/blog/how-to-prompt-ai-image-generators` | 200 | 1 | `/blog/how-to-prompt-ai-image-generators` | default index | present, unique | random hosted fallback — F12 |
| `/blog/gpt-image-2-prompt-examples` | 200 | 1 | `/blog/gpt-image-2-prompt-examples` | default index | present, unique | random hosted fallback — F12 |
| `/blog/chatgpt-image-prompt-tips` | 200 | 1 | `/blog/chatgpt-image-prompt-tips` | default index | present, unique | random hosted fallback — F12 |
| `/blog/ai-image-prompt-framework` | 200 | 1 | `/blog/ai-image-prompt-framework` | default index | present, unique | random hosted fallback — F12 |
| `/blog/ai-image-prompts-with-text` | 200 | 1 | `/blog/ai-image-prompts-with-text` | default index | present, unique | random hosted fallback — F12 |
| `/blog/gpt-image-2-vs-nano-banana-vs-midjourney` | 200 | 1 | `/blog/gpt-image-2-vs-nano-banana-vs-midjourney` | default index | present, unique | random hosted fallback — F12 |
| `/blog/ai-image-editing-change-preserve-match` | 200 | 1 | `/blog/ai-image-editing-change-preserve-match` | default index | present, unique | random hosted fallback — F12 |
| `/blog/ai-image-prompt-mistakes` | 200 | 1 | `/blog/ai-image-prompt-mistakes` | default index | present, unique | random hosted fallback — F12 |

### Evidence file guide

- `tests.log`, `typecheck.log`, `build.log`, `lint.log`, `changed-lint.log`, `diff-check.log`: validation outputs. Empty successful logs are expected for changed-file lint/diff checks.
- `metadata.json`, `route-summary.json`, `sitemap.xml`: raw local route evidence.
- `fixture-occurrences.txt`, `fixture-classification.json`: complete scoped QA-name inventory.
- `home-*`, `library-*`, `templates-*`, `gallery-*`, `pricing-*`, `signin-*`, `blog-*`, `help-*`, `mcp-*`: public responsive captures.
- `auth-*`, `template-dialog-*`, `account-*`, `references-*`, `result-detail-*`, `editing-*`: selected state captures.
- `cross-account-cache.png`: F01 local two-owner reproduction. No real identity/session secrets appear.
- Screenshot paths are under `output/final-product-audit`; original recorded artifacts remain untouched.
