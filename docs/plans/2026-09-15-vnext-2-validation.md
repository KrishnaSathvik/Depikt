# VNext 2 validation — September 15–16, 2026

## Release status

Six precision quality cases, whole-image editing and the three-edit chain
passed real browser validation. Regenerate and Download also passed after
the fixes below. The release gates are satisfied.
VNext 3 has not started. No fixture PNGs are committed.

## Prerequisite and branch hygiene

Issue #2 landed independently through [PR #5](https://github.com/KrishnaSathvik/Depikt/pull/5),
merge commit `d4d10d7c6d056656843bc49ae196e74e9944844b`.
GitHub closed Issue #2 after merge. Its isolated branch passed 564/564 tests,
typecheck and GitGuardian. VNext 2 rebased cleanly onto that main.

## Defects found by actual browser validation

1. **Inverted API mask alpha:** the initial notebook edit made the notebook
   green but destroyed the outside scene (black background). Editor coverage
   had been exported directly. The wire PNG now makes selected pixels
   transparent and unselected/erased pixels opaque, as specified by the
   installed OpenAI SDK's image-edit contract. The editor preview stays
   unchanged. Regression coverage decodes exported PNG pixels.
2. **Source canvas lost:** the landscape notebook edit requested 1024×1024.
   Masked jobs now load the owned source dimensions server-side and preserve
   that canvas. Whole-image edits retain the source when no new size is
   requested, while explicit unmasked resizing remains supported.
3. **Regenerate discarded edit inputs:** after the bracelet result, Regenerate
   returned HTTP 400, “Editing requires a sourceVersionId or a reference image.”
   It now repeats the previous operation with its source and mask, but a fresh
   idempotency key. The obsolete test that required dropping edit inputs was
   removed; the real browser check covers this behavior.

4. **Stale hydration state after mask upload:** after opening an existing creation,
   an upload could finish after credit hydration had already resolved, then
   submit using its old unresolved closure and wait forever. Submit now reads
   the current auth/credit state from a ref. No job or credit charge occurred
   during the reproduced stall.

No new polling architecture, Intent schema or VNext 3 work was introduced.

## Automated checks

| Gate | Result |
| --- | --- |
| Unit suite | 662/662, no failures or skips |
| Typecheck (app and tests) | PASS |
| VNext 1 fixture Intent → plan | 11/11 |
| VNext 1 live Intent → plan | 11/11, no skips |

Local logs: `/tmp/depikt-vnext1-live.log`, `/tmp/depikt-vnext2-tests.log`,
`/tmp/depikt-vnext2-typecheck.log`.

## Real browser checks

Playwright drove the local Vite app at `http://localhost:8080/prompt?mode=generate`
using the existing DEV AUTH account `depikt-dev-qa@example.com` and real
Supabase/OpenAI services. The user added 15 audited QA credits.

- Brush drawing, erase, undo and clear worked with real pointer input.
- Source remained visible beneath the overlay; strokes aligned with the pointer.
- Corrected notebook edit ran through Sunburst, cost one credit and appeared
  without refresh. Croissants, flowers, glasses and juice remained intact.
- Edit again worked on each active result; downloads completed successfully.
- Regenerate completed without refresh. Jobs
  `92da63fb-1d66-4840-9aab-774a87dfd63a` and
  `56088831-1e49-4b9a-b2d8-7610eef2d4a2` used the same source and mask,
  different idempotency keys, and one credit each. The regenerated portrait
  retained the silver bracelet and surrounding scene.
- Whole-image edit used **Edit whole image** without selection: warmer,
  cinematic breakfast image, Flare, one credit, null stored mask fields,
  1536×1024, child of the original.
- Chain preserved all preceding edits. Database parent IDs matched the active
  version for all three operations; each was a one-credit Sunburst edit.

## Six-case visual scorecard

Scores come from inspection of actual source/output images, not automated
transport tests or invented fidelity percentages. Each axis is assessed
relative to that operation's immediate source.

| Case | Requested change | Outside preservation | Boundary quality | Composition preservation |
| --- | --- | --- | --- | --- |
| Notebook: red → dark green | PASS | PASS | PASS | PASS |
| Tulips: yellow → white | PASS | PASS | PASS | PASS |
| Orange juice → milk | PASS | PASS | PASS | PASS |
| Jacket: mustard → dark blue | PASS | PASS | PASS | PASS |
| Sunglasses: remove | PASS | PASS | PASS | PASS |
| Watch → silver bracelet | PASS | PASS | PASS | PASS |

Observations:

- Notebook: dark green cover, natural edges/shadow, other breakfast objects intact.
- Tulips: white blooms and natural green foliage/vase; green notebook retained.
- Milk: opaque white milk in the glass; white flowers and green notebook retained.
- Jacket: dark blue fabric; face, hair, white shirt, hands, watch and background retained.
- Sunglasses: removed; wood texture fills the space without obvious seams.
- Watch: silver chain bracelet replaces the watch; wrist/hand anatomy and blue jacket retained.

The initial failed notebook output is retained separately and is **not** counted
as a pass. All six accepted outputs were produced after the alpha and sizing fixes.

## Database evidence

| Result | Version ID | Parent version ID |
| --- | --- | --- |
| Breakfast original | `dc90bdc9-b84a-4e1d-8f12-113ed50d5beb` | none |
| Notebook green | `a99903ac-f850-4918-96c6-19e816db308d` | `dc90bdc9-b84a-4e1d-8f12-113ed50d5beb` |
| Tulips white | `d0e48bc6-d742-49dc-8435-3d3490b62ddb` | `a99903ac-f850-4918-96c6-19e816db308d` |
| Milk | `3e255213-a3bb-408f-a39f-4695ddac1c9d` | `d0e48bc6-d742-49dc-8435-3d3490b62ddb` |
| Sunglasses removed | `f48155af-00d0-456e-838f-288d3479c0a0` | `3e255213-a3bb-408f-a39f-4695ddac1c9d` |
| Whole-image warm edit | `27b1cbc6-5753-4869-9d05-ea2666c3173e` | `dc90bdc9-b84a-4e1d-8f12-113ed50d5beb` |
| Portrait original | `57b27641-e47d-4b11-a453-a7ee4ef020ff` | none |
| Jacket dark blue | `05cbb26d-63e3-4715-8819-308daf00a774` | `57b27641-e47d-4b11-a453-a7ee4ef020ff` |
| Silver bracelet | `e2e91a3c-f7f0-4059-b665-3e616918d53e` | `05cbb26d-63e3-4715-8819-308daf00a774` |

## Artifacts and observed limitations

Originals, accepted outputs and the initial failure are saved in the ignored
local directory `benchmark-results/vnext2-20260916/`, named
`depikt-vnext2-<case>.png`. Browser snapshots and downloads are also in the
ignored `.playwright-mcp/` directory. No visual assets were added to git.

One tulip attempt uploaded successfully but planning returned “Mask not found”;
no job or credit charge occurred. A fresh UI retry succeeded. This was not
reproduced on subsequent precision edits; the underlying storage-read cause
is unconfirmed.

The account creations list can remain cached during a long session, and
“Open in Generate” from the Generate route requires remounting to consume
its handoff. During Regenerate retesting, a cached list caused one incorrect
source selection (job `857eeb14-1cc9-4629-b9a8-9312d0ea33d1`); that run is
excluded from the quality scorecard. The active-result Edit chain itself
worked correctly. These account-navigation behaviors are recorded separately
from the precision-edit quality gate.

Final accounting: 13 completed one-credit jobs, including source generation,
the initial failed-quality result, one excluded QA source-selection mistake,
and regeneration verification. The account has 2 of the 15 added credits
remaining. Planning failures and the pre-job hydration stall did not charge.
Full job/version/mask evidence is in the ignored local `database-evidence.json`.
