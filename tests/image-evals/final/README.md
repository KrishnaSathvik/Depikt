# Final verification budget guard

This is a verification-only harness. It does not change product code, database schema,
production flags, user-credit policy, prompts, or fixture hashes. Importing the harness
does not initialize state or contact a provider. The matrix remains frozen and unexecuted.

`tests/eval/final-verification-budget.ts` validates the frozen matrix hash and computes
14 scenarios / 18 initial calls / 1 automatic repair / 19 total calls. Initialization
is explicit; resume reads the existing state rather than creating a replacement.
Default state: `benchmark-results/final-verification/state.json` (git-ignored).

Reservations acquire an exclusive directory lock, write a temporary file, fsync and
close it, rename it, and fsync the directory before permitting any provider request.
Every reservation is spent forever, including failed/rejected calls and uncertain
crashes. Completion only records an outcome; it never returns capacity. Series reserve
the full batch in one write before any child executes. A lock left by a crashed process
fails closed: inspect it and confirm the original process is dead before removing it.
Never delete or reset the state or its initialization marker to recover slots.

## Provider boundary

`tests/eval/final-verification-runner.ts` supplies the guarded fetch transport. Use
`image()` for one request and `series()` for an atomic batch. The tasks must execute
the real image adapters with the supplied fetch; they must not implement independent
network calls. Requests must use the existing OpenAI Images generation/edit endpoints
and `n=1`. A second fetch in the same attempt, including concurrent retries, is blocked.
HTTP redirects are disabled. Provider outcomes are persisted without credentials or
image contents.

For application code that defaults to global fetch, install
`runner.installForVerificationProcess()` **in the dedicated QA process that makes the
provider requests**, before invoking any scenario. This also blocks image calls made
outside an attempt and rejects image-generation tools on the Responses endpoint.
It does not protect a different server process: do not run live images through an
unguarded remote server. The installer refuses a production process.

Wrap each actual initial image and each automatic repair separately; do not wrap an
entire session containing both as one image task. The automatic repair callback must
use a nested/separate `image()` task classified `repair`. Eligibility and revalidation
remain decisions of the existing V5 policy. If the global repair slot is exhausted,
catch the guard's rejection as an unavailable repair and preserve the usable original;
validation must still run. The guard accepts a repair from any known scenario so an
unexpected early repair still consumes the sole global allowance. It does not select
or force repairs.

Initial keys are `${scenarioId}:${childIndex}` from the matrix, including
`plain-regression:1` for the manual regenerate. Scenario 13's initial image is
`repair:0`; automatic repair keys use `${scenarioId}:auto:0` to avoid that collision.
Unplanned indices, unknown scenarios, incorrect run IDs, duplicate keys, altered matrix
bytes, corrupted state, and counter mismatches fail closed.

The runner's `nonImage()` accounting records web, visual, validation, OCR, and cache-hit
events separately without spending image slots. Existing production grounding caps
(3 web / 2 visual / 8 sources per request) remain unchanged. A failed non-image attempt
is still counted in its own category.

## Mock-only verification

```sh
node --test tests/unit/final-verification-budget.test.ts
```

Tests use the real image adapters with mock fetch and disposable state directories.
They do not load provider credentials or initialize the real final run. The full unit
suite includes these tests. No executable entry point automatically starts the matrix.
