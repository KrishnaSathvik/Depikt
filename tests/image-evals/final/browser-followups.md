# Browser follow-ups from final verification

These are separate from the four core release blockers. No browser/product UI was redesigned in this fix pass.

| Follow-up | Existing evidence | Next check without conflating causes |
|---|---|---|
| Grouped live-series/resume | Individual VELORA assets persisted; grouped live UI not verified | Observe the authorized targeted series, then refresh/resume without new generation |
| Validation/repair visibility | Saved Creation Details exposed dimensions and prompt, no verdict/outcome | Inspect how stored validation and repair state reaches saved-result UI |
| Unsent edit source lost on refresh | Account → Open in Generate → edit → refresh returned empty composer | Reproduce using existing output; inspect source/draft persistence |
| Parent-version navigation absent | Edited from a previous version label, no parent control in inspected modal | Follow stored parent-version relationship through saved-result UI |
| Internal expanded instructions shown as Prompt | VELORA creation exposed reference preamble and compiled child instructions | Trace user prompt vs provider prompt presentation |
| Null result URLs during polling | Successful job records returned null URLs; Account later displayed and downloaded PNGs | Reproduce with existing jobs and timestamp polling/signing/storage outcomes; do not label a spinner regression without evidence |

Screenshots: `output/playwright/final-*.png`. Original findings: [final report](final-report.md).
