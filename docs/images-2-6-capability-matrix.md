# Images 2.6 API Capability Matrix

Verified 2026-11-05 against the OpenAI API changelog (Nov 4, 2026), the image
generation guide, the image prompting guide, and the two model pages.
"Documented" = stated in official docs. Nothing here is verified by a live
paid call yet — that is what the benchmark plan (images-2-6-benchmark-plan.md)
is for.

## Models

| Model ID | Role | Endpoints |
|---|---|---|
| `gpt-image-2.6-flare` | Fast iteration; ~6 s at low quality | `v1/images/generations`, `v1/images/edits` |
| `gpt-image-2.6-sunburst` | Detail, layout, edit precision | `v1/images/generations`, `v1/images/edits` |

Neither model is available on Responses, Chat Completions, Batch, Realtime,
or Fine-tuning endpoints (model pages, endpoint tables).

## Capability matrix

| Capability | 2.5 Flare/Sunburst | 2.6 Flare/Sunburst | Status |
|---|---|---|---|
| Text-to-image (`/images/generations`) | yes | yes | Documented; 2.5 verified in production |
| Image edit (`/images/edits`, references + mask) | yes | yes | Documented; 2.5 verified in production |
| Quality `low/medium/high/xhigh/max/auto` | yes | yes | Documented; 2.5 `max` verified |
| Sizes 1024², 1536x1024, 1024x1536 + custom (multiples of 16, aspect 1:3–3:1, ≤3840px edge, 655,360–8,294,400 px) | yes | yes | Documented; 2.5 standard sizes verified |
| Output `png`/`jpeg`/`webp` + `output_compression` | yes | yes | Documented; png verified |
| Transparent background (`background: transparent`, png/webp) | yes | yes | Documented, untested by Depikt |
| `complexity` (`low/medium/high`, default `high`, no extra fee) | **no** | yes | Documented, untested |
| Markup-guided edits (`markup` field on `/images/edits`; ≤16,777,216 px; 50 MB; mutually exclusive with `mask` and `prompt_rewriter`) | yes | yes | Documented, untested |
| SVG output (`output_format: "svg"`, generations only, `n=1`, no streaming/compression/prompt_rewriter; static vectors only) | **no** | yes | Documented, untested |
| Animated GIF output (`output_format: "gif"`, generations only; `frame_count` 2–64 default 9; `frame_duration_ms` 20–2000 default 200; size `auto` or WxH multiples of 16) | **no** | yes | Documented, untested |
| Reference images per request | examples use ≤4, no documented hard max | same | Undocumented limit — Depikt's V1 cap of 4 is a product choice, unchanged |
| `moderation` (`auto`/`low`) | yes | yes | Documented, untested |
| Per-frame GIF editing, GIF speed UI | ChatGPT-only | ChatGPT-only | **Not an API capability** — do not plan around it |

## Pricing (identical for 2.5 and 2.6, both models)

- $5 / 1M text input tokens ($1.25 cached)
- $8 / 1M image input tokens ($2 cached)
- $30 / 1M image output tokens
- Cached rates apply only through the Responses API, which Depikt does not use.
- Markup-guided edits: same token rates, no extra fee.
- SVG: image-model rate for the reference render + authoring-model tokens.
- Equal token rates ≠ equal cost per image: token consumption differs by
  model and quality. Real per-image costs must come from the benchmark.

## Errors and limits

- `error.type = "image_generation_user_error"` is user-correctable; do not
  auto-retry. `error.code` is the stable discriminator (e.g.
  `moderation_blocked`, with optional `moderation_details`).
- Retry rate-limit and server failures with backoff; never retry quota or
  user errors.
- Complex prompts can take up to 2 minutes.

## What this means for Depikt

- 2.6 is a drop-in for the existing generate/edit pipeline: same endpoints,
  same quality ladder, same sizes, same prices. The family switch is one
  env var (`IMAGES_MODEL_FAMILY`).
- Complexity, markup, SVG, and GIF are new request surface. The capability
  registry (`src/lib/generation/provider-capabilities.ts`) rejects any
  unsupported combination before credits are reserved.
- GIF/SVG/markup product features are Step 4+; see images-2-6-milestones.md.
