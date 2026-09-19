# Verification-only budget guard — non-paid verification complete

The guard is implemented exclusively under `tests/`. No application source, database
migration, production economics, feature flags, frozen prompts, or reference fixtures
were changed by this task. Existing unrelated workspace changes were left intact.

## Implementation

- `tests/eval/final-verification-budget.ts`: frozen-matrix validation, deterministic
  attempt identities, exclusive file locking, durable atomic reservations, persistent
  outcomes, state validation, and separate non-image accounting.
- `tests/eval/final-verification-runner.ts`: provider-boundary enforcement for individual
  images and atomic series, plus a dedicated QA-process fetch installer. Every initial
  generation/edit/regenerate uses `initial`; automatic V5 repair uses `repair`.
- `tests/unit/final-verification-budget.test.ts`: 17 mock-only tests, including tests
  through the existing production image adapters and their default global fetch path.
- `tests/image-evals/final/README.md`: runner integration and crash/resume instructions.

Default persisted state is `benchmark-results/final-verification/state.json`, already
covered by the repository's ignored benchmark output directory. Tests used disposable
temporary directories. The real final-run state was not initialized or spent.

## Matrix-calculated budget

14 scenarios sum to **18 initial image calls**, with **1 automatic repair** and an
absolute limit of **19 image calls**. Manual regenerate `plain-regression:1` remains
initial. Matrix SHA-256 remains
`082a3cb04029a1763e7750f9e1a63a1f1d4356c3570800d35d9efc86de22dff1`.

Scenario 13's initial key is `repair:0`; its automatic repair is `repair:auto:0` so
the two operations cannot collide. Other scenario repairs similarly use `:auto:0`.
An unexpected early repair consumes the sole run-wide allowance and identifies its
scenario in the later rejection message; validation is independently accounted.

## Mock results

| Check | Result |
| --- | --- |
| 18 requested images allowed | PASS |
| 19th initial blocked before provider | PASS |
| One repair after 18 initial allowed, total 19 | PASS |
| Second automatic repair blocked | PASS |
| Provider HTTP 400 remains spent after restart | PASS |
| Successful attempt cannot repeat on resume | PASS |
| Crash after 11 reservations resumes at 11 | PASS |
| Only 2 initial slots left, batch of 3 rejected with no partial reservation/call | PASS |
| All series reservations persisted before any child starts | PASS |
| Earlier scenario repair prevents later repair, validation still runs | PASS |
| Edit/manual regenerate classified initial | PASS |
| Non-image calls do not consume image slots | PASS |
| Concurrent callers cannot reuse an attempt | PASS |
| Separate-process lock respected | PASS |
| Missing/corrupt state and stale locks fail closed | PASS |
| Matrix changed to 19 initial refuses startup | PASS |
| Unscoped image calls, multi-image requests, concurrent internal retries blocked | PASS |
| Default adapter fetch covered by QA-process guard | PASS |
| Responses image-generation tools rejected | PASS |
| Network failure stays spent; image redirects disabled | PASS |

## Non-paid bar

- `npm test`: **783 passed**, zero failures (includes all 17 guard tests).
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- Changed-file lint: PASS, 24 source/test files including pre-existing changes.
- Frozen final matrix integrity: PASS.
- Approved fixture hashes: PASS, all 17 files.
- Read-only QA schema check: grounding cache, validation fields, and repair ledger present.
- QA balance: **86 credits**, unchanged and sufficient for 18 requested outputs.
- Effective development configuration: V4/V5 ON, existing included repair policy enabled.
- Effective production and committed Worker configuration: V4/V5 OFF, repair disabled.

The guard implementation and its non-paid preflight are cleared. At live startup,
the final runner must use this transport or install the guard in the actual QA
provider process as documented; an unrelated unguarded server is not covered.

**0 paid provider calls occurred. 0 image slots were spent. The final matrix remains
unexecuted.** No live search, OCR, judging, generation, deployment, or production
activation was performed. Stopped after implementation and verification as requested.
