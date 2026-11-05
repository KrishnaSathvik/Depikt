# Step 4 — Images 2.6 Media Capabilities

Development implementation, 2026-11-05. Nothing published, deployed, or applied to the shared database. No paid provider requests or payment operations. Existing subscription prices and raster operation charges are unchanged. Step 5 has not started.

## Status and release blockers

Markup and native SVG are implemented through the existing pipeline. Animated GIF request support, parsing, storage plumbing and playback are implemented, but paid GIF execution is deliberately disabled until its cost benchmark establishes a server-owned credit policy. This is not a claim that all three have been verified against the real provider.

1. Active model family remains 2.5. SVG requires the existing `IMAGES_MODEL_FAMILY=2.6` switch at an approved release. No configuration was changed here; selecting SVG while 2.5 is active is rejected before credit reservation.
2. `supabase/pending/step4_media_metadata.sql` is prepared only, after Steps 1–3. Native SVG version inserts require its metadata column. Raster reads/writes do not require this new column. No live bucket settings were read or modified; deployed MIME/size acceptance remains unverified.
3. Real markup alignment/behavior, SVG authoring usage and animation generation are unverified because paid calls were prohibited. GIF's total provider request pixel budget is not quantitatively documented in the guide; there is no invented cost or credit multiplier.
4. **Inherited Step 3 security limitation:** the authenticated owner can invoke `create_generation_job(s)` directly, whose return value contains execution tokens, including idempotent replay. Hiding the token column and encrypting the session copy do not prevent that RPC disclosure. The existing 42 isolation tests confirm the column/transition checks, not that tokens are inaccessible through creation RPCs. This remains a release blocker; Step 4 preserves those RPCs as requested rather than silently redesigning the production trust boundary. An approved follow-up must establish a genuinely server-only mint/claim boundary before treating execution-token secrecy as proven.

## 4A — Markup-guided editing

### User-facing behavior

- Markup is a third mode beside Select area and Whole image.
- Freehand, arrows, ellipses, rectangles, text labels, undo and clear.
- Original image stays separate beneath an aligned transparent canvas. Only PNG overlay bytes are exported.
- Mouse/touch share pointer capture; keyboard arrows move a virtual drawing position, Enter/Space start/finish, undo supports the control and Ctrl/Cmd+Z. Labels are capped at 120 characters.
- Apply is unavailable with no annotations. Switching to area/whole does not submit the markup layer.

### Integration/security

Authenticated `/api/generation/markup` reads an owner-scoped PNG source, consumes a bounded JSON stream, validates RGBA PNG CRCs, dimensions, decoded transparency and coverage, and writes a private immutable overlay. The signed plan carries only the server-derived owner path; clients cannot supply a markup storage path or price. Plans revalidate the stored PNG. Execution requires the original source and rejects markup plus mask. OpenAI multipart uses exactly `markup` with the original image first.

Limits: aligned dimensions after orientation; 16,777,216 pixels; 50 MiB local byte ceiling (the provider guide says 50 MB); local feature currently accepts PNG source versions only. Existing JPEG/WebP creation handling is unchanged; orientation/conversion for non-PNG markup sources is not implemented. Per-annotation editing/repositioning is not included. Current export occurs on annotation state changes; very large canvases still need profiling before release.

Credit behavior: unchanged one-credit image edit; uploads/planning do not reserve credits. Existing signed jobs, transitions and settlement/recovery paths are reused. Raster auto-validation/repair is intentionally skipped for markup because a repair cannot safely assume annotation semantics.

Files specific to 4A:

- `src/components/generate/GenerationMarkupEditor.tsx`
- `src/components/generate/GenerationEditForm.tsx`
- `src/lib/generation/markup.ts`
- `src/lib/generation/bounded-json.ts`
- `src/routes/api/generation/markup.ts`
- Shared paths listed below.

## 4B — Native SVG

### User-facing behavior

PNG/SVG output selection uses the existing composer. Native vector output has `.svg` private storage and downloads, image-only preview, and optional browser PNG preview export without replacing the vector. Account downloads retain the correct extension. Native SVG edit actions are disabled because the provider does not support SVG edits.

### Integration/security

Output and model family are bound to the signed plan and execution authorization, never unsigned `/jobs` fields. Pre-reservation capability validation rejects SVG on 2.5 or any edit/reference operation. SVG uses the generations endpoint, `n=1`, `output_format=svg`; no compression/streaming/rewriter. Returned base64 is decoded as UTF-8 XML, parsed by xmldom, rejected if malformed/active/external, and serialized as allowlisted static vector content. Scripts, event handlers, embedded raster, foreignObject, style attributes, external references, entities and recursive `<use>` are rejected. Node/depth/byte limits are enforced. Preview uses `<img>`, never inline HTML insertion. Unknown safe SVG features outside the allowlist are rejected rather than guessed.

Native vectors bypass PNG-centric OCR/automatic raster repair so the output cannot silently become PNG. Storage failure or validation rejection follows the ordinary failed-job refund; charge only follows successful private upload, version insert and success transition. Local SVG charge remains the existing one-credit successful image operation; actual SVG authoring cost has not been benchmarked and is recorded as a limitation rather than equated to raster cost.

Files specific to 4B:

- `src/lib/generation/media.ts` (SVG parser and native MIME/metadata)
- `src/lib/generation/svg-export.ts`
- `src/components/generate/MediaControls.tsx`
- `src/lib/generation/media-metadata-read.ts`
- `supabase/pending/step4_media_metadata.sql`
- Shared paths listed below.

## 4C — Animated GIF

### User-facing behavior

Animated GIF option, frame count and frame duration controls; unavailable/pending-cost state with disabled submission, not a misleading one-credit label. Motion and desired loop are prompt instructions, not unsupported API knobs. Playback has play/pause/restart and respects reduced motion. Native `.gif` download keeps original bytes. Account details use the same playback view. No per-frame editor is claimed.

### Integration/security

Adapter sends `output_format=gif`, `frame_count`, `frame_duration_ms` to the native generations endpoint. Registry/request checks enforce integer 2–64 frames and 20–2000 ms; request duration is rounded to 10 ms. These values were confirmed from the official guide retrieved on 2026-11-05, not from an older reference snippet claiming 16 frames.

Before library parsing, a bounded GIF block walk rejects unknown extensions, truncated blocks and invalid trailers/LZW code sizes. Metadata reads actual logical dimensions, frame rectangles, delays and Netscape loop count rather than copying request values. Max 64 frames, 3840-pixel edges and a local total-pixel bound; max file size 50 MiB. No all-frame RGBA decompression is used for previews. Compressed pixel correctness is delegated to the browser decoder; full bounded LZW verification and large-file browser performance benchmarking remain release work. Exact pause captures the current native frame to a canvas; original bytes are never re-encoded.

**Credits:** `media-pricing.ts` has a server-authoritative operation quote. GIF returns no credit amount and `executable=false`; `/plans`, `/jobs`, and the executor all refuse unpriced paid animation. It cannot reserve a guessed one credit. The pipeline is ready to carry metadata when a benchmark-approved policy is added, but real GIF job creation/execution remains blocked. Existing interruption/recovery, idempotency, cancellation and settlement architecture is preserved; no automatic provider retry is introduced because retry after an ambiguous response can incur a second paid call.

Files specific to 4C:

- `src/components/generate/AnimatedMediaPreview.tsx`
- `src/lib/generation/gif-structure.ts`
- `src/lib/generation/media-pricing.ts`
- Shared media parser, controls, adapter and pipeline below.

## Shared architecture and exact changed files

Security/pipeline:

`src/lib/generation/provider-capabilities.ts`, `openai-images.ts`, `job-request.ts`, `plan-token.ts`, `execution-plan.ts`, `execution-auth.ts`, `job-pipeline.ts`, `supabase-data-access.ts`, `storage-paths.ts`, `persist-execution-tokens.ts`.

API paths:

`src/routes/api/generation/plans.ts`, `jobs.ts`, `jobs.$id.run.ts`, `sessions.$id.ts`.

Client/version/download paths:

`src/lib/generation/client.ts`, `use-generation.ts`, `pending-generation.ts`, `result-state.ts`, `live-poll.ts`, `live-poll-read.ts`; `src/components/generate/GenerateWorkspace.tsx`, `InlineGenerationPanel.tsx`, `GenerationCanvas.tsx`, `GenerationActions.tsx`; `src/lib/profile/client.ts`; `src/routes/api/account/creations.ts`, `creations.$id.ts`; `src/components/account/CreationDetailView.tsx`.

Interrupted token persistence is recovered through idempotent creation; a prepared atomic merge RPC preserves sibling entries and the signed document. Execution MAC excludes only the separately mutable encrypted token map; media and annotation paths remain covered. This also corrects missing token persistence wiring inherited from Step 3. Token disclosure limitation above still applies.

Dependencies: `package.json`, `bun.lock` add `@xmldom/xmldom`, `gifuct-js`, `fast-png` (pure JS, bundled; no native Node image package). Generated `src/routeTree.gen.ts` updated automatically for the markup endpoint.

Required metadata gaps repaired only in `src/routes/account.tsx` and `src/routes/history.tsx`; other content routes were audited and already use route-specific metadata.

Architecture/docs: `AGENTS.md`, `roadmap.md`, this report.

Tests: `tests/unit/generation-media.test.ts`, existing `generation-apply-edit-mask.test.ts`, `generation-mask-editor.test.ts`, `generation-model-router.test.ts`, `product-story-ux.test.ts`. Existing source-inspection checks were updated for expanded media contracts; new tests assert behavior and money/limit rules, not snapshots.

Database harness: `supabase/pending/step4.sh`, `step4_harness_setup.sql`, `step4_media_metadata.sql`, and `step3.sh` (numeric equality assertion made scale-independent; optional Step 4 checks). Local scaffold stubs unrelated profile/subscription lifecycle helpers and does not test their hosted configuration.

## Verification

- New media test file: **19/19 passed**. SVG adversarial/malformed checks; exact markup alignment/alpha; native API request payloads; preserved GIF bytes, actual two-frame delays 200/300 ms, 500 ms total and infinite loop; fixed image charge; GIF refusal; bounded JSON; signed media tampering; vector success/storage failure settlement.
- Full existing+new unit suite: **991/993 passed**. Two known pre-existing failures remain in `generation-validation.test.ts`: missing `vnext3-brand-a-logo.png` fixture and stale expected exception for child exact-text scoping. Neither was hidden or skipped.
- Isolated Postgres: **52/52 passed** (42 existing token/permission checks plus ten merge/settlement checks). No production database access. See limitation: passing checks do not establish server-only RPC token secrecy.
- Harness preview compilation/type validation: latest **build OK**, with no manual build/typecheck invocation (platform harness runs these).
- New module lint: zero errors; helper export warning was removed afterward.
- Browser: signed in as the requesting account, read its real balance and an existing saved creation; markup pointer drawing + keyboard rectangle + undo/clear + apply enable/disable verified. No Apply click/provider execution. Mobile 440px had no page overflow. GIF fixture pause/play/restart and SVG PNG export were exercised offline; no page runtime errors. Screenshots checked.
- End-to-end paid media creation/storage through the hosted stack is **not verified** under the no-paid-calls/no-migrations constraint. Touch gestures and tablet-sized controls require additional direct browser checks; desktop/mobile pointer and keyboard were exercised.

## Stop point

Step 4 development work and report are delivered; paid animation, provider verification and release remain gated. Do not deploy this as a completed security/media release yet. No Step 5 changes.

Official reference checked: https://developers.openai.com/api/docs/guides/image-generation (markup upload and alignment, SVG restrictions, GIF frame/duration fields, authoring-cost caveat).