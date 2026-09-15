# VNext 2 precision-edit suite

Frozen prompts and expected routing for precision area editing regression tests. **Production code must not import this suite** or reference these case ids.

## CI vs live quality

| Gate | Command | When |
|---|---|---|
| CI | `npm test` | Every commit |
| Live quality | `npm run test:vnext-2-live` | Manual/opt-in. Prints the frozen cases and PASS / SOFT FAIL / FAIL scorecard. Does not call OpenAI or invent numeric fidelity scores. Source/mask PNGs are not in `fixtures/` yet. |

CI tests **transport, planning, and security** — not pixel quality. A future live quality gate (`npm run test:vnext-2-live`) is manual/opt-in and is not wired in this slice.

When live eval runs later, human reviewers score each result:

- **PASS** — requested change correct; outside area preserved; boundary/blending acceptable; composition intact
- **SOFT FAIL** — change mostly right but minor bleed, tone drift, or blending issues
- **FAIL** — wrong edit, large outside-area damage, or broken composition

## Contents

- `cases.json` — seven frozen edit prompts and expected routing (`sunburst` when masked, `unmasked_edit` for whole-image)
- `fixtures/` — source and mask PNGs (added later for live eval; no placeholder photos in-repo)

Case ids are test labels only. Generic production behavior must not special-case these prompts or domains.
