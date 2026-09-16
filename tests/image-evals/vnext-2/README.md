# VNext 2 precision-edit suite

Frozen prompts and expected routing for precision area editing regression tests. **Production code must not import this suite** or reference these case ids.

## CI vs live quality

| Gate | Command | When |
|---|---|---|
| CI | `npm test` | Every commit |
| Live quality | Real browser edits; `npm run test:vnext-2-live` prints the checklist | Required before release. Run all six cases and score the actual outputs PASS / SOFT FAIL / FAIL. The script itself does not call OpenAI or judge pixels. |

CI tests **transport, planning, and security** — not pixel quality. The release
gate requires all six requested changes to PASS and outside preservation to
PASS or receive a documented, acceptable SOFT FAIL. Dramatic changes outside
the selection block release. Also validate whole-image editing, active-version
chaining, downloads, and regeneration in the browser.

Score each real output:

- **PASS** — requested change correct; outside area preserved; boundary/blending acceptable; composition intact
- **SOFT FAIL** — change mostly right but minor bleed, tone drift, or blending issues
- **FAIL** — wrong edit, large outside-area damage, or broken composition

## Contents

- `cases.json` — seven frozen edit prompts and expected routing (`sunburst` when masked, `unmasked_edit` for whole-image)
- Visual assets stay outside git for this release. The documented scorecard is
  in `docs/plans/2026-09-15-vnext-2-validation.md`; local run artifacts are in
  the ignored `benchmark-results/vnext2-20260916/` directory.

Case ids are test labels only. Generic production behavior must not special-case these prompts or domains.
