# Inline Generation + Generate Workspace UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prompt Build and Critique generate images inline (no `/generate` hop, no second Generate click), and direct `/generate` becomes a proper two-pane desktop creation workspace instead of a narrow centered composer — all on top of the already-verified generation backend.

**Architecture:** Extract the generation state machine currently embedded in `GenerateWorkspace.tsx` into a reusable `useGeneration()` hook in `src/lib/generation/`, plus two shared presentational components (`GenerationCanvas` for ready/generating/result/error visuals, `GenerationActions` for Download/Edit/Regenerate). `GenerateWorkspace` is rebuilt on top of the hook as a two-pane desktop layout; `BuildMode` and `CritiqueMode` gain an inline region using the same hook, entering directly at the `generating` phase (skipping `ready`, since their first click already starts the job) and never navigating to `/generate`.

**Tech Stack:** TanStack Start (React 19), Tailwind v4 (default breakpoints: `sm`=640, `md`=768, `lg`=1024), existing `src/lib/generation/*` job/credit/polling APIs, `ThinkingField` (`variant="generate"`), Node built-in test runner (`tests/unit/**`), no new libraries.

---

## Reference material (read before starting)

- Design doc: `docs/plans/2026-09-10-inline-generation-workspace-design.md`
- Current implementation to extract from: `src/components/generate/GenerateWorkspace.tsx` (676 lines) — phase model `"idle"|"starting"|"polling"|"result"|"error"`, `submit()`, `pollJob()`, `regenerate()`, `applyEdit()`, job-resume via `sessionStorage["depikt.generate.activeJobId"]`, credit loading, reference upload/retry.
- `src/lib/generation/client.ts` — `createGenerationJob`, `getGenerationJob`, `getGenerationSession`, `getCreditBalance`, `uploadReferenceImage`, `nextPollDelayMs`, `isTerminalStatus`.
- `src/lib/generation/handoff.ts` — `saveGenerationHandoff`/`consumeGenerationHandoff` (sessionStorage key `depikt:generation-handoff`, one-shot). **This stays as-is** — it's still used by Library/Gallery/Templates to hand off to `/generate` directly; it is NOT used for the new Build/Critique inline path (those call the hook directly, no navigation).
- `src/lib/generation/feature-flag.ts` — `isNativeGenerationEnabled()`. All new inline UI must stay behind this flag exactly like the existing "Generate image"/"Generate rewrite" buttons do.
- `src/components/processing/ThinkingField.tsx` + `thinking-field.ts` — `variant="generate"` in use; `"build"`/`"critique"` variants exist but unused — **do not** wire them into Build/Critique's own loading states (design doc explicitly forbids this); only use `variant="generate"` for the new inline image-generation region.
- `src/components/prompt/BuildMode.tsx` — `handleGenerateImage` (line ~114) currently does `saveGenerationHandoff(...)` + `navigate({to: "/generate"})`; `ActionRow`'s `onGenerate` prop; own `LoadingState` component (Loader2-based) for prompt-building — untouched by this plan.
- `src/components/prompt/CritiqueMode.tsx` — `handleGenerateRewrite` (line ~90), same navigate pattern; own inline `Loader2` block for critiquing — untouched by this plan.
- Source attribution: `SourceContextType` in `src/lib/generation/job-request.ts` (`"direct"|"library"|"gallery"|"prompt_build"|"prompt_critique"|"template"`) — Build must submit `"prompt_build"`, Critique `"prompt_critique"`, unchanged.
- Existing tests that assert against `GenerateWorkspace.tsx` **source text** (regex/pattern checks, not RTL renders) that MUST keep passing or be deliberately updated in the same commit that moves the code they check:
  - `tests/unit/generate-job-resume.test.ts` — checks `ACTIVE_JOB_KEY`/`sessionStorage` resume pattern.
  - `tests/unit/generate-reference-upload.test.ts` — checks failed uploads are never `.filter()`ed out.
  - `tests/unit/generate-edit-source-image.test.ts` — checks `jobs.ts` edit-source-image fetch (server-side, unaffected by this plan).
  - `tests/unit/generate-launch.test.ts` — SEO/metadata source-pattern checks (unaffected).

---

## Task 1: Extract `useGeneration` hook (no behavior change)

**Files:**
- Create: `src/lib/generation/use-generation.ts`
- Modify: `src/components/generate/GenerateWorkspace.tsx`
- Modify (source-pattern targets moved): `tests/unit/generate-job-resume.test.ts`, `tests/unit/generate-reference-upload.test.ts`

**Step 1: Write the hook's test first (behavioral, not source-pattern)**

Create `tests/unit/use-generation.test.ts`. Use Node's built-in test runner (`node:test`) and `node:assert/strict`, matching the style of `tests/unit/generation-client-polling.test.ts`. Since the hook talks to `fetch` and `sessionStorage`, stub both:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderHook, act, waitFor } from "./test-utils/render-hook"; // see Step 1a
import { useGeneration } from "../../src/lib/generation/use-generation";

test("submit() persists the active job id so a remount resumes polling", async () => {
  // arrange: fake fetch returning a queued job, then a succeeded job on next call
  // act: call result.current.submit({ prompt: "a cat", sourceContext: { type: "direct" } })
  // assert: sessionStorage.getItem("depikt.generate.activeJobId") === jobId returned by fake fetch
});

test("a failed reference upload stays in state flagged for retry, never filtered out", async () => {
  // arrange: fake fetch that 401s the reference upload
  // act: call result.current.addReference(dataUrl)
  // assert: result.current.references still contains the entry with error: true
});
```

If no lightweight `renderHook` helper exists in the repo yet, write one under `tests/unit/test-utils/render-hook.ts` using `react-dom/client` + `act` (no new dependency — React 19 is already installed). Keep it under ~30 lines; it only needs to mount a hook-calling component into a detached DOM node and expose `.current`/`rerender`/`unmount`.

**Step 2: Run it to confirm it fails**

Run: `npm test -- --test-name-pattern="submit\(\) persists the active job id"`
Expected: FAIL — `use-generation.ts` does not exist yet.

**Step 3: Implement `useGeneration`**

Move the following out of `GenerateWorkspace.tsx` verbatim (adapted to be parameter-driven instead of reading component-local `sourceContext`/`structuredRatio` directly), preserving exact behavior:

```ts
// src/lib/generation/use-generation.ts
export interface UseGenerationOptions {
  sourceContext: { type: SourceContextType; id?: string | null };
}

export interface ReferenceEntry { /* moved from GenerateWorkspace */ }

export interface UseGenerationResult {
  phase: "idle" | "starting" | "polling" | "result" | "error";
  job: JobStatusResponse | null;
  versions: SessionVersion[];
  activeVersionId: string | null;
  errorMessage: string | null;
  credits: number | null;
  references: ReferenceEntry[];
  addReference: (dataUrl: string) => Promise<void>;
  removeReference: (entry: ReferenceEntry) => void;
  submit: (input: {
    prompt: string;
    structuredAspectRatio?: string | null;
    routingHints?: RoutingHints;
    sourceVersionId?: string | null;
  }) => Promise<void>;
  regenerate: () => Promise<void>;
  applyEdit: (editPrompt: string) => Promise<void>;
  reset: () => void; // clears phase back to "idle" (used by Build/Critique's "Try again")
}

export function useGeneration(options: UseGenerationOptions): UseGenerationResult { /* ... */ }
```

Move: `ACTIVE_JOB_KEY`, `saveActiveJob`/`clearActiveJob`/`readActiveJob`, the mount-time job-resume effect, credit-loading effect, `submit`/`pollJob`/`regenerate`/`applyEdit`, the auth-gate (`pendingSubmit` ref + `lovable.auth.signInWithOAuth`) and its resume effect, and reference add/retry-on-sign-in logic. Keep `resolveGenerationSize`-based ratio resolution **out** of the hook — that stays presentational (each surface computes its own display ratio from `job.width/height` when present, else from its own prompt text), so pass `job` back out and let callers derive it, matching current `GenerateWorkspace` behavior.

Do **not** move `improveInPrompt()` (that's `GenerateWorkspace`-specific navigation) or the handoff-consuming mount effect (that also stays in `GenerateWorkspace`, since Build/Critique don't use the handoff for this path).

**Step 4: Rewire `GenerateWorkspace.tsx` to call the hook**

Replace the moved state/effects with `const gen = useGeneration({ sourceContext })`. Keep the JSX and layout as-is for this task (layout redesign is Task 4) — this task is a pure refactor, verified by re-running the existing source-pattern tests against their new location.

**Step 5: Update the moved-target tests**

`tests/unit/generate-job-resume.test.ts` and `tests/unit/generate-reference-upload.test.ts` currently regex-check `src/components/generate/GenerateWorkspace.tsx`. Update their file-read path to `src/lib/generation/use-generation.ts` (the patterns they check — `ACTIVE_JOB_KEY`, `sessionStorage`, `prev.filter`-absence — now live there).

**Step 6: Run full test suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, no regressions.

**Step 7: Commit**

```bash
git add src/lib/generation/use-generation.ts src/components/generate/GenerateWorkspace.tsx \
  tests/unit/use-generation.test.ts tests/unit/test-utils/render-hook.ts \
  tests/unit/generate-job-resume.test.ts tests/unit/generate-reference-upload.test.ts
git commit -m "Extract useGeneration hook from GenerateWorkspace

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Shared `GenerationCanvas` and `GenerationActions` components

**Files:**
- Create: `src/components/generate/GenerationCanvas.tsx`
- Create: `src/components/generate/GenerationActions.tsx`
- Test: `tests/unit/generation-canvas.test.ts` (source-pattern style, matching repo convention — no RTL render harness exists yet; keep to assertions about which sub-elements appear per state, checked via a minimal render-hook-style DOM mount, reusing the helper from Task 1 if it renders components not just hooks, or a dedicated tiny `render` helper).

**Step 1: Write the test**

```ts
// tests/unit/generation-canvas.test.ts
test("ready state renders a static ratio-shaped dot field and no ThinkingField", () => { /* ... */ });
test("generating state renders ThinkingField with variant=generate and elapsed time", () => { /* ... */ });
test("result state renders the image and GenerationActions (Download/Edit/Regenerate)", () => { /* ... */ });
test("error state renders the failure message and a Try again control", () => { /* ... */ });
```

**Step 2: Run to confirm failure** — component doesn't exist.

**Step 3: Implement**

```tsx
// src/components/generate/GenerationCanvas.tsx
export type GenerationCanvasState = "ready" | "generating" | "result" | "error";

export interface GenerationCanvasProps {
  state: GenerationCanvasState;
  aspectRatio: string;        // "4:5" etc, for frame shaping
  imageUrl?: string | null;
  imageAlt?: string;
  elapsedMs?: number;
  errorMessage?: string | null;
  onRetry?: () => void;
  actions?: React.ReactNode;  // slot for GenerationActions in "result" state
  className?: string;
}
export function GenerationCanvas(props: GenerationCanvasProps) { /* ... */ }
```

- `ready`: static (non-animated) dot field sized to `aspectRatio`, caption "Your image will appear here". Reuse the dot-grid rendering approach from `thinking-field.ts` but frozen (no animation loop) — do not fork a second animated implementation.
- `generating`: `<ThinkingField variant="generate" status="Creating your image" aspectRatio={aspectRatio} />` + elapsed timer text, matching current `GenerationLoadingState` in `GenerateWorkspace.tsx`.
- `result`: `<img>` at `aspectRatio`, `props.actions` rendered below/beside per caller layout (caller decides desktop vs mobile placement — this component doesn't position itself in the page, only fills its own box).
- `error`: message + `onRetry` button ("Try again"), and (design doc §11) whatever surface rendered a "credit returned" note passes it via `errorMessage`.
- Frame transitions between aspect ratios use a CSS `transition` on width/height (design doc §18) — no JS animation library.

```tsx
// src/components/generate/GenerationActions.tsx
export interface GenerationActionsProps {
  onDownload: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
  disabled?: boolean;
}
export function GenerationActions(props: GenerationActionsProps) { /* Download / Edit / Regenerate, this exact order, this exact label set everywhere */ }
```

**Step 4: Run test, confirm pass.**

**Step 5: Commit**

```bash
git add src/components/generate/GenerationCanvas.tsx src/components/generate/GenerationActions.tsx tests/unit/generation-canvas.test.ts
git commit -m "Add shared GenerationCanvas and GenerationActions components

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Rebuild `GenerateWorkspace` as the two-pane desktop workspace

**Files:**
- Modify: `src/components/generate/GenerateWorkspace.tsx`
- Test: extend `tests/unit/generate-launch.test.ts` or add `tests/unit/generate-workspace-layout.test.ts`

**Step 1: Write tests for the new structure**

Source-pattern-check (matching repo convention) that:
- the component renders a two-column container at `md`/`lg` widths (class names include the split, e.g. checks for a wrapper using `lg:grid-cols-[...]` or equivalent, plus a `max-w-[1180px]`–`max-w-[1280px]` container) and stacks to one column below it.
- the composer (prompt/reference/ratio/credits/Generate button) never includes model/quality/seed/style-preset controls — grep-assert none of the strings `"model"`, `"quality"`, `"seed"`, `"style preset"` (case-insensitive, excluding the fixed `1 credit` copy) appear in the composer JSX region.
- the right pane uses `GenerationCanvas` (import present, `state` prop driven by `gen.phase`) rather than bespoke result/loading markup.

**Step 2: Run, confirm failure.**

**Step 3: Implement**

Left pane (composer, ~38–42% width): "Create an image." heading, prompt textarea, reference thumbnails/add-tile (unchanged behavior from today, now reading from `gen.references`/`gen.addReference`), resolved ratio caption, credits caption, `Generate image · 1 credit` button calling `gen.submit(...)`. When `gen.phase === "result"` and edit is active, this pane swaps to the compact edit form (§21 of the design doc: "What should change?" textarea + "1 credit" + Apply edit/Cancel) instead of stacking a form under the image.

Right pane (~58–62% width, `max-width` container 1180–1280px total): single `<GenerationCanvas>` whose `state` is derived from `gen.phase` (`idle`→`ready`, `starting|polling`→`generating`, `result`→`result`, `error`→`error`), `aspectRatio` from the same resolution logic already in the file (kept local, per Task 1 note), `actions={<GenerationActions onDownload={...} onEdit={...} onRegenerate={gen.regenerate} />}`.

Below `md`, both panes stack to one column in source order: composer → canvas (matches design doc §23).

Versions: keep `VersionStrip` but only render it when `gen.versions.length > 1` (design doc §30 — this is likely already the case; verify and add the guard explicitly with a one-line comment if missing).

Keep `improveInPrompt()`, credit-insufficient copy, and the "Open in Generate" concept N/A here (this *is* Generate).

**Step 4: Run tests, `npm run typecheck`, confirm pass.**

**Step 5: Manual visual check (no paid API call)**

Run the app locally (`npm run dev`), open `/generate` with `VITE_GENERATION_ENABLED=true`. Drive the `ready` state by simply loading the page. To see `generating`/`result`/`error` without spending money, temporarily point `gen.phase` via React DevTools or add a short-lived dev-only query param (e.g. `?mockState=generating|result|error`) that's stripped before commit — do not leave test-only mock branches in production code; if a fixture is genuinely needed for repeatable QA, put it behind `import.meta.env.DEV` and remove or gate it out of the final commit per the design doc's "no live retest" instruction. Screenshot at 1280/1440/1512 and 390px per design doc §44/§41.

**Step 6: Commit**

```bash
git add src/components/generate/GenerateWorkspace.tsx tests/unit/generate-workspace-layout.test.ts
git commit -m "Redesign /generate as a two-pane desktop creation workspace

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Inline generation in Prompt Build

**Files:**
- Modify: `src/components/prompt/BuildMode.tsx`
- Test: `tests/unit/build-mode-inline-generation.test.ts`

**Step 1: Write tests**

- "Generate image" click does not call `navigate` (assert `saveGenerationHandoff`/`navigate({to:"/generate"})` call sites are gone from `handleGenerateImage`, replaced by a call into `useGeneration().submit`).
- Clicking it once is sufficient to reach the `generating` phase (no second confirmation button rendered).
- The existing Build "building a prompt" `LoadingState` (Loader2-based) is untouched — assert its source is unchanged/still present.
- `ThinkingField` only appears once a generation is in flight (source-pattern: `ThinkingField` import + usage guarded by generation phase, not by Build's own `loading` state).

**Step 2: Run, confirm failure.**

**Step 3: Implement**

- Replace `handleGenerateImage`'s body: drop `saveGenerationHandoff`/`navigate`; instead call a `useGeneration({ sourceContext: { type: "prompt_build" } })` instance's `submit({ prompt: result.prompt, structuredAspectRatio: result.aspect_ratio ?? null, routingHints: {...}, references: reference?.dataUrl ? [reference.dataUrl] : [] })`. (If `useGeneration.submit` doesn't yet accept inline references, extend its signature in this task rather than duplicating upload logic — call `addReference` first if that's the established pattern from Task 1.)
- Below the existing `PromptSurface`/`ActionRow` for the final prompt, render `<GenerationCanvas>` only once `gen.phase !== "idle"`, in a two-pane layout at `md+` (prompt left, canvas right — design doc §4/§5) and stacked at mobile (design doc §6), reusing the same `GenerationCanvas`/`GenerationActions` from Task 2 — no new canvas implementation.
- Auth-signed-out click: same as Task 1's `pendingSubmit` pattern already inside the hook — verify it resumes correctly when the hook is instantiated inside `BuildMode` rather than `GenerateWorkspace` (both are ordinary mounted components on `/prompt`, which per the design doc §10 stays mounted across mode switches, so the pending-submit ref should survive identically).
- Error state (design doc §11): keep the built prompt visible; show "Generation failed. Your credit was returned." + "Try again" via `gen.reset()` + resubmit, without touching Build's own result state.

**Step 4: Run tests + typecheck, confirm pass.**

**Step 5: Commit**

```bash
git add src/components/prompt/BuildMode.tsx tests/unit/build-mode-inline-generation.test.ts
git commit -m "Generate inline in Prompt Build instead of navigating to /generate

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Inline generation in Prompt Critique

**Files:**
- Modify: `src/components/prompt/CritiqueMode.tsx`
- Test: `tests/unit/critique-mode-inline-generation.test.ts`

**Step 1–2:** Mirror Task 4's tests/red step, scoped to `handleGenerateRewrite` / the rewritten-prompt section only (critique analysis above must render unchanged — assert score/dimensions/weaknesses JSX untouched).

**Step 3: Implement**

Same pattern as Task 4: `useGeneration({ sourceContext: { type: "prompt_critique" } })`, submit from `handleGenerateRewrite` without navigating, render `GenerationCanvas`/`GenerationActions` under the rewritten-prompt block only (design doc §8/§9), critique analysis section above stays exactly as-is, critique's own `Loader2` "Reviewing your prompt…" block untouched.

**Step 4: Run tests + typecheck.**

**Step 5: Commit**

```bash
git add src/components/prompt/CritiqueMode.tsx tests/unit/critique-mode-inline-generation.test.ts
git commit -m "Generate inline in Prompt Critique instead of navigating to /generate

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Library handoff double-click check

**Files:**
- Read: `src/routes/library.tsx` (`PromptDetailDialog.handleGenerate`, ~line 609)

**Step 1:** Per the architecture report, Library already does a single-click `saveGenerationHandoff` + `navigate({to: "/generate"})`, and `GenerateWorkspace`'s mount effect immediately consumes the handoff and can auto-submit. Verify: does the current mount effect merely *populate* the composer (still requiring the arriving user to press Generate again), or does it auto-submit? Read the relevant mount effect in `GenerateWorkspace.tsx` (now partly in `use-generation.ts` after Task 1) to confirm.

**Step 2:** If it only pre-fills (no auto-submit), decide with product intent from the design doc ("if the Library button says Generate, it must not lead to a second confirmation Generate click") — add an auto-submit-on-handoff-consume path specifically for `sourceType === "library"` (Gallery intentionally stays pre-filled-not-submitted since a reference alone isn't an instruction; Prompt-originated handoffs no longer use this path after Tasks 4–5). Write a test asserting Library's handoff triggers `submit()` automatically while Gallery's does not.

**Step 3: Implement, test, typecheck.**

**Step 4: Commit**

```bash
git add src/lib/generation/use-generation.ts tests/unit/<new-test>.test.ts
git commit -m "Auto-submit Library-originated generation handoff (no second click)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

(Skip this task's implementation, keep only the verification step, if Step 1 shows it already auto-submits.)

---

## Task 7: Final validation pass

**Step 1:** `npm test`
**Step 2:** `npm run typecheck`
**Step 3:** `npm run lint` (changed files only, per project convention)
**Step 4:** `npm run build`
**Step 5:** Fix any regressions surfaced by the above before considering the pass done.
**Step 6:** Do not commit anything beyond fixes to the above — no scope creep (no Stripe, no model/quality selectors, no version-thread architecture work, per design doc "Out of scope").

---

## Reporting

When all tasks are complete, report exactly (per the original brief's "Final Response" format, not a long doc):
- commit hash(es)
- Build inline generation status
- Critique inline generation status
- direct `/generate` desktop redesign status
- mobile redesign status
- shared generation components created/reused
- tests/typecheck/lint/build results
- any genuine remaining UI blocker
