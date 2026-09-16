# VNext 3 frozen input corpus

Twenty cases cover one character, one product, both together, two characters, two products, brand ads, and a no-entity regression. `cases.json` is the fixed scene corpus. No production code branches on a fixture name or case id.

Fixtures are entirely fictional. `fixtures/prompts.json` defines two characters, two products, and a brand; each has three views. The one-time authoring command is `node scripts/generate-vnext-3-fixtures.mjs`. It uses the existing Sunburst runner and skips existing files. It is never invoked by tests or live evaluation. WebP quality is 82; originals and provider logs remain in the git-ignored research directory. Product front views become the primary asset at import.

Status: human-approved; exact images and existing SHA-256 hashes frozen. Fixture approval is recorded in manifest.json. Output quality and browser release gates remain separate. Hashes are recorded in `manifest.json`; on approval, record the approver and date there without changing the hashes. Never regenerate fixtures during a benchmark. Changes require a new explicitly reviewed corpus version.

Integrity check: `node tests/eval/vnext-3-live.ts --check`. After human approval, run `npm run test:vnext-3-live` and score the saved outputs.

Automated gate: run `npm test`; tests exercise role selection, budgets, preamble numbering, routing, signed metadata, and fail-closed loading. Live gate: evaluate each fixed scene with the same fixture bytes and score identity, product fidelity, non-merging, and label integrity as PASS / SOFT FAIL / FAIL. Store model, prompt, selected assets and provider output alongside the score. No invented percentages. A four-image brand series additionally verifies entity context reaches decomposition and each child receives the same lock preamble.
