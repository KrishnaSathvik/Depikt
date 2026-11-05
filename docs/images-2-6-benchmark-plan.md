# Images 2.5 vs 2.6 Benchmark Plan

No paid calls have been executed. This plan is the gate for flipping
`IMAGES_MODEL_FAMILY` to `2.6` and for any pricing/credit change. The 2.5
benchmark results must not be assumed to apply to 2.6.

## Design

Reuse the existing bench harness (`npm run bench`, scripts/images-2-5-run.ts
pattern): same prompts, same sizes, same quality (`max`, matching
production), mock-free real API calls, results in git-ignored
`benchmark-results/`.

### Prompt set (representative of routed traffic)

10 prompts per cell, drawn from the router's decision classes:

1. Simple generation (2): portrait, landscape photo — routes to Flare.
2. Exact text / typography (2): poster with quoted headline, event flyer —
   routes to Sunburst.
3. Structured layout (2): infographic, multi-panel storyboard — Sunburst.
4. Reference fidelity (2): product shot with reference, character
   consistency across 2 generations — Sunburst.
5. Precision edit (2): masked local edit, unmasked simple edit — Sunburst /
   Flare respectively.

### Cells

| Cell | Model | Quality | Complexity |
|---|---|---|---|
| A | gpt-image-2.5-flare | max | — |
| B | gpt-image-2.5-sunburst | max | — |
| C | gpt-image-2.6-flare | max | high (default) |
| D | gpt-image-2.6-sunburst | max | high (default) |
| E | gpt-image-2.6-flare | max | low (latency probe) |

3 runs per prompt per cell = 150 generations.

### Measurements

- Instruction fidelity + typography accuracy (existing validation pipeline,
  OCR + visual judge, offline-scored).
- Reference/character consistency (visual judge, pairwise vs 2.5 output).
- Edit preservation (diff outside mask region).
- Latency (p50/p95 wall clock per image).
- Token usage from `usage` on every response; cost per successful image
  computed from the documented rates.
- Failure/retry rate and error codes.

### Estimated budget

At 2.5 max-quality rates (~$0.21 generate / ~$0.22 edit measured in the
2.5 benchmark): 150 calls x ~$0.22 ≈ **$33**, plus ~20% retry headroom →
**cap the run at $40**. If 2.6 token consumption differs materially, the
per-image cost model and the flat 1-credit price both need re-review before
cutover.

### Decision rules

- Flip the family to 2.6 only if quality is ≥ 2.5 on every decision class
  AND cost per successful image is within +15%.
- Revisit Flare/Sunburst routing thresholds only with this data; do not
  route everything to Sunburst.
- Subscription prices and credit quantities stay frozen until real
  measurements justify a change.
