# Task 9 Report: `useGeneration` plan → confirm → parallel start → resume

**Status:** DONE
**Branch:** `vnext-1-intent-to-generate`
**Commit:** (see below)

## What shipped

- **Product copy** (`src/lib/product.ts`): added `generateImages(n)`,
  `seriesConfirmTitle(n)`, `seriesConfirmAuto(n)`, `seriesConfirmAll(n)` to
  `CTA`, exactly as specified. `generateImage` (count 1) untouched. No
  "generator" wording.
- **`SubmitInput`** gained `userInput?: string | null` and
  `intent?: Intent | null`; both flow into `createGenerationPlan`, into
  `PendingGeneration` (persisted across the OAuth resume, already had the
  fields from Task 5), and back out through `resumePendingGeneration`.
- **BuildMode**: `handleGenerateImage` now passes
  `userInput: savedRoughIdea || input` and
  `intent: (result.intent as unknown as Intent) ?? null` (cast needed since
  `PromptResult.intent` is a loose `Record<string, unknown>`).
- **CritiqueMode**: `handleGenerateRewrite` now passes
  `userInput: savedInput`, prompt stays `result.rewritten_prompt`.
- **Hook flow** (`use-generation.ts`):
  - `submit()` → `createGenerationPlan()`; if
    `plan.requiresCountConfirmation`, stores the plan token/idempotency
    key/reference ids/aspect ratio in a ref, sets `planPreview`, phase
    `"confirm"`, and returns — no job, no credit reservation yet.
  - Otherwise pre-empts on `credits < plan.autoCount`, else calls the new
    `executePlan(planToken, selectedCount, ...)`.
  - `executePlan` — extracted from the old inline `submit()` tail — does
    `createGenerationJobs`, starts every `jobsNeedingStart` job in parallel,
    and calls `pollSession` (not a single-job poll).
  - `confirmSeriesCount(n)` re-checks `credits < n` (auto's known-affordable
    check doesn't cover "all N"), then calls `executePlan`.
  - `pollSession` fetches the session (id/status/series_index/series_label
    per child) then `getGenerationJob` per child for full detail
    (width/height/model/errorMessage/result). Session-terminal when every
    child is terminal; picks the first succeeded child for `activeVersionId`.
  - `ACTIVE_JOB_KEY` replaced by `ACTIVE_SESSION_KEY`
    (`depikt.generate.activeSessionId`); mount-time resume reads it and
    calls `pollSession` directly (which re-starts any still-queued child and
    re-polls).
  - Hook now returns `jobs` (full child array, `job` kept as `jobs[0]` for
    existing single-job consumers), `planPreview`, `confirmSeriesCount`.
- **`client.ts`**: `getGenerationSession` return type gained
  `jobs: SessionJobSummary[]` (id/status/series_index/series_label/
  created_at), matching what `sessions.$id.ts` already returned.
- **`SeriesConfirmPanel`** (new, `src/components/generate/
  SeriesConfirmPanel.tsx`): renders only in phase `"confirm"`; "Generate N
  now" (auto) always shown, "Generate all N" hidden when
  `credits < desiredCount`. Shared by `GenerateWorkspace`, `BuildMode`,
  `CritiqueMode`.
- **`InlineGenerationPanel`**: early-return extended to
  `phase === "idle" || phase === "confirm"` (no job exists yet in confirm;
  `SeriesConfirmPanel` owns that state at the call site).
- **`GenerateWorkspace`**: added a `"confirm"` branch (prompt echoed in a
  `PromptSurface` + `SeriesConfirmPanel`, no canvas/composer); when
  `gen.jobs.length > 1` the right pane renders a new `SeriesJobsGrid`
  (2-col grid, image + label once succeeded, spinner + label +
  `GENERATION_STAGE_LABELS.starting/creating` otherwise) instead of
  `GenerationCanvas`. Library auto-submit unchanged
  (`gen.submit({ prompt, ... })`, forces a single-mode plan server-side).
- Library/Gallery/Prompt handoff paths, credit gating, auth-gate resume,
  reference upload/retry: untouched.
- Task 10 telemetry (`generation_planned`, etc.) intentionally **not**
  added; `generate_submitted` already existed and is unchanged.

## Tests

- Rewrote `tests/unit/generate-job-resume.test.ts` for the session model:
  `ACTIVE_SESSION_KEY` exists, `ACTIVE_JOB_KEY` is gone, `pollSession`
  persists/clears the session id and requires every child terminal, the
  mount effect calls `readActiveSession`/`pollSession`, and each child gets
  full per-job detail via `getGenerationJob`.
- Updated `tests/unit/generation-series-resume.test.ts`: `executePlan`
  (not `submit`) starts every queued job and calls `pollSession`; `submit`
  itself no longer calls `startGenerationJob`.
- Updated `tests/unit/generate-idle-no-visual.test.ts` and
  `tests/unit/inline-generation-no-navigate.test.ts` regexes for
  `InlineGenerationPanel`'s new `phase === "idle" || phase === "confirm"`
  guard.
- Fixed a pre-existing structural assertion in
  `tests/unit/creation-composer.test.ts` (`GenerateWorkspace.tsx` must not
  contain `text-center`) by dropping an unnecessary `text-center` utility
  from the new `SeriesJobsGrid` failed-slot (flex centering already handles
  it).
- No other test files needed changes; `generation-open-in-generate.test.ts`
  and `generation-handoff-user-input.test.ts` still pass unmodified.

`npm test`: **515/515 pass.** `npm run typecheck`: clean (both
`tsconfig.json` and `tests/tsconfig.json`). `npm run lint` on the files this
task touched shows only pre-existing, unrelated prettier findings on lines
this task did not change (verified via `git diff`); the full-repo lint run
has ~3550 pre-existing findings unrelated to this task and was left alone.

## Concerns / follow-ups

- `CTA.generateImages(n)` is defined per the brief's Step 1 but isn't wired
  into any component yet — the brief's Steps 2–4 never call for a submit
  button relabel, so it's available for a future step (e.g. a composer CTA
  once a count is already known) but currently unused.
- `SeriesJobsGrid` is a plain 2-column grid with no per-job retry/edit; a
  failed child just shows its error text inline (acceptable per the brief's
  "simple grid" ask, flagged in case a richer per-child action is wanted
  later).

## Report path

`/Users/krishnasathvikmantripragada/depikt/.superpowers/sdd/task-9-report.md`

## Review fixes

- `pollSession()` now calls `jobsNeedingStart(session.jobs)` on every tick and
  dispatches `startGenerationJob` for each queued child using the currently
  uploaded paths from `referencesRef`. Mount resume enters the same poll path,
  so refresh recovery and dropped `/run` requests restart queued reservations.
- Extracted `SeriesJobsGrid` into a shared component. `GenerateWorkspace` and
  `InlineGenerationPanel` both render it for `gen.jobs.length > 1`; inline
  Build/Critique generation keeps its existing single-job canvas otherwise.
- Expanded `generate-job-resume.test.ts` to source-check queued-child restart,
  current reference paths, mount's shared poll path, and shared inline grid use.
- Verification after review fixes: focused resume/series tests pass (8/8),
  `npm test` passes (516/516), and `npm run typecheck` is clean.
- No Critic Intent object or Task 10 telemetry was added.

## Review fixes: library source race and series presentation

- `SubmitInput` now accepts an optional `sourceContext`. `submit()` resolves it
  once and carries that source through `lastParamsRef`, pending-auth storage,
  `/plans`, count-confirmation state, and `/jobs`, so a same-tick source state
  update cannot change the request provenance.
- Library auto-submit passes
  `{ type: "library", id: handoff.sourceId ?? null }` directly.
- Series result images now use a subtle, non-cropping `object-contain` frame.
  Labels, status text, and failures use design-system typography and color
  tokens (`label-mono`, `text-body-sm`, and `text-destructive`).
- Added source-read coverage for the library handoff and hook override, plus
  series-grid crop/token regression coverage.
- Verification: `npm test` passes (519/519), `npm run typecheck` is clean,
  `git diff --check` is clean, and edited-file IDE diagnostics report no errors.
- Task 10 was not started.

## Review fix: OAuth resume ownership

- Added `pendingGenerationMatchesSource`, a pure matcher that keeps exact source
  matches and lets only the direct Generate hook resume pending Library,
  Gallery, or Template submissions.
- Build and Critique remain exact-match-only, so neither can consume a pending
  Library handoff.
- Resume still submits `pending.sourceContext`, preserving Library's
  forced-single planning behavior.
- Added unit coverage for accepted and rejected ownership combinations plus a
  source-read regression asserting the resume guard uses the matcher instead of
  raw type inequality.
- Verification: `npm test` passes (520/520), `npm run typecheck` is clean,
  `git diff --check` is clean, and edited-file IDE diagnostics report no errors.
- Task 10 was not started.
