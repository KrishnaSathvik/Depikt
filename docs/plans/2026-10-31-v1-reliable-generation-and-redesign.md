# V1 — Reliable Generation, Clear Value, and Creator Redesign

Date: 2026-10-31. Source: owner review of `docs/COMPETITIVE_AUDIT_2026-10.md`. Status: **plan, not started.**

Product rule: Depikt is a guided creative tool (write → improve → critique → generate → verify → refine), not a dashboard of AI features. Make the core action obvious, reveal advanced controls only when useful, and let the output carry the visual weight.

## Phase A — Reliable generation (P0)

### A1. Durable execution with Cloudflare Workflows

The target flow:

1. The browser creates a job and gets its ID back immediately.
2. Supabase does the atomic credit reservation and writes the job record.
3. A Cloudflare Workflow runs the job in durable steps:
   1. ground
   2. generate
   3. validate
   4. repair, only if needed
   5. persist output and settle the credit
4. The browser polls `/api/generation/jobs/:id`, as it does today, including after a reload or reopen.

Keep polling. No WebSockets in this phase.

Today this work runs inside the browser-held request to `/api/generation/jobs/:id/run`. That route goes away, or becomes a thin wrapper that starts the Workflow, kept during migration for older clients.

**Feasibility spike first. This is a blocker to verify before any build work.**

- `wrangler.jsonc` sets `"main": "@tanstack/react-start/server-entry"`. A Workflow class must be exported from the Worker's main module, and a `workflows` binding declared. That means a custom server entry: a local module that re-exports TanStack Start's fetch handler and the `WorkflowEntrypoint` subclass.
- The base Vite config comes from `@lovable.dev/vite-tanstack-config`. Confirm two things:
  - a custom server entry builds with it
  - the production deploy path, if Lovable deploys, honours the extra Wrangler binding
- If either fails, the fallback is a separate small Worker that owns the Workflow, called from the app through a service binding.
- Deliverable: a hello-world Workflow triggered from an app route, deployed to a preview, surviving client disconnect.

**Idempotency (non-negotiable)**

- Keep the existing conditional `queued → running` claim. Each Workflow step re-reads job state and is a no-op if its effect is already recorded.
- Credit settlement is a single conditional update keyed by job ID, never an increment from inside a retried step.
- Image persistence uses a deterministic storage path and image-version row keyed by `(job_id, attempt)`. A retry overwrites or detects instead of duplicating.
- **Unknown provider outcome** (a timeout after the request was sent): do not blindly retry the paid call. Mark the job `outcome_unknown` and run a bounded reconciliation, then decide refund or charge by explicit policy. Workflow retries for the provider step must be configured so a retry is safe only when the request is known not to have been accepted.
- Reuse the in-memory fake behind `GenerationDataAccess` (`job-pipeline.ts`) to unit-test retry, duplicate-run, and unknown-outcome paths.

**Done when**

- closing or reloading during any step still completes or cleanly fails the job
- forced step retries produce exactly one charge and one image
- the unknown-outcome path is covered by tests

### A2. Global quotas and usage metrics

- The current limiter is an in-memory `Map` per isolate (`src/lib/api/public-route.ts`). Keep it as burst protection, or swap in the Workers Rate Limiting binding. That binding is per location, so it covers bursts only.
- Add an atomic, account-level quota in Supabase: a counter row or RPC with a conditional update. It enforces any free daily allowance for Improve and Critique, plus per-account spend ceilings.
- Record per-request usage (tokens, image calls, repair calls, estimated cost) so pricing can be validated on real data.
- No free-tier expansion until this ships.

### A3. Pricing validation (analysis, no code)

- Compute cost per *settled* generation, including grounding, validation, and repair.
- Compare competitors like-for-like: resolution, quality tier, commercial rights, real limits.
- Decide pricing after this, not before.

## Phase B — Clear value (P1)

- **Credit messaging:** "1 credit · check + eligible repair included". Separate free prompt work from chargeable generation everywhere credits appear.
- **Homepage:** name Critique in the hero and capabilities copy. This is copy-only and can ship immediately.
- **Inline Enhance in Generate:** Off / Auto / On.
  - Show a preview of the enhanced prompt, keep the original for comparison, and never replace precise instructions silently.
  - It reuses the Builder endpoint.
- **Critique evaluation:** run a controlled benchmark with three arms (original prompt, Depikt rewrite, one competing enhancer). Measure human-rated fidelity, quality, and adherence, and whether the score predicts the outcome. Use the existing `tests/bench` harness. This needs `OPENAI_API_KEY` and image budget, so the owner must approve the spend.

## Phase C — Creator redesign (M1–M4)

Keep the existing foundations: `CreationComposer`, the `CreatorDraftProvider` shared draft and references, and the tool handoffs. Inputs share one component. Each tool gets its own result layout.

| Mode | Purpose | Result priority |
|---|---|---|
| Generate | Create and iterate images | Image-first |
| Improve | Turn ideas into strong prompts | Writing-first, clear before/after |
| Critique | Diagnose and fix weak prompts | Analysis-first, actionable |

### M1. Shared shells and system

Build:

- responsive workspace shells
- action hierarchy: one primary action per state
- layout tokens in `src/styles.css`
- honest, stable-layout loading states, with cancel or retry where supported
- 44px touch targets
- focus, contrast, and reduced-motion handling

### M2. Generate

- On desktop, the completed image is the largest element, with a contextual action panel beside it. On mobile, the image sits above a compact toolbar.
- Collapse the prompt panel instead of putting long text above the image.
- Replace the ratio dropdown with visual ratio choices.
- Add role chips on reference thumbnails (Style, Subject, Product) that the user can override. These map to the existing `reference_intent`.
- Result actions: Edit, Use as reference, Improve prompt, Regenerate (with credit cost).
- Show generation status with accurate steps from the job record.

### M3. Improve

- Side-by-side original vs improved on desktop; a Before/After toggle on mobile; word-level diff.
- Show Safe, Stylized, and Experimental as selectable versions, not a long stack. Each has one primary Generate action.
- Add a refinement bar with suggestions derived from the actual prompt.
- Let users lock details (brand name, exact colour) that later variations must keep. This needs a writer-input field for locked constraints.

### M4. Critique

- Lead with the top three fixes. Put the 10-dimension rubric behind "Detailed analysis".
- Show the revised prompt next to the original, with a diff. "Generate revised prompt" becomes the primary action after fixes are accepted.
- **Schema prerequisite:** `weaknesses` and `improvements` are plain `string[]` today (`src/lib/prompt-engine/schemas.ts`). Span highlights and per-fix Apply need a new structured contract, in which each finding has:
  - its dimension
  - an exact quoted span
  - a replacement patch

  Server-side checks must confirm each span actually occurs in the prompt and that patches don't overlap. A finding that fails these checks is shown as text only, with no highlight and no Apply. Version this alongside `PROMPT_VERSION`, and benchmark it before turning on the UI.
- Apply one, Apply all, Undo.

### Every milestone ships with

- desktop and mobile visual review
- keyboard and screen-reader checks
- empty, loading, and error states
- regression tests for existing flows: draft persistence across tabs, handoffs, auth gate, Library "Use this prompt" without auto-submit

### Success metrics (post-redesign)

- generation completion rate
- prompt reuse
- Critique → Generate conversion
- Improve → Generate conversion

## Sequencing

A1 spike → A1 → A2 → B (credit copy and homepage Critique can run in parallel with A) → M1 → M2 → M3 → M4. The Critique evaluation runs before M4's structured-span work is enabled.
