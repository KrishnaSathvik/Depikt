# Final non-paid certification — September 25, 2026

**READY FOR RELEASE — NOT DEPLOYED**

Local product, tests, and four-viewport browser certification pass. Hosted V4/V5 schema, migrations, owner RLS, Reference Pack ownership, and private `generation-assets` storage were verified through Lovable’s authorized read-only database view. This is not a production publish, feature enablement, or secret-value inspection. The four-viewport browser pass was not rerun after that Lovable confirmation.

V4 grounding, V5 validation, and automatic repair remain part of the release candidate. Local implementation and verification are done. The production goal remains generation, grounding, validation, and automatic repair ON, with the locked economics (max 3 web queries, 2 visual queries, 8 sources, 1 automatic repair per request; those stages add 0 credits). This report does not remove V4/V5 or downgrade the product to V3.

Remaining unread Lovable-hosted items are an operational configuration checklist for later publish/enablement: secret presence, V4/V5 runtime flags, Stripe webhook registration, custom-domain binding, and log retention. They are not a schema, RLS, storage, or local-product blocker. They also do not authorize deployment.

## Candidate and evidence chain

- Branch: `main`; HEAD remains `4bc4e7482ac0cf03957e4f504198836bb065fcad`.
- The starting uncommitted candidate was preserved. Status, diff stat, tracked/untracked lists, HEAD, branch, and SHA-256 hashes were recorded before verification in `output/final-certification/`.
- Certification found one concrete accessibility defect: the standalone 404 page had an H1 but no main landmark. In `src/routes/__root.tsx`, its outer `div` was changed to `main`. This is the only additional product-code change made during certification.
- Tests, typecheck, build, lint, and diff check were rerun after that change. Browser captures were refreshed against that rebuilt candidate. No commit, push, reset, deployment, migration, or production configuration change occurred.
- The final candidate/evidence manifests record file hashes. Evidence is local and ignored by Git; retain the directory alongside this report before sharing or archiving the certification.

## Local isolation

The production build was served only on `127.0.0.1:4173`. The local harness replaces server-side outbound `fetch`, denies API traffic and non-GET/HEAD requests, and uses the application's checked-in public catalogue fallback. Browser interception blocks non-local requests and supplies synthetic authentication, account, billing, creation-detail, and reference-pack responses. Even read-looking billing/session requests are intercepted, since live handlers can settle credits or run grant RPCs.

Previously recorded images were reused as local inputs, not as screenshot evidence. All screenshots in this certification directory are fresh captures. External prompt thumbnails are intentionally blocked and can show the application's fallback; Gallery assets and recorded creation images are local. No third-party auth flow was completed. The signed-out Generate control was used only to open its pre-submission auth dialog; no generation plan/job, edit Apply, checkout, real reference save, or real delete was submitted.

The in-app browser had no discoverable connection. A working standalone Playwright browser supplied the actual interactive evidence. Test harness corrections (hydration waits, current mock billing response fields, and catalogue-failure fallback) were confined to ignored output files.

## Browser results

| Viewport | Public pages and modes | Auth | Account/details/references | Editing and saved series | Layout |
| --- | --- | --- | --- | --- | --- |
| 390×844 | PASS | PASS | PASS with local mocks | PASS; additional touch test | No measured page overflow; inspected dialogs fit |
| 768×1024 | PASS | PASS | PASS with local mocks | PASS | No measured page overflow; inspected dialogs fit |
| 1200×760 | PASS | PASS | PASS with local mocks | PASS | No measured page overflow; inspected dialogs fit |
| 1440×900 | PASS | PASS | PASS with local mocks | PASS | No measured page overflow; inspected dialogs fit |

- **Home:** Images 2.5 hero, one H1/main, Generate/Improve prompt/Critique, shared prompt retention, reference controls, and Home mode switching. No old Prompt workspace appeared.
- **Library:** Prompts, Templates, Gallery, type-specific search labels, no-result states, footer, Favorites filtering, reviewed Gallery labels, and local image assets. Switching from an Images 2.5 collection to Templates removed collection filtering; switching from Posters to Gallery removed category filtering. A Gallery search for `cat` included the reviewed ink-cat record. Checked-in fallback prompts and templates rendered. No UUID-facing titles were seen in the displayed Gallery page.
- **Pricing/Help:** plans, credit language, sign-up allowance, support email, reference limits, and current feature-availability explanations rendered. Help sections were expanded. No checkout or support message was sent.
- **Auth:** sign-in, sign-up, 5-free-credits copy, prompt preservation, keyboard cycling within the auth dialog, and focus return passed. A controlled pending-auth mock verified that the header withheld Sign in until auth resolved, at all four sizes. No DEV AUTH appeared. One immediate focus sample preceded the close effect; the follow-up explicitly awaited restoration and passed at all four sizes, with three additional mobile repetitions. `library-extra-results.json` records the settled focus check; the original sample remains in `public-results.json`.
- **Account:** Creations, result detail, saved-version switching, status lines, source disclosure, profile controls, and mocked sign-out. Opening a saved result in Generate closed the account dialog. Fresh owner-switch and late-response browser checks showed zero owner-A images in owner-B's failed view; no stale owner-A prompt appeared.
- **References:** empty and existing-pack views; create/edit forms without saving; delete confirmation and cancellation; bounded failed-image recovery/fallback. The forms and confirmation dialogs remained within the tested viewport bounds and could scroll.
- **Editing:** Whole image and Select area, labelled edit textarea, described/focusable canvas, visible canvas focus, Brush/Erase selection, brush-size keyboard adjustment, drawing, Undo, Clear, and Cancel. Mobile emulated touch painting and Undo passed. Paid Apply was not clicked. Keyboard painting is not implemented; Whole image remains the keyboard editing alternative.
- **Series:** out-of-order saved rows grouped by session with child labels and loaded counts. Mocked details showed completed/failed/pending outputs, missing saved-image copy, and the explanation that a new attempt does not resume a failed output. Saved output/version opening passed. These are presentation checks using persisted-shaped mocks, not live execution or database-persistence checks.
- **Error states:** empty Library, empty Creations, empty references, image recovery/fallback, deleted creation recovery, unavailable validation, empty sources, original retained after unavailable refinement, and real local 404. Disabled generation was checked separately against the actual rebuilt Worker: 404 before authentication/outbound access. The compiled client stays in its existing enabled configuration, so this is server-boundary evidence, not a screenshot of a disabled-client build.

Accessibility evidence covers H1/main landmarks, control names and labels, image alt attributes on public surfaces, visible keyboard focus, representative tab order, dialog focus cycling/restoration and bounds, unrestricted viewport zoom configuration, and mobile touch controls. Critical editing/reference controls were operated without hover. This is not full WCAG, screen-reader, physical-device, or multi-browser certification.

### Evidence

All files are under `output/final-certification/`. Screenshot families include:

- `home-*`, `library-prompts-*`, `library-templates-*`, `library-gallery-*`, `library-favorites-*`
- `pricing-*`, `help-*`, `signin-*`, `signup-*`, `auth-gate-*`, `auth-loading-*`
- `account-*`, `creation-detail-*`, `references-*`, `editing-*`, `series-*`, `error-state-*`

Machine-readable results: `public-results.json`, `account-results.json`, `supplemental-results.json`, `library-extra-results.json`, `owner-results.json`, `touch-results.json`, `loading-results.json`, and `reference-fallback-results.json`. `generation-disabled.json` and `compiled-controls.log` contain the non-browser runtime-control checks. Harness scripts are saved with the evidence.

## Hosted production verification

Production hosting for this release is **Lovable-managed**, not the operator’s personal Cloudflare account. Browser certification was not rerun. Direct Supabase CLI linking was not retried. Unrelated ShadowDevil CLI projects (ApplyTrak, KyneChat, NutriScope) were not touched. No deploy, publish, secret/var change, feature-flag change, live generation, grounding/search, validation/OCR, Stripe checkout, database write, migration, secret rotation, commit, or push occurred. No secret values, partial values, prefixes, suffixes, or fingerprints were printed.

- **Lovable project:** ShadowDevil / Depikt (`c75a7063-b63d-46d5-9858-c597b9d906a7`); published; cloud database enabled; database stack Supabase
- **Lovable reported project commit:** `4bc4e7482ac0cf03957e4f504198836bb065fcad` (matches git HEAD; the certified candidate still includes uncommitted local changes that have not been published)
- **Hosted Supabase schema/RLS/storage:** VERIFIED THROUGH LOVABLE
- **Personal Cloudflare account as Depikt production host:** no; not a release blocker for this Lovable path
- **V4/V5 runtime flags:** NOT VERIFIED
- **Secret/binding presence:** NOT VERIFIED
- **Custom-domain production binding:** NOT VERIFIED
- **Observability / log retention:** NOT VERIFIED
- **Stripe webhook registration:** NOT VERIFIED

Lovable project metadata still describes Depikt primarily as a prompt-refinement tool. That is low-priority dashboard copy, not a public-site or release blocker.

### Hosted database, RLS, and storage — VERIFIED THROUGH LOVABLE

Owner read-only inspection of the Lovable-managed production database. Structures are present, not merely assumed from migrations. They are not marked missing.

| Object | Hosted result |
| --- | --- |
| `generation_grounding_cache` | Present |
| `generation_sessions` | Present; `plan_json` present |
| `generation_jobs` | Present; `validation_result`, `repair_attempts`, `usage_json` present |
| `generation_request_repairs` | Present |
| `image_versions` | Present |
| `reference_entities` | Present |
| `reference_entity_assets` | Present |
| `claim_generation_repair` | Present |

Recorded as applied: `20260917120000`, `20260917130000`, `20260918120000`.

Deployed owner RLS predicates use `auth.uid() = user_id` on `generation_grounding_cache`, `reference_entities`, `reference_entity_assets`, `generation_sessions`, `generation_jobs`, and `image_versions`. The image-version insert policy also requires the referenced session and job to belong to the same user.

Storage bucket `generation-assets` exists with `public = false`. Deployed object policies restrict read/write to `users/<auth.uid()>/...`.

This closes the earlier limitation that schema/RLS/storage could not be independently inspected because Lovable manages the project. Direct Supabase CLI access is not required.

### Cloudflare personal account — not the production path

`npx wrangler whoami` succeeded for `krishnasathvikm@gmail.com` / account `f3d62597b9f59fc114c6def1ed4f60fe`. That account has one unrelated Worker (`ai-density-map-tiles`), no Pages projects, zone `trailiecrew.com`, and no Depikt Worker (`tanstack-start-app` and Depikt-named scripts 404). Unrelated Worker secrets were not listed.

That mismatch is **not** a Depikt release blocker unless Depikt is intentionally moved onto that personal account. The production path for this certification is the published Lovable project above. Do not deploy Depikt from the personal Cloudflare login.

Committed Wrangler `vars` still pin `GROUNDING_ENABLED=false`, `VALIDATION_REPAIR_ENABLED=false`, `AUTO_REPAIR_POLICY=disabled`. Those committed defaults are not a substitute for unread Lovable runtime flags.

### Remaining Lovable-hosted operational checklist

Lovable’s available read-only tools did not expose production secret presence or V4/V5 runtime variables in a certifiable way. Unread means unread, not absent.

| Setting | Expected | Hosted | Match |
| --- | --- | --- | --- |
| Generation runtime (`GENERATION_ENABLED`) / compiled `VITE_GENERATION_ENABLED` | Report actual hosted state; committed compiled client is `true` | NOT VERIFIED | NOT VERIFIED |
| Grounding (`GROUNDING_ENABLED`) | `false` until intentionally enabled | NOT VERIFIED | NOT VERIFIED |
| Validation (`VALIDATION_REPAIR_ENABLED`) | `false` until intentionally enabled | NOT VERIFIED | NOT VERIFIED |
| Auto repair (`AUTO_REPAIR_POLICY`) | `disabled` until intentionally enabled | NOT VERIFIED | NOT VERIFIED |
| `OPENAI_API_KEY` | Present before live generation | NOT VERIFIED | NOT VERIFIED |
| `BRAVE_SEARCH_API_KEY` | Optional while grounding is OFF | NOT VERIFIED | NOT VERIFIED |
| `GROUNDING_PROVIDER_URL` / `GROUNDING_PROVIDER_TOKEN` | Optional gateway | NOT VERIFIED | NOT VERIFIED |
| `VALIDATION_PROVIDER_URL` / `VALIDATION_PROVIDER_TOKEN` | Optional gateway | NOT VERIFIED | NOT VERIFIED |
| `GENERATION_PLAN_SECRET` | Present before signed plans | NOT VERIFIED | NOT VERIFIED |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | Present for the Lovable-managed backend | NOT VERIFIED as named env bindings; project/database themselves are verified through Lovable | NOT VERIFIED |
| `SUPABASE_SERVICE_ROLE_KEY` | Present for privileged server paths | NOT VERIFIED | NOT VERIFIED |
| `STRIPE_SECRET_KEY`, Stripe price identifiers | Present for billing | NOT VERIFIED | NOT VERIFIED |
| `STRIPE_WEBHOOK_SECRET` | Present for fulfillment | NOT VERIFIED | NOT VERIFIED |
| Stripe webhook registration | Registered for the production billing endpoint | NOT VERIFIED | NOT VERIFIED |
| Custom-domain production binding | `depikt.app` bound to this published project | NOT VERIFIED | NOT VERIFIED |
| Hosted log destination / retention | Inspectable operational logging | NOT VERIFIED | NOT VERIFIED |

Confirm this checklist in Lovable (presence only, no secret values) before publish or production enablement. No hosted flag was changed in this pass. If a later read shows grounding, validation, or automatic repair enabled unexpectedly, stop and report it without changing configuration.

### Observability and billing

| Field | Result |
| --- | --- |
| Hosted log access | NOT VERIFIED |
| Structured application logs collectable | NOT VERIFIED |
| Error visibility | NOT VERIFIED |
| Log destination | NOT VERIFIED |
| Retention | NOT VERIFIED |
| Stripe webhook registration | NOT VERIFIED |

No production tail was started. No request was triggered to create telemetry. No Stripe API, checkout, or webhook test was performed.

## Fresh non-paid checks after the defect fix

| Check | Result |
| --- | --- |
| `npm test` | 944 passed; 0 failed, cancelled, or skipped |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run lint` | PASS: 0 errors, 14 existing Fast Refresh warnings |
| `git diff --check` | PASS |
| Compiled release controls | PASS: 3 grounding guards, 2 validation guards, 1 repair-policy function; mocks only |
| Rebuilt Worker generation-disabled handler | PASS: 404 before auth/network |

## Boundary and verdict

| Operation | Result |
| --- | --- |
| Live generation/edit, search/grounding, validation/OCR, repair provider calls | **0** |
| Hosted/database writes | **0** |
| Deploy / publish / create hosted version | **NO** |
| Production configuration or flag changes / activation | **NO** |
| Secret rotation | **NO** |
| Commit / push | **NO** |

**READY FOR RELEASE — NOT DEPLOYED.** Local product, tests, and four-viewport browser certification remain valid and were not rerun. Hosted schema, V4/V5 migrations, owner RLS, Reference Pack ownership, and private generation storage are verified through Lovable. V4/V5 remain in the candidate. The personal Cloudflare account is not the production path. Remaining unread Lovable secrets, runtime flags, webhook registration, custom-domain binding, and log retention are a publish/enablement checklist, not a product-code blocker, and they do not authorize deployment. Review this certification and stop before committing.
