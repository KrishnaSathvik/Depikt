# Images 2.6 Feature Milestones (Step 4+)

Architecture preparation only — none of this is implemented in Step 3.
Order is deliberate: each step ships value without depending on the next.

## Step 4a — Markup-guided editing (smallest, reuses the edit pipeline)

- API: `markup` field on `/v1/images/edits`; annotation layer (PNG overlay)
  applies to the first input image; mutually exclusive with `mask`.
- Architecture: new `markupAssetId`/`markupPath` on the execution plan next
  to the existing mask fields; same signed-plan + execution-token flow;
  `assertImageRequestSupported` already rejects mask+markup combinations.
- UI: reuse the paint editor in an "annotate" mode (draw arrows/circles
  instead of an erase mask). Desktop + mobile touch.
- Requires family = 2.6 (or 2.5, which also supports markup — can ship
  before the family cutover).

## Step 4b — SVG generation and export

- API: `output_format: "svg"` on generations only, `n=1`, no streaming or
  compression; static vectors only (no scripts/external resources).
- Architecture: `image_versions.mime_type` already carries the type; add
  `image/svg+xml` storage + download path; skip the raster validation
  pipeline for SVG jobs (OCR/visual judge don't apply; needs an SVG
  well-formedness check instead).
- UI: "Vector" output toggle in the creator; download as .svg; preview via
  `<img>` (safe: API guarantees no scripts).

## Step 4c — Animated GIF generation and playback

- API: `output_format: "gif"` on generations only; `frame_count` 2–64
  (default 9), `frame_duration_ms` 20–2000 (default 200); frame size `auto`
  or WxH multiples of 16; total pixel budget applies.
- Architecture: credit cost per GIF needs a benchmark measurement first
  (token usage unknown; likely multiples of a still image — do NOT assume
  1 credit). Storage/versions already format-agnostic via mime_type.
- UI: motion toggle, frame-count/duration controls, inline playback
  (`<img>` plays GIFs natively), download as .gif.
- Note: per-frame editing and speed controls are ChatGPT-only, not API —
  do not promise them.

## Step 5 — UI/UX and mobile improvements

- Format picker (image / vector / motion) in the creator.
- Markup annotation editor on touch devices.
- Format-specific download buttons and share previews.
- All gated behind the benchmark verdict and the family's production
  cutover.

## Cross-cutting requirements for every Step 4 feature

- Registry first: new request fields land in `provider-capabilities.ts`
  and are validated before credit reservation.
- Credits: measure real token cost per format before setting credit
  prices; flat 1-credit holds until then.
- Security: new job types ride the same signed-plan + execution-token +
  idempotent-settlement invariants; add DB tests per feature.
