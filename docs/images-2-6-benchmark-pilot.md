# Images 2.6 Benchmark Pilot (pre-benchmark, not executed)

**Status: prepared only. No paid API calls have been made or approved.**
This pilot is the small representative run that must pass before the full
150-generation benchmark (`docs/images-2-6-benchmark-plan.md`, $40 cap) is
considered.

## Purpose

Distinguish three states for every capability: implemented, tested offline,
verified with the real provider. Today markup, SVG and GIF are implemented and
tested offline; none are provider-verified. The pilot closes that gap with the
smallest spend that still produces decision-grade evidence.

## Pilot matrix (28 generations, estimated ≤ $8)

| Group                           | Calls | Models                                                                                                             | What it proves                                                                                                 |
| ------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| A. Baseline raster              | 6     | 2.5 flare, 2.5 sunburst, 2.6 flare, 2.6 sunburst (1 typography + 1 layout prompt each, same prompts across models) | 2.5 vs 2.6 quality/cost delta on the prompts Depikt actually serves                                            |
| B. Typography & layout accuracy | 4     | 2.6 flare, 2.6 sunburst                                                                                            | Exact-text poster + multi-panel layout; OCR validation pipeline agreement                                      |
| C. Reference fidelity           | 4     | 2.6 flare, 2.6 sunburst                                                                                            | Face/brand consistency with 1 and 3 references; identity-check judge agreement                                 |
| D. Markup editing               | 6     | 2.6 flare, 2.6 sunburst                                                                                            | Arrow/circle/text annotations followed; masked vs markup edit comparison; alignment validation end-to-end      |
| E. Native SVG                   | 4     | 2.6 flare, 2.6 sunburst                                                                                            | SVG output parses, passes sanitization, renders to PNG preview, downloads                                      |
| F. Native GIF                   | 4     | 2.6 sunburst only                                                                                                  | Frame counts 4/8, durations 100/250ms; parsed metadata matches request; **actual per-GIF token cost measured** |

Cost estimate uses list prices from the official OpenAI image pricing page at
preparation time; group F is the only one whose price is not confidently known
upfront, which is exactly why it is in the pilot.

## Decision criteria

- **Expand to full benchmark** if: all groups complete, markup edits follow
  annotations in ≥ 5/6 attempts, SVG passes sanitization without repair, GIF
  cost is measured and within 5× a raster generation.
- **Hold and fix** if: any group fails validation plumbing (not quality) —
  fix the pipeline offline and re-run only that group.
- **GIF pricing decision**: after group F, set `media-pricing.ts` GIF quote
  from measured cost + margin, keep GIF disabled until that lands. A single
  pilot is not enough to price; it is enough to decide whether GIF is
  economically viable at all.

## Execution rules when approved

1. Runs go through `scripts/` against a development branch, never the product.
2. Every request/response, token usage and cost is logged under
   `research/images-2-6/runs/` like the 2.5 community runs.
3. No production database writes; results are files, not library rows.
4. Stop at the pilot cap even if results are inconclusive — report, don't
   extend silently.
