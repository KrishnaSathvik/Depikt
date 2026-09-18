# VNext 1 — Bind Intent to Generate

Status: design of record. Direction approved 2026-09-14.

Luna Intent understands the request. TypeScript `buildGenerationPlan()` decides how Generate executes it. That is the boundary. Do not add a second planning contract.

This is **not** entities, campaigns, face embeddings, masks, web search, or an image validator.

## Problem

Build already understands the request (`IntentSchema` in `src/lib/prompt-engine/intent.ts`). Native Generate ignores that understanding and always creates one Flare/Sunburst job with `n: 1` (`src/lib/generation/openai-images.ts`, `src/lib/generation/job-pipeline.ts`).

The storyboard playbook also writes `PAGE 1:` / `PAGE 2:` into a **single** prompt, so even a correct series Intent still becomes one collage.

## Goal

```
User prompt
    → existing analyzeIntent() (Luna)
    → buildGenerationPlan() (TypeScript)
    → single | series | collage | contact_sheet | edit
    → 1 or N generation jobs (parallel children)
    → individual images
```

**Success criterion: 11/11 correct classification on the frozen VNext 1 suite. Pixel quality is out of scope.**

Two gates, both 11/11:

| Gate | Path | When |
|---|---|---|
| CI | fixture Intent → `buildGenerationPlan` | every commit |
| Release | frozen raw prompt → live `analyzeIntent` → `buildGenerationPlan` | before shipping VNext 1, with `OPENAI_API_KEY` |

If Luna misses a case: fix it in `buildGenerationPlan()` first. Only change `INTENT_INSTRUCTIONS` if generic TypeScript rules cannot resolve it safely.

## Locked decisions

1. **No second planner LLM.** Do not add an `output` object to `IntentSchema`. `buildGenerationPlan(intent, userPrompt)` derives the deliverable from Intent fields plus **generic** wording patterns. The 11 cases are regression tests, not rules. The planner code must never mention those case ids or domain names (no `astrophotography`, no `Cities: Skylines`, no `HALO`).
2. **Do not run the prompt writer on Generate.** Singles send the user's prompt. Only the series decomposer writes child briefs.
3. **Do not solve series with OpenAI `n`.** Session + parallel child jobs.
4. **Shared path, not Generate-only.** `useGeneration` and the jobs API plan. Build/Critique inline generate uses the same hook. Series decomposition input is original `userInput`, never the writer's `PAGE 1` string.
5. **Session is the series parent.** No fake parent OpenAI job.
6. **Credits:** 1 output = 1 credit. Auto-execute up to `AUTO_SERIES_CAP` (4). Above that, the user picks `autoCount` or `desiredCount`. Decomposition and reservation use the **selected** count. All-or-nothing reservation.
7. **Never trust executable plan data from the browser.** `POST /plans` returns a displayable plan plus a server-signed `planToken`. `POST /jobs` accepts `planToken` + `selectedCount` only.
8. **`search_needed` is classification + telemetry only.** No web search.
9. **No image-model fine-tuning.**
10. **Library auto-submit stays one image** (`sourceContextType === "library"`). This is a product-source rule, not a prompt-content special case.
11. **Masks, entities, validators, campaign memory are out of this spec.**

## Architecture

### 1. Frozen eval suite — `tests/image-evals/vnext-1/`

Classification tests. No live image generation in CI.

```
tests/image-evals/vnext-1/
  cases.json          # id, prompt, has_reference, expected, fixture_intent
  fixtures/           # reference images used by cases that need them
  README.md           # how to run CI vs release gate
```

Each case freezes:

| Field | Required |
|---|---|
| `id` | yes |
| `prompt` | yes — the user string, not a paraphrase |
| `has_reference` | yes |
| `expected.mode` | `single` \| `series` \| `collage` \| `contact_sheet` \| `edit` |
| `expected.desiredCount` | requested job count before cap (1 for non-series) |
| `expected.autoCount` | jobs that would run without confirmation |
| `expected.search_needed` | boolean |
| `expected.separate_assets` | boolean |
| `fixture_intent` | yes — a legal `Intent` used by the CI gate |
| `baseline_notes` | optional human note from the original test |

The planner implementation must not import `cases.json` except from tests. Case ids are test labels only.

Baseline **images** are not required to score VNext 1.

#### Frozen cases (regression tests, not rules)

Prompts below are the wording from the tests this plan is based on. If a live test used a different string, replace it in `cases.json` **before** scoring — do not “improve” the prompt.

| id | Prompt (frozen) | Expected |
|---|---|---|
| `instagram-influencer` | `average instagram influencer photo, casual candid, natural light` | single, desiredCount 1, search false |
| `ai-poster` | `build an AI conference poster, strong typography and information hierarchy, title "THE INTELLIGENCE LAYER"` | single, desiredCount 1, search false |
| `halo-bottle` | `3:4 product still. One 330ml frosted glass bottle of sparkling water, pale citrus liquid, condensation, wet black stone. Label in one line, exact spelling: "HALO". Tiny line under it: "still, then not". Cool rim light, no extra props, no other text.` | single, desiredCount 1, search false |
| `same-woman-contact-sheet` | `the same woman, six expressions, clean 2×3 contact sheet` | contact_sheet, desiredCount 1, search false |
| `breakfast-table` | `breakfast table: 1 coffee, 2 croissants, 3 tulips, 1 pair of sunglasses, a red notebook, orange juice in the lower right` | single, desiredCount 1, search false |
| `pearl-earring` | `use this image as reference and recreate Girl with Pearl Earring accurately` (fixture attached) | single, desiredCount 1, search false, reference |
| `cities-skylines` | `Cities: Skylines 1 California layout using relevant DLCs. Check DLC and research. Suburban district, downtown, sports and entertainment, integrated coast city.` | series, desiredCount 4, search true, separate assets |
| `astrophotography` | `create highly realistic crisp milkyway or star trails/meteors/stars astrophotography images for instagram story` | series, desiredCount 4, search false, separate assets |
| `precision-edit` | `Change the red notebook to green. Keep everything else exactly the same.` (breakfast result attached as edit source) | edit, desiredCount 1, search false |
| `product-campaign` | `the same HALO Lemon bottle in four environments: studio, beach, pool, night city` | series, desiredCount 4, search false |
| `brand-campaign` | `HALO summer campaign, four Instagram ads, same product and character, different scenes` | series, desiredCount 4, search false |

Ship bar is **11/11** on both gates. 10/11 is investigate-not-ship.

### 2. Execution plan — `src/lib/generation/plan.ts`

Pure functions. No fetch. No case-id or domain-name branches.

```ts
export type OutputMode = "single" | "series" | "collage" | "contact_sheet" | "edit";

export interface GenerationPlan {
  mode: OutputMode;
  /** Raw requested job count (7 in the “7 ads” example). Always >= 1. */
  desiredCount: number;
  /** Jobs that run without asking. min(desiredCount, AUTO_SERIES_CAP) for series; 1 otherwise. */
  autoCount: number;
  separateAssets: boolean;
  searchNeeded: boolean;
  /** true when mode === "series" && desiredCount > AUTO_SERIES_CAP */
  requiresCountConfirmation: boolean;
}

export const AUTO_SERIES_CAP = 4;

export type SelectedCount = number;

export function resolveSelectedCount(
  plan: GenerationPlan,
  selectedCount: SelectedCount | undefined,
): SelectedCount {
  if (!plan.requiresCountConfirmation) return plan.autoCount;
  if (selectedCount === plan.autoCount || selectedCount === plan.desiredCount) {
    return selectedCount;
  }
  throw new Error("selectedCount must be autoCount or desiredCount");
}
```

Children are **not** on this object. Child briefs are produced later, for `selectedCount` only.

`buildGenerationPlan(intent: Intent, userPrompt: string, source?: SourceContextType): GenerationPlan`

If `source === "library"` → force `mode: "single"`, counts 1, `separateAssets: false`. Then return.

Otherwise, first match wins:

1. **Edit** — `intent.task === "edit"` OR `intent.reference_intent === "edit_source"` OR `intent.category === "image_edit"` → `mode: "edit"`, counts 1.
2. **Explicit one-image grid** — generic contact-sheet / collage language → `contact_sheet` or `collage`, counts 1.
   - contact_sheet: `\bcontact\s*sheet\b`, `\bsticker\s*sheet\b`, or an `\b\d+\s*[x×]\s*\d+\b` grid **plus** sheet/grid/panel wording.
   - collage: `\bcollage\b`, `\bmood\s*board\b`, `\bmoodboard\b`, `\boverview\b`, `\bcomparison\s*board\b` when the prompt does not also ask for separate images/files/assets.
3. **Intent series** — `intent.series.enabled` and (`intent.series.count === null || intent.series.count > 1`) and unit is not `panel` (or unit is `panel` but the prompt asks for separate images/files/assets) → `mode: "series"`, `separateAssets: true`.
4. **Panel as one image** — `intent.series.unit === "panel"` and no separate-assets wording → `contact_sheet`, counts 1.
5. **Inferred series** — generic standalone-deliverable language, even if the analyzer returned `create`:
   - explicit count of images/ads/variations/scenes/layouts/examples/concepts (`\b(\d+)\s+(images?|ads?|variations?|scenes?|layouts?|examples?|concepts?)\b`), or
   - listed distinct visual variants (slash-separated or `or`-separated subjects) **together with** a plural deliverable word (`images`, `ads`, `variations`, …).
   - Plural alone (`photos of a cat`) is **not** enough.
6. **Else** — `single`, counts 1.

Count for series (`desiredCount`):

1. Explicit number in Intent (`series.count`) or in the prompt (`N images/ads/…`) wins.
2. Else the number of distinct listed variants.
3. Else `AUTO_SERIES_CAP` (4) when a series was requested with no count.
4. Minimum series `desiredCount` is 2.

Then:

```
autoCount = mode === "series" ? min(desiredCount, AUTO_SERIES_CAP) : 1
requiresCountConfirmation = mode === "series" && desiredCount > AUTO_SERIES_CAP
```

#### >4 confirmation

```
Planner: desiredCount = 7, autoCount = 4, requiresCountConfirmation = true

UI: “This request works best as 7 separate images. Generate 4 now, or generate all 7?”

User chooses selectedCount ∈ {4, 7}

POST /jobs { planToken, selectedCount }
  → resolveSelectedCount
  → decomposeSeries(..., selectedCount)   // only if mode === "series"
  → reserve selectedCount credits atomically
  → insert selectedCount jobs
```

If `requiresCountConfirmation` is false, `selectedCount` is ignored and `autoCount` runs. The client must not send a count the token does not allow.

`searchNeeded` (no network, no domain names):

```
true iff
  prompt matches /\b(research|look\s*up|check|current|tonight|as of)\b/i
  OR intent.factual_requirements.missing_facts.length > 0
```

Do **not** special-case titles of games, products, or artworks. “research Cities: Skylines DLCs” is true because of `research`. “make a fictional futuristic city inspired by California” is false.

### 3. Series decomposer — `src/lib/generation/decompose-series.ts`

Runs **only** when `plan.mode === "series"`, and **only after** `selectedCount` is known. One Luna structured call (`MODEL_ROLES.INTENT`). Count is an argument, not a model decision.

Input: original `userInput` (never writer output), Intent, `selectedCount`.

Output (strict JSON): `{ title: string; children: Array<{ label: string; prompt: string }> }`

Code then truncates or pads to `selectedCount`. Appends shared constraints to every child (aspect if known, “this is one standalone image, not a collage”, exact_text, consistency_requirements).

Failure fallback: `Image {i} of {n} — {userInput}. This is a single standalone image, not a collage.`

### 4. Plan token — never accept an inline plan from the browser

`POST /api/generation/plans`:

```
{ prompt, userInput?, intent?, referenceAssetIds, sourceVersionId, sourceContext, structuredAspectRatio }
→ userInput defaults to prompt (direct Generate)
→ if intent omitted: analyzeIntent({ userInput, hasImage })
→ if intent provided: parse with IntentSchema (Build/Critique already ran analyzer)
→ plan = buildGenerationPlan(intent, userInput, sourceContext.type)
→ planToken = HMAC-sign({
     userId, promptHash, userInputHash, referenceAssetIds, sourceVersionId,
     intent, plan, exp
   })
→ { plan: { mode, desiredCount, autoCount, separateAssets, searchNeeded,
            requiresCountConfirmation, creditCostAuto, creditCostAll },
    planToken }
```

Do **not** decompose on `/plans`. Child briefs depend on `selectedCount`.

`POST /api/generation/jobs`:

```
{ planToken, selectedCount?, idempotencyKey, structuredAspectRatio, sourceContext }
→ verify HMAC, exp, userId
→ reject if prompt/userInput/refs are not the ones bound in the token
   (they live inside the token; the client does not resend the prompt as executable input)
→ selected = resolveSelectedCount(plan, selectedCount)
→ if series: children = decomposeSeries(userInput, intent, selected)
  else: one child = user prompt (or fidelity preamble + user prompt)
→ reserve `selected` credits atomically
→ insert `selected` jobs on one session
→ return { sessionId, jobs: [{ id, label, index, status }] }
```

Signing secret: `GENERATION_PLAN_SECRET` (server env). Tests inject a fixture secret. Token TTL: 10 minutes.

The client cannot change `series 4` → `series 20`, cannot edit child prompts, and cannot swap the prompt after planning without a new `/plans` call.

Build/Critique pass `userInput` (the rough idea) **and** `intent`. `prompt` in that request is ignored for series planning; it is only used as the single-image prompt when `mode !== "series"`.

Library auto-submit still calls `/plans` then `/jobs` with the library prompt; `buildGenerationPlan` forces single.

### 5. Credits — all-or-nothing batch

Add `create_generation_jobs` that reserves `p_count` credits in one transaction or inserts nothing.

Idempotency: `{parentKey}:{index}` per child.

UI copy (`src/lib/product.ts`):

- Single / contact_sheet / collage / edit: existing Generate control (1 credit).
- Series, no confirmation: `Generate {autoCount} images · {autoCount} credits`. Click executes `selectedCount = autoCount`.
- Series, confirmation: dialog `This request works best as {desiredCount} separate images. Generate {autoCount} now, or generate all {desiredCount}?` Default: `autoCount`.

A failed child refunds **that** child’s credit only.

### 6. Schema additions (small)

On `generation_jobs`:

- `series_index integer null`
- `series_label text null`

On `generation_sessions`:

- `plan_json jsonb null` — `{ mode, desiredCount, autoCount, selectedCount, searchNeeded, childLabels }`

No new tables.

Stale cutoff (`STALE_MS = 6 * 60 * 1000`) stays **per job**. Parallel children each get their own 6 minutes.

**Session poll must apply that cutoff to every non-terminal child**, not only the job the client happened to GET. Otherwise a queued sibling that never received `/run` holds a credit forever if the user never opens that job id.

### 7. Resume-safe child startup

`POST /api/generation/jobs/:id/run` already claims with `queued → running` and returns `{ claimed: false, status }` if not queued. Keep that.

Required client rule: on submit, on session poll, and on page resume, for every job in the session:

```
if (job.status === "queued") startGenerationJob(job.id)  // idempotent
```

Persist the **session id** (not a single job id) as the in-flight key.

If a child stays `queued` past `STALE_MS`, the next session or job GET fails it and refunds that child’s credit (same as today’s single-job stale path).

### 8. UI

`useGeneration` grows a session-of-jobs model: progressive fill, labels from `series_label`, credit-gate against `selectedCount`, per-child edit/regenerate.

Hide Intent, search_needed, decomposer, Flare/Sunburst. No series count picker except the >4 confirm dialog.

### 9. Reference fidelity (no new system)

When mode is single/edit and `reference_intent` is `subject_identity` | `product_object` | `edit_source` | `composition`:

- Router already sends Sunburst.
- If the user prompt has no preserve list, prepend a short fidelity preamble from `intent.must_preserve` and `referenceGuidance()`. String assembly, not a writer call.

### 10. Telemetry

- `generation_planned` — mode, desiredCount, autoCount, searchNeeded, requiresCountConfirmation, source
- `generation_series_started` — selectedCount
- `generation_series_child_done` — index, success/fail

No dashboard. No user-visible search UI.

## Tests

| Test | Gate |
|---|---|
| `tests/unit/generation-plan.test.ts` — 11/11 fixture Intent → plan | CI |
| `tests/eval/vnext-1-live-intent.test.ts` — 11/11 live analyzer → plan | **VNext 1 release**; skip in CI without key |
| `tests/unit/generation-plan-token.test.ts` — HMAC bind, reject tamper, reject bad selectedCount | CI |
| `tests/unit/generation-decompose-series.test.ts` — mocked Luna; length = selectedCount; no collage | CI |
| `tests/unit/generation-handoff-user-input.test.ts` — decomposer input is `userInput`, not writer `PAGE n` | CI |
| Resume: queued siblings get `/run`; duplicate `/run` is a no-op | CI (pure functions / fake fetch) |

If the live gate fails: first add a **generic** TypeScript rule that would have classified that prompt, rerun both gates, and only then consider Intent-instruction tweaks.

## What this explicitly will not do

| Item | When |
|---|---|
| `output` field on IntentSchema | only if generic TS rules cannot hit 11/11 on the release gate |
| Prompt writer on Generate | never in VNext 1 |
| OpenAI `n>1` as series | never |
| Domain hardcoding of the 11 cases | never |
| Mask / SAM / precision inpaint | VNext 2 |
| Named reference packs, locks, entities | VNext 3 |
| Web or image search | VNext 4 |
| Visual validator + auto-repair | VNext 5 |
| Fine-tune Flare/Sunburst | not planned |
| Campaign / workspace memory | later |
| Changing Library auto-generate to series | out of scope |

## Implementation order

| Slice | Ship |
|---|---|
| **1A** | Freeze `cases.json` + README |
| **1B** | `buildGenerationPlan` + count confirmation helpers; CI 11/11 |
| **1C** | Live `analyzeIntent → plan` release eval (not CI) |
| **1D** | Decomposer + userInput handoff regression test |
| **1E** | planToken, batch RPC, parallel `/run`, resume-safe client, credits UI |
| **1F** | persist `searchNeeded` on `plan_json` + telemetry |

1A–1C do not change production Generate. 1E is the user-visible change.

## Risks

- **Analyzer latency on every Generate** — one Luna call. Acceptable. Reuse Intent from Build when provided.
- **Wrong series on “photos of a cat”** — plural alone is not enough.
- **Build writer still emits PAGE blocks** — series path uses `userInput`. Guarded by `generation-handoff-user-input.test.ts`.
- **Tab close after `/jobs` before `/run`** — resume starts remaining queued children; stale queued children refund.
- **Four concurrent Sunburst `/run` requests** — expected.

## Later roadmap (unchanged)

VNext 2 masks → VNext 3 named reference packs/locks → VNext 4 actual search → VNext 5 validator/repair. None of those start until both 11/11 gates are green.
