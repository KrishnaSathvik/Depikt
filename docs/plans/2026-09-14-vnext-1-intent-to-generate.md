# VNext 1 — Bind Intent to Generate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bind the existing Luna Intent analyzer to native Generate via a deterministic TypeScript plan, so series become parallel child jobs and singles keep the user’s prompt.

**Architecture:** `analyzeIntent` (already exists) understands the request. `buildGenerationPlan` (new, pure TS) decides `single | series | collage | contact_sheet | edit`. `POST /api/generation/plans` returns a displayable plan plus an HMAC `planToken`. `POST /api/generation/jobs` verifies the token, decomposes series for `selectedCount`, reserves that many credits atomically, and inserts child jobs on one session. The client starts queued children in parallel via the existing idempotent `/run` claim.

**Tech Stack:** TypeScript, Zod `IntentSchema`, Node test runner, TanStack Start file routes, Supabase RPC, `node:crypto` HMAC (`nodejs_compat` is already on in `wrangler.jsonc`).

## Global Constraints

- Spec of record: `docs/plans/2026-09-14-vnext-1-intent-to-generate-design.md`
- Do **not** add `output` to `IntentSchema`
- Do **not** run the prompt writer on Generate; series decomposer only
- Do **not** use OpenAI `n>1` as the series mechanism
- Do **not** hardcode case ids or domain names (`astrophotography`, `Cities: Skylines`, `HALO`, `Girl with Pearl`) in production code
- `cases.json` is imported only from tests
- Library `sourceContextType === "library"` forces single (product-source rule, not prompt-content)
- 11/11 CI gate every commit; 11/11 live `analyzeIntent` gate before release (`npm run test:vnext-1-live`)
- 1 credit = 1 image; `AUTO_SERIES_CAP = 4`; never silently spend more than 4
- Never accept executable plan JSON from the browser
- No live OpenAI image generation in CI
- Do not start VNext 2–5 (masks, entities, search, validator)
- Prettier: double quotes, semicolons, trailing commas, 100 char width
- `cn()` for className merging; product copy in `src/lib/product.ts`

## File map

| File | Responsibility |
|---|---|
| `tests/image-evals/vnext-1/cases.json` | Frozen prompts, expected plan, fixture Intents |
| `tests/image-evals/vnext-1/load-cases.ts` | Typed loader used by CI and live tests |
| `src/lib/generation/plan.ts` | `buildGenerationPlan`, `resolveSelectedCount`, search/count helpers |
| `src/lib/generation/plan-token.ts` | HMAC sign/verify |
| `src/lib/generation/decompose-series.ts` | Luna child briefs for `selectedCount` |
| `src/lib/generation/series-resume.ts` | Which session jobs need `/run` |
| `src/lib/generation/handoff.ts` | Add `userInput` + `intent` |
| `src/routes/api/generation/plans.ts` | New plan endpoint |
| `src/routes/api/generation/jobs.ts` | Create from `planToken` + `selectedCount` |
| `src/routes/api/generation/sessions.$id.ts` | Return jobs; stale-fail every queued/running child |
| `supabase/migrations/20260914120000_generation_series.sql` | series columns + batch reserve RPC |
| `src/lib/generation/use-generation.ts` | Plan → confirm → batch jobs → resume queued children |
| `src/lib/product.ts` | Series button / confirm copy |
| `src/components/prompt/BuildMode.tsx` | Pass `userInput` + `intent` into `gen.submit` |
| `src/components/prompt/CritiqueMode.tsx` | Pass original critique `userInput` |
| `package.json` | `test:vnext-1-live` script |

---

### Task 1: Freeze the VNext 1 suite

**Files:**
- Create: `tests/image-evals/vnext-1/cases.json`
- Create: `tests/image-evals/vnext-1/load-cases.ts`
- Create: `tests/image-evals/vnext-1/README.md`
- Create: `tests/unit/generation-eval-cases.test.ts`

**Interfaces:**
- Consumes: `Intent` from `src/lib/prompt-engine/intent.ts`
- Produces: `Vnext1Case[]` via `loadVnext1Cases()`

- [ ] **Step 1: Write the failing test**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";
import { IntentSchema } from "../../src/lib/prompt-engine/intent.ts";

test("vnext-1 suite has 11 unique cases with valid fixture intents", () => {
  const cases = loadVnext1Cases();
  assert.equal(cases.length, 11);
  assert.equal(new Set(cases.map((c) => c.id)).size, 11);
  for (const c of cases) {
    assert.ok(c.prompt.trim().length > 0, c.id);
    assert.equal(IntentSchema.safeParse(c.fixture_intent).success, true, c.id);
    assert.ok(["single", "series", "collage", "contact_sheet", "edit"].includes(c.expected.mode));
    assert.ok(c.expected.desiredCount >= 1);
    assert.ok(c.expected.autoCount >= 1);
    assert.ok(c.expected.autoCount <= c.expected.desiredCount);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/generation-eval-cases.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Write `load-cases.ts` and `cases.json`**

`load-cases.ts`:

```ts
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Intent } from "../../../src/lib/prompt-engine/intent.ts";

export interface Vnext1Expected {
  mode: "single" | "series" | "collage" | "contact_sheet" | "edit";
  desiredCount: number;
  autoCount: number;
  search_needed: boolean;
  separate_assets: boolean;
}

export interface Vnext1Case {
  id: string;
  prompt: string;
  has_reference: boolean;
  expected: Vnext1Expected;
  fixture_intent: Intent;
  baseline_notes?: string;
}

export function loadVnext1Cases(): Vnext1Case[] {
  const dir = dirname(fileURLToPath(import.meta.url));
  const raw = JSON.parse(readFileSync(join(dir, "cases.json"), "utf8")) as Vnext1Case[];
  return raw;
}
```

`cases.json` prompts (verbatim from the spec). For each, `fixture_intent` is a full Intent. Rules for fixtures (these are test data, not production branches):

- singles: `task: "create"`, `series.enabled: false`, `count: null`
- `same-woman-contact-sheet`: `task: "series"`, `series.enabled: true`, `count: 6`, `unit: "panel"`
- `precision-edit`: `task: "edit"`, `category: "image_edit"`, `reference_intent: "edit_source"`
- `pearl-earring`: `task: "create"`, `reference_intent: "composition"`, `creative_freedom: "low"`
- `cities-skylines`: `task: "series"`, `enabled: true`, `count: 4`, `unit: "asset"`, `missing_facts: ["DLC list"]`
- `astrophotography`: `task: "create"` (analyzer may miss series — CI must still pass via prompt patterns), `series.enabled: false`
- `product-campaign` / `brand-campaign`: `task: "series"`, `count: 4`, `unit: "asset"`
- `halo-bottle`: `exact_text` includes HALO strings; still `create` / not series

Astrophotography fixture is deliberately `create` so the TypeScript inferred-series rule is what scores it in CI.

Helper to keep JSON smaller: a complete `create` Intent looks like `baseIntent()` in `tests/unit/engine-intent.test.ts`. Copy that shape into every fixture.

README: CI = `npm test`. Release = `npm run test:vnext-1-live`. Ship bar 11/11. Pixel quality out of scope.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/generation-eval-cases.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/image-evals/vnext-1 tests/unit/generation-eval-cases.test.ts
git commit -m "$(cat <<'EOF'
Add the frozen VNext 1 classification suite.

Eleven real prompts with fixture Intents so planner work cannot drift without a failing test.
EOF
)"
```

---

### Task 2: Deterministic `buildGenerationPlan`

**Files:**
- Create: `src/lib/generation/plan.ts`
- Create: `tests/unit/generation-plan.test.ts`
- Modify: `tests/image-evals/vnext-1/load-cases.ts` (if `OutputMode` import needs the file to exist — already assumed in Task 1; if Task 1 used a local type, switch the import now)

**Interfaces:**
- Consumes: `Intent`, `SourceContextType`
- Produces: `buildGenerationPlan`, `resolveSelectedCount`, `AUTO_SERIES_CAP`, `GenerationPlan`, `OutputMode`

- [ ] **Step 1: Write the failing 11/11 CI test plus generic (non-suite) cases**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";
import {
  AUTO_SERIES_CAP,
  buildGenerationPlan,
  resolveSelectedCount,
} from "../../src/lib/generation/plan.ts";

test("CI gate: fixture Intent → plan is 11/11", () => {
  const src = readFileSync(new URL("../../src/lib/generation/plan.ts", import.meta.url), "utf8");
  assert.equal(src.includes("astrophotography"), false);
  assert.equal(src.includes("Skylines"), false);
  assert.equal(src.includes("HALO"), false);
  for (const c of loadVnext1Cases()) {
    const plan = buildGenerationPlan(c.fixture_intent, c.prompt);
    assert.equal(plan.mode, c.expected.mode, c.id);
    assert.equal(plan.desiredCount, c.expected.desiredCount, c.id);
    assert.equal(plan.autoCount, c.expected.autoCount, c.id);
    assert.equal(plan.searchNeeded, c.expected.search_needed, c.id);
    assert.equal(plan.separateAssets, c.expected.separate_assets, c.id);
  }
});

test("library source forces single even when the prompt lists variants", () => {
  const c = loadVnext1Cases().find((x) => x.id === "product-campaign");
  assert.ok(c);
  const plan = buildGenerationPlan(c.fixture_intent, c.prompt, "library");
  assert.equal(plan.mode, "single");
  assert.equal(plan.desiredCount, 1);
});

test("plural alone is not a series", () => {
  const plan = buildGenerationPlan(
    loadVnext1Cases()[0]!.fixture_intent,
    "photos of a cat sitting on a windowsill",
  );
  assert.equal(plan.mode, "single");
});

test("explicit N ads is a series of N; >4 requires confirmation", () => {
  const intent = loadVnext1Cases()[0]!.fixture_intent;
  const plan = buildGenerationPlan(intent, "create 7 Instagram ads for a soda brand");
  assert.equal(plan.mode, "series");
  assert.equal(plan.desiredCount, 7);
  assert.equal(plan.autoCount, AUTO_SERIES_CAP);
  assert.equal(plan.requiresCountConfirmation, true);
  assert.equal(resolveSelectedCount(plan, 4), 4);
  assert.equal(resolveSelectedCount(plan, 7), 7);
  assert.throws(() => resolveSelectedCount(plan, 20));
});

test("object counts in a scene are not deliverable counts", () => {
  const breakfast = loadVnext1Cases().find((c) => c.id === "breakfast-table")!;
  const plan = buildGenerationPlan(breakfast.fixture_intent, breakfast.prompt);
  assert.equal(plan.mode, "single");
  assert.equal(plan.desiredCount, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/generation-plan.test.ts`

Expected: FAIL (`buildGenerationPlan` not exported)

- [ ] **Step 3: Implement `src/lib/generation/plan.ts`**

No case ids. No domain names. First-match wins.

```ts
import type { Intent } from "../prompt-engine/intent.ts";
import type { SourceContextType } from "./job-request.ts";

export type OutputMode = "single" | "series" | "collage" | "contact_sheet" | "edit";

export interface GenerationPlan {
  mode: OutputMode;
  desiredCount: number;
  autoCount: number;
  separateAssets: boolean;
  searchNeeded: boolean;
  requiresCountConfirmation: boolean;
}

export const AUTO_SERIES_CAP = 4;

const CONTACT_SHEET_RE = /\b(contact\s*sheet|sticker\s*sheet)\b/i;
const GRID_RE = /\b\d+\s*[x×]\s*\d+\b/;
const GRID_CONTEXT_RE = /\b(sheet|grid|panel|panels)\b/i;
const COLLAGE_RE = /\b(collage|mood\s*board|moodboard|comparison\s*board)\b/i;
const OVERVIEW_RE = /\boverview\b/i;
const SEPARATE_ASSETS_RE = /\b(separate\s+(images|files|assets)|individual\s+images|each\s+as\s+(its\s+own|a\s+separate))\b/i;
const DELIVERABLE_COUNT_RE =
  /\b(\d+)\s+(images?|ads?|variations?|scenes?|layouts?|examples?|concepts?|environments?)\b/i;
const PLURAL_DELIVERABLE_RE = /\b(images|ads|variations|scenes|layouts|examples|concepts|environments)\b/i;
const SEARCH_RE = /\b(research|look\s*up|check|current|tonight|as of)\b/i;

export function buildGenerationPlan(
  intent: Intent,
  userPrompt: string,
  source?: SourceContextType,
): GenerationPlan {
  if (source === "library") return finish("single", 1, false, searchNeeded(intent, userPrompt));

  if (
    intent.task === "edit" ||
    intent.reference_intent === "edit_source" ||
    intent.category === "image_edit"
  ) {
    return finish("edit", 1, false, searchNeeded(intent, userPrompt));
  }

  if (CONTACT_SHEET_RE.test(userPrompt) || (GRID_RE.test(userPrompt) && GRID_CONTEXT_RE.test(userPrompt))) {
    return finish("contact_sheet", 1, false, searchNeeded(intent, userPrompt));
  }
  if (
    (COLLAGE_RE.test(userPrompt) || OVERVIEW_RE.test(userPrompt)) &&
    !SEPARATE_ASSETS_RE.test(userPrompt)
  ) {
    return finish("collage", 1, false, searchNeeded(intent, userPrompt));
  }

  const listed = countListedVariants(userPrompt);
  const explicit = explicitDeliverableCount(userPrompt);
  const intentCount =
    intent.series.enabled && intent.series.count && intent.series.count > 1
      ? intent.series.count
      : null;
  const panelWantsSeparate =
    intent.series.unit === "panel" && SEPARATE_ASSETS_RE.test(userPrompt);

  if (intent.series.unit === "panel" && !panelWantsSeparate && intent.series.enabled) {
    return finish("contact_sheet", 1, false, searchNeeded(intent, userPrompt));
  }

  const seriesFromIntent =
    intent.series.enabled && (intent.series.count === null || intent.series.count > 1);
  const seriesFromPrompt =
    (explicit !== null && explicit >= 2) ||
    (listed >= 2 && PLURAL_DELIVERABLE_RE.test(userPrompt));

  if (seriesFromIntent || seriesFromPrompt) {
    const desired = Math.max(2, intentCount ?? explicit ?? (listed >= 2 ? listed : AUTO_SERIES_CAP));
    return finish("series", desired, true, searchNeeded(intent, userPrompt));
  }

  return finish("single", 1, false, searchNeeded(intent, userPrompt));
}

export function resolveSelectedCount(plan: GenerationPlan, selectedCount?: number): number {
  if (!plan.requiresCountConfirmation) return plan.autoCount;
  if (selectedCount === plan.autoCount || selectedCount === plan.desiredCount) return selectedCount;
  throw new Error("selectedCount must be autoCount or desiredCount");
}

function finish(
  mode: OutputMode,
  desiredCount: number,
  separateAssets: boolean,
  searchNeededValue: boolean,
): GenerationPlan {
  const autoCount = mode === "series" ? Math.min(desiredCount, AUTO_SERIES_CAP) : 1;
  return {
    mode,
    desiredCount: mode === "series" ? desiredCount : 1,
    autoCount,
    separateAssets: mode === "series" ? true : false,
    searchNeeded: searchNeededValue,
    requiresCountConfirmation: mode === "series" && desiredCount > AUTO_SERIES_CAP,
  };
}

function searchNeeded(intent: Intent, userPrompt: string): boolean {
  if (SEARCH_RE.test(userPrompt)) return true;
  return intent.factual_requirements.missing_facts.length > 0;
}

function explicitDeliverableCount(userPrompt: string): number | null {
  const m = userPrompt.match(DELIVERABLE_COUNT_RE);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 2 ? n : null;
}

/** Slash, " or ", and comma-separated visual variants. Generic — not a domain list. */
function countListedVariants(userPrompt: string): number {
  const orParts = userPrompt.split(/\s+or\s+|\/|,/i).map((s) => s.trim()).filter(Boolean);
  // A single comma-rich sentence (breakfast ingredients) is not a variant list.
  // Require either a slash/`or` split of 2+, or 3+ short comma phrases after a period.
  if (/\//.test(userPrompt) || /\bor\b/i.test(userPrompt)) {
    const bits = userPrompt
      .split(/\s+or\s+|\/+/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 80);
    return bits.length;
  }
  const afterLastPeriod = userPrompt.split(".").pop() ?? "";
  const phrases = afterLastPeriod.split(",").map((s) => s.trim()).filter((s) => s.length > 0 && s.length < 60);
  return phrases.length >= 3 ? phrases.length : 0;
}
```

Tune `countListedVariants` until the 11/11 test passes. Breakfast must stay 1 (commas are object counts in one sentence, no slash/`or`, and the comma phrases sit in the same clause as the scene — if this misfires, require `PLURAL_DELIVERABLE_RE` for comma lists, which breakfast lacks). Cities has four comma phrases after a period plus `layout` in the prompt; if cities fixture already has `series.enabled`, Intent-series path fires first and listed-variants is unused for that case.

Astrophotography: `milkyway or star trails/meteors/stars` + `images` → inferred series even with `task: "create"`.

- [ ] **Step 4: Run tests**

Run: `node --test tests/unit/generation-plan.test.ts tests/unit/generation-eval-cases.test.ts`

Expected: PASS 11/11 plus generic cases

- [ ] **Step 5: Commit**

```bash
git add src/lib/generation/plan.ts tests/unit/generation-plan.test.ts tests/image-evals/vnext-1
git commit -m "$(cat <<'EOF'
Derive Generate execution from Intent plus generic prompt patterns.

Series vs single vs contact sheet is TypeScript, not a second planner model, and the 11-case suite cannot mention domain names in production code.
EOF
)"
```

---

### Task 3: Live `analyzeIntent → plan` release gate

**Files:**
- Create: `tests/eval/vnext-1-live-intent.test.ts`
- Modify: `package.json` (add `"test:vnext-1-live": "node --test --test-timeout=180000 tests/eval/vnext-1-live-intent.test.ts"`)

**Interfaces:**
- Consumes: `analyzeIntent` from `src/lib/prompt-engine/builder.ts`, `MODEL_ROLES.INTENT`, `loadVnext1Cases`, `buildGenerationPlan`
- Produces: `npm run test:vnext-1-live` (skipped automatically without `OPENAI_API_KEY`)

- [ ] **Step 1: Write the live test (skip without key)**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeIntent } from "../../src/lib/prompt-engine/builder.ts";
import { MODEL_ROLES } from "../../src/lib/openai/models.ts";
import { buildGenerationPlan } from "../../src/lib/generation/plan.ts";
import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";

const hasKey = Boolean(process.env.OPENAI_API_KEY);

test("release gate: live analyzeIntent → plan is 11/11", { skip: !hasKey }, async () => {
  const failures: string[] = [];
  for (const c of loadVnext1Cases()) {
    const { intent } = await analyzeIntent({
      apiKey: process.env.OPENAI_API_KEY!,
      userInput: c.prompt,
      mode: "default",
      referenceImageUrl: null,
    });
    const plan = buildGenerationPlan(intent, c.prompt);
    if (
      plan.mode !== c.expected.mode ||
      plan.desiredCount !== c.expected.desiredCount ||
      plan.searchNeeded !== c.expected.search_needed
    ) {
      failures.push(
        `${c.id}: got ${plan.mode}/${plan.desiredCount}/search=${plan.searchNeeded} expected ${c.expected.mode}/${c.expected.desiredCount}/search=${c.expected.search_needed}`,
      );
    }
  }
  assert.deepEqual(failures, []);
});
```

Use `MODEL_ROLES.INTENT` by default inside `analyzeIntent` (already does). Do not pass a reference image in this gate; `has_reference` cases still classify from wording (`pearl-earring`, `precision-edit`).

- [ ] **Step 2: Confirm CI still skips**

Run: `npm test`

Expected: live file skipped or not included (it lives under `tests/eval/`, and `npm test` is `tests/unit/**`). That is the point — not in CI.

- [ ] **Step 3: Document in the eval README** that shipping VNext 1 requires `npm run test:vnext-1-live` green. If it fails, add a **generic** rule in `plan.ts`, rerun both gates, and only then consider `INTENT_INSTRUCTIONS`.

- [ ] **Step 4: Commit**

```bash
git add tests/eval/vnext-1-live-intent.test.ts tests/image-evals/vnext-1/README.md package.json
git commit -m "$(cat <<'EOF'
Add the VNext 1 live Intent release gate.

CI stays on fixture Intents; shipping requires real analyzeIntent → plan at 11/11.
EOF
)"
```

Do not block this task on actually running the live gate in this session if no key is present. Running it is a release checklist item.

---

### Task 4: HMAC plan token

**Files:**
- Create: `src/lib/generation/plan-token.ts`
- Create: `tests/unit/generation-plan-token.test.ts`

**Interfaces:**
- Consumes: `GenerationPlan`, `Intent`
- Produces: `signPlanToken`, `verifyPlanToken`, `PlanTokenPayload`

- [ ] **Step 1: Write failing tests**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { signPlanToken, verifyPlanToken } from "../../src/lib/generation/plan-token.ts";
import { buildGenerationPlan } from "../../src/lib/generation/plan.ts";
import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";

const secret = "test-plan-secret";

test("round-trips a payload and rejects tampering", () => {
  const c = loadVnext1Cases().find((x) => x.id === "astrophotography")!;
  const plan = buildGenerationPlan(c.fixture_intent, c.prompt);
  const token = signPlanToken(
    {
      userId: "user-1",
      prompt: c.prompt,
      userInput: c.prompt,
      referenceAssetIds: [],
      sourceVersionId: null,
      intent: c.fixture_intent,
      plan,
      exp: Date.now() + 60_000,
    },
    secret,
  );
  const got = verifyPlanToken(token, secret, "user-1");
  assert.equal(got.plan.mode, "series");
  assert.throws(() => verifyPlanToken(token.slice(0, -2) + "ab", secret, "user-1"));
  assert.throws(() => verifyPlanToken(token, secret, "other-user"));
});

test("expired tokens fail", () => {
  const c = loadVnext1Cases()[0]!;
  const plan = buildGenerationPlan(c.fixture_intent, c.prompt);
  const token = signPlanToken(
    {
      userId: "user-1",
      prompt: c.prompt,
      userInput: c.prompt,
      referenceAssetIds: [],
      sourceVersionId: null,
      intent: c.fixture_intent,
      plan,
      exp: Date.now() - 1,
    },
    secret,
  );
  assert.throws(() => verifyPlanToken(token, secret, "user-1"));
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/unit/generation-plan-token.test.ts`

- [ ] **Step 3: Implement**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Intent } from "../prompt-engine/intent.ts";
import type { GenerationPlan } from "./plan.ts";

export const PLAN_TOKEN_TTL_MS = 10 * 60 * 1000;

export interface PlanTokenPayload {
  userId: string;
  prompt: string;
  userInput: string;
  referenceAssetIds: string[];
  sourceVersionId: string | null;
  intent: Intent;
  plan: GenerationPlan;
  exp: number;
}

export function signPlanToken(payload: PlanTokenPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifyPlanToken(
  token: string,
  secret: string,
  userId: string,
): PlanTokenPayload {
  const dot = token.lastIndexOf(".");
  if (dot < 1) throw new Error("invalid plan token");
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("invalid plan token");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PlanTokenPayload;
  if (payload.userId !== userId) throw new Error("invalid plan token");
  if (payload.exp < Date.now()) throw new Error("plan expired");
  return payload;
}
```

Server reads `process.env.GENERATION_PLAN_SECRET`. If missing in production Generate routes, return 503. Tests pass the secret in.

- [ ] **Step 4: Tests pass**

- [ ] **Step 5: Commit**

```bash
git add src/lib/generation/plan-token.ts tests/unit/generation-plan-token.test.ts
git commit -m "$(cat <<'EOF'
Sign generation plans so the browser cannot change mode or count.

Jobs accept only the HMAC token plus an allowed selectedCount.
EOF
)"
```

---

### Task 5: Series decomposer + userInput handoff test

**Files:**
- Create: `src/lib/generation/decompose-series.ts`
- Create: `tests/unit/generation-decompose-series.test.ts`
- Create: `tests/unit/generation-handoff-user-input.test.ts`
- Modify: `src/lib/generation/handoff.ts`
- Modify: `src/lib/generation/pending-generation.ts`

**Interfaces:**
- Consumes: `Intent`, `MODEL_ROLES.INTENT`, `createStructuredResponse`
- Produces: `decomposeSeries(userInput, intent, selectedCount, deps) → { title, children }`
- Produces: `selectDecomposerInput({ userInput, writerPrompt })` used by jobs route and handoff test

- [ ] **Step 1: Write failing tests**

`generation-handoff-user-input.test.ts` is the regression the spec named:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { selectDecomposerInput } from "../../src/lib/generation/decompose-series.ts";

test("series decomposer uses original userInput, never writer PAGE blocks", () => {
  const userInput =
    "create highly realistic crisp milkyway or star trails/meteors/stars astrophotography images for instagram story";
  const writerPrompt = `PAGE 1: milky way collage\nPAGE 2: star trails\nPAGE 3: meteors\nPAGE 4: star field`;
  const input = selectDecomposerInput({ userInput, writerPrompt });
  assert.equal(input, userInput);
  assert.equal(input.includes("PAGE 1"), false);
});

test("direct Generate with no separate userInput uses the prompt", () => {
  const prompt = "a red bottle on wet stone";
  assert.equal(selectDecomposerInput({ userInput: null, writerPrompt: prompt }), prompt);
});
```

Decomposer unit test with a fake `complete` fn:

```ts
test("pads or truncates to selectedCount and forbids collage wording", async () => {
  const out = await decomposeSeries({
    userInput: "three poster concepts for a coffee shop",
    intent: /* a create intent */,
    selectedCount: 3,
    complete: async () => ({
      title: "posters",
      children: [
        { label: "A", prompt: "collage of three posters" },
        { label: "B", prompt: "poster B" },
      ],
    }),
  });
  assert.equal(out.children.length, 3);
  assert.match(out.children[0]!.prompt, /standalone image/i);
  assert.equal(/collage/i.test(out.children[0]!.prompt), false);
});
```

Strip `collage` from child prompts in the sanitizer if the model adds it; always append `This is a single standalone image, not a collage.`

- [ ] **Step 2: Run to verify fail**

- [ ] **Step 3: Implement `decompose-series.ts`**

```ts
export function selectDecomposerInput(opts: {
  userInput: string | null | undefined;
  writerPrompt: string;
}): string {
  const original = opts.userInput?.trim();
  if (original) return original;
  return opts.writerPrompt.trim();
}
```

`decomposeSeries`: call Luna only when `deps.complete` is not injected (production). Schema: `{ title: string, children: { label: string, prompt: string }[] }`. Truncate/pad to `selectedCount`. Fallback: `Image ${i} of ${n} — ${userInput}. This is a single standalone image, not a collage.`

Handoff:

```ts
export interface GenerationHandoff {
  prompt: string;
  /** Original Build/Critique request. Series planning must use this, not `prompt`. */
  userInput?: string | null;
  intent?: Intent | null;
  // ...existing fields
}
```

Pending generation: add optional `userInput` and `intent`.

- [ ] **Step 4: Tests pass**

- [ ] **Step 5: Commit**

```bash
git add src/lib/generation/decompose-series.ts src/lib/generation/handoff.ts src/lib/generation/pending-generation.ts tests/unit/generation-decompose-series.test.ts tests/unit/generation-handoff-user-input.test.ts
git commit -m "$(cat <<'EOF'
Decompose series from the original user request, not the writer PAGE blocks.

That is the Build → Generate collage bug: child briefs must not see PAGE 1.
EOF
)"
```

---

### Task 6: Schema + all-or-nothing batch RPC

**Files:**
- Create: `supabase/migrations/20260914120000_generation_series.sql`

**Interfaces:**
- Consumes: existing `reserve_generation_credits`, `create_generation_job`
- Produces: columns `generation_jobs.series_index`, `generation_jobs.series_label`, `generation_sessions.plan_json`; RPC `create_generation_jobs`

The user runs this in the Supabase SQL Editor (anon key cannot apply migrations). Still commit the file.

- [ ] **Step 1: Write the SQL**

```sql
ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS series_index integer,
  ADD COLUMN IF NOT EXISTS series_label text;

ALTER TABLE public.generation_sessions
  ADD COLUMN IF NOT EXISTS plan_json jsonb;

-- create_generation_jobs: reserve p_count credits in ONE ledger row
-- (idempotency_key = p_idempotency_prefix) then insert p_count jobs.
-- Job-level finalize still uses p_idempotency_prefix || ':' || series_index
-- — wait: current finalize is per job idempotency_key.
```

Credit design that matches existing finalize:

- Reserve `p_count` once with key `p_idempotency_prefix` (parent).
- Each job stores `idempotency_key = p_idempotency_prefix || ':' || i` for **charge/refund**.
- `finalize_generation_credits` today keys on job idempotency. Read `finalize_generation_credits` in `20260911100000_add_credit_buckets_and_starter_grant.sql` and keep per-job finalize working.

Simplest approach that cannot double-reserve:

Call existing `reserve_generation_credits(user, 1, prefix||':'||i)` in a loop **inside one plpgsql function** after locking the account and checking `available_credits >= p_count`. If not enough, return `reserved=false` and insert **zero** jobs (rollback the function — do it in one transaction; plpgsql function is already a transaction).

```sql
CREATE OR REPLACE FUNCTION public.create_generation_jobs(
  p_user_id uuid,
  p_session_id uuid,
  p_operation text,
  p_model text,
  p_prompts text[],
  p_labels text[],
  p_width integer,
  p_height integer,
  p_source_version_id uuid,
  p_idempotency_prefix text
)
RETURNS TABLE (job_ids uuid[], reserved boolean, available_credits integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
-- if any child key already exists, return those job ids (idempotent replay)
-- else lock account; if available < array_length(p_prompts,1) return reserved=false
-- else for i in 1..n: reserve 1 with prefix:i; insert job with series_index i-1
$$;
```

GRANT EXECUTE TO authenticated. REVOKE FROM PUBLIC.

- [ ] **Step 2: No automated DB test** (this repo’s generation RPCs are not run in CI). Add a short comment at the top: owner applies in SQL Editor before 1E ships.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260914120000_generation_series.sql
git commit -m "$(cat <<'EOF'
Add series job columns and an all-or-nothing batch reservation RPC.

A four-image series either creates four jobs or none, so a mid-batch credit miss cannot strand children.
EOF
)"
```

---

### Task 7: Resume helper + session stale-fail

**Files:**
- Create: `src/lib/generation/series-resume.ts`
- Create: `tests/unit/generation-series-resume.test.ts`
- Modify: `src/routes/api/generation/sessions.$id.ts`
- Modify: `src/routes/api/generation/jobs.$id.ts` (extract stale helper if needed)

**Interfaces:**
- Produces: `jobsNeedingStart(jobs) → ids where status === "queued"`
- Produces: `applyStaleFailure(job, now, staleMs)` pure predicate used by session GET

`POST /jobs/:id/run` already CAS `queued → running`. Do not change that claim. Add a test documenting `claimed: false` is success for a duplicate start.

- [ ] **Step 1: Failing tests**

```ts
test("queued children are started; running and succeeded are not", () => {
  const ids = jobsNeedingStart([
    { id: "a", status: "succeeded" },
    { id: "b", status: "queued" },
    { id: "c", status: "running" },
    { id: "d", status: "queued" },
  ]);
  assert.deepEqual(ids, ["b", "d"]);
});
```

- [ ] **Step 2: Implement `series-resume.ts`**

```ts
export function jobsNeedingStart(jobs: Array<{ id: string; status: string }>): string[] {
  return jobs.filter((j) => j.status === "queued").map((j) => j.id);
}
```

Session GET: also select jobs for the session (`id, status, series_index, series_label, created_at, ...`). For each queued/running job older than 6 minutes, apply the same fail+refund as `jobs.$id.ts`. Return `{ sessionId, versions, jobs }`.

Extract `STALE_MS` and the fail+refund block into `src/lib/generation/stale-job.ts` so job GET and session GET cannot drift.

- [ ] **Step 3: Persist session id on the client (next task). This task is server + pure helper.**

- [ ] **Step 4: Commit**

```bash
git add src/lib/generation/series-resume.ts src/lib/generation/stale-job.ts tests/unit/generation-series-resume.test.ts src/routes/api/generation/sessions.$id.ts src/routes/api/generation/jobs.$id.ts
git commit -m "$(cat <<'EOF'
Resume queued series children and stale-fail every sibling, not just the polled job.

Closing the tab after create cannot leave unused reservations stuck if the session is polled again.
EOF
)"
```

---

### Task 8: `POST /plans` and `POST /jobs` from token

**Files:**
- Create: `src/routes/api/generation/plans.ts`
- Modify: `src/routes/api/generation/jobs.ts`
- Modify: `src/lib/generation/job-request.ts`
- Modify: `src/lib/generation/client.ts`
- Create: `tests/unit/generation-job-request.test.ts` additions for the new body

**Interfaces:**
- `CreatePlanRequest`: `{ prompt, userInput?, intent?, referenceAssetIds, sourceVersionId, sourceContext, structuredAspectRatio }`
- `CreatePlanResponse`: `{ plan: DisplayPlan, planToken }`
- `CreateJobRequest` (replace): `{ planToken, selectedCount?, idempotencyKey, structuredAspectRatio?, sourceContext }` — **no prompt, no mode, no child briefs**
- Keep old `validateGenerationRequest` working for a release? **No** — cut over. Direct Generate always plans first.

DisplayPlan (safe to show): `{ mode, desiredCount, autoCount, separateAssets, searchNeeded, requiresCountConfirmation, creditCostAuto, creditCostAll }`

- [ ] **Step 1: Extend job-request tests**

`validateCreateJobsFromPlanBody` accepts only `planToken` (non-empty string) + optional number `selectedCount` + `idempotencyKey`. Rejects a raw `plan` object, rejects `count`, rejects `children`.

- [ ] **Step 2: Implement `plans.ts`**

Auth same as jobs.ts. `analyzeIntent` when `intent` omitted. When `intent` provided, `IntentSchema.parse`. `userInput = body.userInput ?? body.prompt`. `buildGenerationPlan(intent, userInput, sourceType)`. Sign token with `GENERATION_PLAN_SECRET`, `exp = Date.now() + PLAN_TOKEN_TTL_MS`. Do **not** call the decomposer here.

- [ ] **Step 3: Rewrite jobs POST**

Verify token. `selected = resolveSelectedCount(payload.plan, body.selectedCount)`. If series: `userInput = selectDecomposerInput({ userInput: payload.userInput, writerPrompt: payload.prompt })`; `children = await decomposeSeries(...)`. Else one child = payload.prompt (plus fidelity preamble when reference_intent is fidelity-critical). `create_generation_jobs` with those prompts. Return `{ sessionId, jobs: [{ id, label, index, status }] }`. Single-job path can still use `create_generation_job` for count 1.

Model routing: `resolveGenerationModel` per child using payload.intent as hints (category, exact_text.length, reference_intent). Same model for all children in v1 (compute once from parent prompt).

- [ ] **Step 4: `client.ts`**

```ts
export function createGenerationPlan(req: CreatePlanRequest): Promise<CreatePlanResponse>
export function createGenerationJobs(req: {
  planToken: string;
  selectedCount?: number;
  idempotencyKey: string;
  sourceContext: { type: string; id?: string | null };
}): Promise<{ sessionId: string; jobs: Array<{ id: string; label: string | null; index: number | null; status: string }> }>
```

Remove prompt from create-jobs client type.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/generation/plans.ts src/routes/api/generation/jobs.ts src/lib/generation/job-request.ts src/lib/generation/client.ts tests/unit/generation-job-request.test.ts
git commit -m "$(cat <<'EOF'
Create generation jobs from a signed plan token, not from client-supplied mode or count.

Intent runs on /plans; /jobs only verifies the token, decomposes for selectedCount, and reserves.
EOF
)"
```

---

### Task 9: `useGeneration` plan → confirm → parallel start → resume

**Files:**
- Modify: `src/lib/generation/use-generation.ts`
- Modify: `src/lib/generation/pending-generation.ts` (already has userInput from Task 5)
- Modify: `src/components/prompt/BuildMode.tsx`
- Modify: `src/components/prompt/CritiqueMode.tsx`
- Modify: `src/components/generate/GenerateWorkspace.tsx`
- Modify: `src/lib/product.ts`
- Tests: `tests/unit/generation-open-in-generate.test.ts` if it snapshots handoff; extend `SubmitInput`

**Interfaces:**
- `SubmitInput` gains `userInput?: string | null` and `intent?: Intent | null`
- Hook exposes `planPreview`, `confirmSeriesCount(selectedCount)`, `jobs[]`
- Replace `ACTIVE_JOB_KEY` with `ACTIVE_SESSION_KEY`

- [ ] **Step 1: Product copy**

```ts
generateImages: (n: number) => `Generate ${n} images · ${n} credits`,
seriesConfirmTitle: (n: number) => `This request works best as ${n} separate images.`,
seriesConfirmAuto: (n: number) => `Generate ${n} now`,
seriesConfirmAll: (n: number) => `Generate all ${n}`,
```

Keep `generateImage` for count 1. No “generator” wording. If `product-phase3.test.ts` asserts exact CTA strings, update it.

- [ ] **Step 2: BuildMode**

```ts
await gen.submit({
  prompt: promptText,          // writer output — used only when plan.mode !== "series"
  userInput: savedRoughIdea || seedInput || input,
  intent: result.intent as Intent,
  structuredAspectRatio: result.aspect_ratio ?? null,
  routingHints: { ... },
});
```

CritiqueMode: `userInput: savedInput`, `prompt: result.rewritten_prompt`. Critique stays single almost always; still go through `/plans`.

- [ ] **Step 3: Hook flow**

```
submit()
  → POST /plans { prompt, userInput, intent, refs, source }
  → if plan.requiresCountConfirmation: setPhase("confirm"); store planToken; return
  → executePlan(planToken, plan.autoCount)

confirmSeriesCount(n)
  → executePlan(planToken, n)

executePlan
  → POST /jobs { planToken, selectedCount, idempotencyKey }
  → saveActiveSession(sessionId)
  → for id of jobsNeedingStart(jobs): void startGenerationJob(id, refPaths)
  → pollSession(sessionId)  // not a single job

on mount: readActiveSession → getGenerationSession → start queued → poll
```

Credit pre-empt: if `credits < selectedCount`, set exhausted / show the existing credit gate. For confirm UI, check `credits < desiredCount` before offering “all 7”.

Library auto-submit in `GenerateWorkspace`: still `gen.submit({ prompt })` with `sourceType: "library"` already on sourceContext — plan forces single.

- [ ] **Step 4: Canvas**

`GenerationCanvas` / workspace: when `jobs.length > 1`, render a simple grid of child slots (label + image or spinner). Reuse existing thinking copy per child. No search_needed, no Intent chips required.

- [ ] **Step 5: Typecheck, unit tests, lint on touched files**

Run: `npm test && npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add src/lib/generation/use-generation.ts src/lib/product.ts src/components/prompt/BuildMode.tsx src/components/prompt/CritiqueMode.tsx src/components/generate src/lib/generation/pending-generation.ts tests/unit
git commit -m "$(cat <<'EOF'
Run Generate through Intent planning and parallel child jobs.

Build and Critique pass original userInput so a series cannot be decomposed from writer PAGE blocks.
EOF
)"
```

---

### Task 10: Telemetry (1F)

**Files:**
- Modify: `src/routes/api/generation/jobs.ts` (write `plan_json` on the session)
- Modify: `src/lib/generation/use-generation.ts` (`trackEvent` payloads)

**Interfaces:**
- `plan_json`: `{ mode, desiredCount, autoCount, selectedCount, searchNeeded, childLabels }`
- Events: `generation_planned`, `generation_series_started`, `generation_series_child_done`

- [ ] **Step 1: Fire `generation_planned` from the client after `/plans` with mode, desiredCount, autoCount, searchNeeded, requiresCountConfirmation, source. No prompt text.**

- [ ] **Step 2: Fire `generation_series_started` with selectedCount when jobs.length > 1.**

- [ ] **Step 3: Fire `generation_series_child_done` when a child becomes succeeded/failed (index, success).**

- [ ] **Step 4: Persist `plan_json` in the jobs route after insert.**

- [ ] **Step 5: Commit**

```bash
git add src/lib/generation/use-generation.ts src/routes/api/generation/jobs.ts
git commit -m "$(cat <<'EOF'
Record generation plan mode, counts, and searchNeeded for VNext 4 evidence.

Search is not executed; the flag is telemetry only.
EOF
)"
```

---

## Spec coverage

| Spec section | Task |
|---|---|
| Frozen 11 cases, 11/11 CI | 1, 2 |
| Live analyzeIntent release gate | 3 |
| No `output` on Intent; generic rules | 2 |
| >4 `desiredCount` / `autoCount` / `selectedCount` | 2, 8, 9 |
| HMAC planToken; no inline plan | 4, 8 |
| Decomposer uses `userInput` | 5, 9 |
| Batch credits | 6, 8 |
| Parallel `/run`, resume queued, stale siblings | 7, 9 |
| Library stays single | 2, 9 |
| `search_needed` telemetry only | 2, 10 |
| Shared Build/Critique path | 9 |
| No writer on singles | 8, 9 |
| No image FT / masks / entities | out of scope |

## Execution notes

- Apply `20260914120000_generation_series.sql` in the Supabase SQL Editor before enabling Task 8 in production.
- Set `GENERATION_PLAN_SECRET` in Cloudflare Worker env (and `.dev.vars` locally).
- Run `npm run test:vnext-1-live` before calling VNext 1 done.
- Do not implement VNext 2–5 in this plan.
