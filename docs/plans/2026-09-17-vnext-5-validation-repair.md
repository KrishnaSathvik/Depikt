# VNext 5 — validation and targeted repair

> Historical implementation record. The per-job repair allowance, quality-failure refund, and pending economic decision below are superseded by [the frozen launch policy](2026-09-18-vnext-5-launch-economics.md). Both features remain disabled.

Implementation remains disabled unless `VALIDATION_REPAIR_ENABLED=true`. No live image generation, live judging, visual-quality comparisons, or browser verification was run. No new benchmark image fixtures were created. The program stops here; campaign memory and VNext 6 are excluded.

## Execution and checks

`/jobs` derives measurable checks from the verified signed intent, selected entity packs, mask and confirmed count. Each child has its own signed validation plan: exact text belongs to the child whose brief includes it. Omitted required series text fails planning before credit reservation.

The entire execution plan is additionally authenticated against the owner, child prompt hashes, idempotency keys, operation, source version and dimensions. `/run` verifies this authorization before loading inputs. Removing a snapshot or transplanting a valid snapshot from a different job fails closed. JSONB key ordering does not invalidate signatures. Drain pre-feature queued jobs before activating either flag, because activation requires the new execution authorization.

Checks include dimensions, actual session job count, reference-entity availability, exact text, unwanted text, object count, character/product/brand identity, entity distinction, composition, and edit preservation. Subjective checks receive explicit entity-to-reference-image bindings.

Dimensions/count/reference availability are deterministic. OCR extracts text, then code compares Unicode-normalized text with case/punctuation/word boundaries/repeated-label counts preserved. OCR confidence below 0.90 is unavailable. Judge confidence below 0.80, missing/duplicate decisions, or provider failures are unavailable, never a pass. The judge cannot submit actions or edit prompts.

Masked preservation compares normalized RGBA differences outside fully transparent/partially transparent mask pixels. The initial threshold is 0.015. This is a pixel-change measure, not proof of semantic identity. RGB/RGBA 8-bit, non-interlaced PNGs up to 16 million pixels are supported; unsupported source/mask formats are unavailable. Whole-image preservation uses the visual judge when a deterministic mask comparison does not apply. Thresholds and judgment quality await the consolidated final verification.

## Bounded repair and economics

Structured repair actions are retry generation, stronger reference fidelity, retry the original masked edit, remove unwanted text, and re-render exact text. They are selected in code from failed checks. Missing evidence or reference inputs cannot trigger automatic repair. A repair is validated again; there is no recursive repair loop.

`MAX_AUTO_REPAIR_ATTEMPTS=1` is fixed in code. A persisted atomic PostgreSQL claim also limits each running job to one repair; a trigger prevents resetting the counter or moving a started/terminal job back to a claimable state. The existing queued-to-running job claim prevents duplicate `/run` calls from generating concurrently.

`AUTO_REPAIR_POLICY` is unset by default, which disables paid repairs even when validation is enabled. A dormant `platform_absorbs_one` option exists for later economic approval: one reserved credit covers a successful result including its single repair, with no extra user charge. This policy has **not been activated or adopted**. A result that still fails validation is not published and the original reservation is refunded once. Successful jobs record both image attempts and validation-provider cost telemetry; external validation gateways have unknown provider cost unless integrated later.

## Providers and activation prerequisites

Default OCR and visual judge adapters use the existing OpenAI Responses client, respectively the existing Luna intent configuration and Terra critic configuration, with a single attempt and 30-second timeout per call. OCR is recognition only; comparison is deterministic. No provider is called for a deterministic-only request. `OPENAI_API_KEY` is already required by native generation. Tests inject fetch; no real model requests were made.

An optional vendor-independent gateway may instead be configured with `VALIDATION_PROVIDER_URL` and `VALIDATION_PROVIDER_TOKEN`. It accepts authenticated POST `{operation,input}`:

- `ocr`: input `{image:{mimeType,base64}}`; output `{text,confidence}`.
- `judge`: input `{image,references,checks,referenceBindings}`; output array of `{id,passed,confidence,evidence}`. Reference bindings use zero-based indices in references.

Apply the two new migrations before enabling either phase. Production migrations, provider credentials, feature activation, final economic approval, and live verification remain deferred. The feature flags are not set by this change.

## Offline verification

- All 737 unit tests passed, including mocked successful repair, failed repair/refund, no third generation, masked source/mask preservation, deterministic checks, OCR edge cases, judge uncertainty, series text scoping, token/cache/execution tampering, cache reuse, and concrete provider request contracts.
- Existing VNext 3 PNG fixture decoded and compared offline, without visual review.
- Typecheck and production build.
- Changed-file ESLint. Repository-wide lint has pre-existing failures outside the authorized scope; it is not clean.
- `scripts/test-vnext-db.sh`: disposable local PostgreSQL over a Unix socket. Real migration application, RLS isolation, owner-bound claims, terminal-state rejection, one-attempt limit, monotonic counter, and anonymous privilege rejection all passed. No production database was touched.

The frozen final suite is `tests/image-evals/final/matrix.json`. It has not been executed. Use existing VNext 2/3 fixtures as edit/reference inputs; the plain-regression scenario regenerates the single-image scenario, so regeneration is included in the 18-image cap. The sole deliberately repairable scenario permits one additional repair image. Do not create more fixtures or rerun failed scenarios without revisiting the budget. One comprehensive browser pass follows, using these same outputs.
