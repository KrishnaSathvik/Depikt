# Inline Generation + Generate Workspace UI — Design

Status: approved by user (provided as a fully-specified implementation brief). This doc
records it as the design of record before planning/implementation.

## Problem

Backend generation (Flare/Sunburst routing, credits, job APIs, storage, RLS) is already
live-verified with 12 real operations. This pass is UI/UX only:

1. Prompt Build and Critique must generate **inline**, in place, with no `/generate` hop
   and no second "Generate" click.
2. Direct `/generate` must become a proper desktop creation workspace (currently too much
   empty space / feels like a floating composer).

No backend rework, no new API calls to OpenAI beyond what already exists, no payments,
no model/quality selectors, no live benchmark re-runs.

## Scope decisions (locked)

- Build/Critique keep their own existing "building/analyzing" spinners unchanged.
  `ThinkingField` is only ever used for **image generation**, never for prompt
  build/critique loading.
- One shared generation execution path (`useGeneration` hook) reused by `/generate`,
  Build inline, and Critique inline — no duplicated polling/job-recovery logic per surface.
- One shared `GenerationCanvas` (states: ready / generating / result / error) and one
  shared `GenerationActions` (Download / Edit / Regenerate) reused everywhere.
- Auth: a signed-out Generate click preserves full pending-generation state (prompt,
  references, ratio, source, idempotency key) and auto-resumes after sign-in — no second
  click required. Insufficient credits after auth blocks submission and shows credit state.
- Versions: hide the "Versions" section entirely when only one version exists; do not
  redesign the session/version-thread architecture (known gap, deferred).
- Library: only fix the handoff if it currently requires a second confirmation click;
  otherwise leave Library UI as-is.
- Gallery: unchanged — reference-only handoff to `/generate` is correct as-is (an image
  alone isn't an instruction).
- Templates: Template → Build → built prompt → inline generate (no `/generate` hop).
- Header/nav and routing are unchanged: Library · Prompt · Generate · Gallery · Blog;
  Templates/MCP stay footer-only. Inline generation stays on `/prompt` and
  `/prompt?mode=critique`; direct generation stays on `/generate`.
- Visual system: white canvas / black ink, muted processing blue allowed in
  ThinkingField only; no dashboards, no giant black areas, no gradients/glow.

## Architecture

- `src/lib/generation/` already has the job/polling/credit logic backing
  `GenerateWorkspace` today — this pass extracts/generalizes it into a reusable
  `useGeneration()` hook (submit, idempotency, auth gate, credit state, polling, job
  recovery, success/failure+refund, edit, regenerate, active result/version) rather than
  writing a second implementation.
- `src/components/generate/` gains shared presentational pieces
  (`GenerationCanvas`, `GenerationActions`, edit panel) that `GenerateWorkspace`,
  `BuildMode`, and `CritiqueMode` all consume.
- `BuildMode`/`CritiqueMode` gain an inline generation region driven by the same hook,
  entering directly at `generating` state (no `ready` state needed inline, since the
  first click already starts the job).
- `/generate` (`GenerateWorkspace`) is restructured into a two-pane desktop layout
  (~38–42% controls / ~58–62% canvas, max-width ~1180–1280px) with a `ready` canvas
  state (static dot field, ratio-shaped frame) before generation, collapsing to a single
  column below the tablet breakpoint (verified visually, not hardcoded to 768px).

## Testing / validation

- Unit/component tests per the brief's Testing section (no-navigation on Generate click,
  inline start, auth-resume-without-second-click, ThinkingField scoped to image gen only,
  Build/Critique spinners preserved, Versions hidden at 1 version, Gallery/Library
  behavior unchanged).
- No new paid OpenAI calls; use existing fixtures/dev job states for generating/result/error
  visual states. A live call is only justified if a state truly can't be verified otherwise.
- Final validation: `npm test`, `npm run typecheck`, `npm run lint` (changed files),
  `npm run build`.

## Out of scope (explicit)

Stripe/payments, credit economics, model routing/selector, quality selector, rerunning
benchmarks, rewriting generation APIs/OpenAI adapter, redesigning Build/Critique analysis
content, replacing Build/Critique spinners, header nav changes, MCP generation, broad
Library/Gallery redesign, version/session architecture work, new SEO/content work.
