# VNext 1 classification suite

Frozen prompts and fixture Intents for `buildGenerationPlan()` regression tests. Pixel quality is out of scope.

## Gates

| Gate | Command | When |
|---|---|---|
| CI | `npm test` | Every commit |
| Release | `npm run test:vnext-1-live` | Before shipping VNext 1 (requires `OPENAI_API_KEY`) |

Ship bar: **11/11** on both gates. 10/11 is investigate-not-ship.

## Contents

- `cases.json` — 11 frozen prompts, expected plan fields, and fixture Intents
- `fixtures/` — reference images for cases that need them (used by the live release gate)

The planner implementation must not import `cases.json`. Case ids are test labels only.
