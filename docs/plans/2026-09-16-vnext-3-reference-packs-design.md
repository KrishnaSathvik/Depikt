# VNext 3 — Reference Packs + Locks

Status: approved 2026-09-16. Implementation in progress; fixtures require human approval before freezing.

VNext 3 turns Depikt from "generate or edit an image" into "reuse the same character, product, or brand reliably across many images." It does this with **named, high-fidelity reference image packs** and **locks**, wired through the signed planning pipeline VNext 1 built and VNext 2 hardened. Nothing else.

This is **not** face embeddings, identity vectors, LoRA or training, campaign memory, web search, a visual judge, auto repair, SAM or object detection, or a brand-design editor.

## Problem

Today a user who wants the same person or bottle in six images has to re-upload the right reference photos each time, remember which ones worked, and rewrite the "keep her face the same" sentence by hand. The reference cap is four images per request, the browser hands over storage paths, and nothing in the plan knows that image 2 *is* Maya.

## Goal

```
[Maya 🔒] [HALO Lemon 🔒]

"Put her beside a pool at sunset holding the bottle"
        ↓
/plans  resolves owned entities → picks the right reference images → signs them
        ↓
/jobs   stores resolved refs on plan_json, appends deterministic preserve text
        ↓
/run    downloads only the signed paths → Sunburst
```

The user picks names. Depikt picks references and writes the preservation instructions.

## Locked decisions

1. **Reuse the signed planning architecture.** Browser sends entity ids only. `/plans` resolves ownership and assets, chooses references, and binds the resolved list into the plan token. `/jobs` persists it on `plan_json`. `/run` reads only `plan_json`. Same shape as VNext 2 masks: ids in, server-resolved paths signed, never trusted from the request.
2. **Three entity types:** `character`, `product`, `brand`. No locations, styles, or campaigns.
3. **Identity is not appearance.** An entity's `description` describes what defines it (face, hair baseline, age appearance, distinguishing features, proportions for a character; geometry, label, cap, colors for a product). Clothing, pose, expression, environment and lighting are explicitly variable unless the prompt fixes them. Named "looks" (Maya — Beach look) are a later addition and must not be faked by making the first upload's outfit part of the identity.
4. **Lock is the only attachment mode in VNext 3.** Every attached entity is locked. `locked: true` is stored per entity on the plan so a later unlocked/inspiration mode is additive, but no toggle ships now.
5. **Routing is generic.** `lockedEntityCount > 0` → Sunburst. No entity name or type ever appears in router, resolver, or preamble logic as a branch.
6. **Preserve instructions are string assembly**, built from entity type, name, description and the chosen reference roles. No writer call.
7. **Dynamic reference selection.** A small resolver picks references per entity from a generic shot-type reading of the prompt and a fixed per-request image budget. It never attaches everything just because it exists.
8. **No entities → byte-identical behavior.** Every existing path (`referenceAssetIds`, masks, series, Library auto-generate) is unchanged when `entityIds` is empty. VNext 1 11/11 and the VNext 2 suite stay green.

## Design

### 1. Data model

Two tables, owner-scoped RLS (`auth.uid() = user_id`), same conventions as `generation_sessions`. Migration `supabase/migrations/20260916120000_add_reference_entities.sql`, idempotent, applied by the owner in the SQL Editor.

```sql
reference_entities
  id           uuid pk default gen_random_uuid()
  user_id      uuid not null references auth.users(id) on delete cascade
  name         text not null            -- 1..60 chars, trimmed
  type         text not null check (type in ('character','product','brand'))
  description  text not null default '' -- identity description, ≤ 600 chars
  created_at   timestamptz not null default now()
  updated_at   timestamptz not null default now()
  unique (user_id, lower(name), type)

reference_entity_assets
  id           uuid pk default gen_random_uuid()
  entity_id    uuid not null references reference_entities(id) on delete cascade
  user_id      uuid not null             -- denormalized for RLS and path checks
  storage_path text not null unique
  role         text not null
  sort_order   integer not null default 0
  width        integer, height integer, mime_type text not null
  created_at   timestamptz not null default now()
  check (role in (
    'primary','front','three_quarter','profile','full_body',   -- character
    'back','side','detail',                                   -- product (plus front/three_quarter/primary)
    'logo','product_shot','style_reference'                    -- brand
  ))
```

Role validity per type is enforced in TypeScript (`src/lib/generation/entities.ts`, one `ROLES_BY_TYPE` table); the DB check is the union. Exactly one `primary` per character or product is enforced in code on upload; a brand's `logo` plays the primary role.

Limits (constants in `entities.ts`): 50 entities per user, 8 assets per entity, asset bytes and MIME reuse `reference-upload-request.ts`.

Storage: `users/<uid>/entities/<entityId>/<assetId>.<ext>` via a new `entityAssetStoragePath()` in `storage-paths.ts`. The existing prefix RLS covers read and insert. Deleting an entity or asset needs a **scoped storage delete policy** limited to `users/<uid>/entities/…`; outputs and ad-hoc references stay immutable. The policy is part of the migration.

### 2. Entity API

All under the native-generation flag, authenticated like `/api/generation/*`, rate limited, RLS-backed. Bodies validated in `src/lib/generation/entity-request.ts` (pure, unit-tested).

| Route | Purpose |
|---|---|
| `GET /api/generation/entities` | List the caller's entities with assets and short-lived signed preview URLs |
| `POST /api/generation/entities` | Create `{ name, type, description }` |
| `PATCH /api/generation/entities/:id` | Rename, edit description |
| `DELETE /api/generation/entities/:id` | Delete entity, assets rows, storage objects |
| `POST /api/generation/entities/:id/assets` | Upload one asset `{ dataUrl, role }`; server assigns path; rejects `path`/`storage_path` fields |
| `DELETE /api/generation/entities/:id/assets/:assetId` | Remove one asset |

Validation reuses the data-URL decoder and MIME table from `reference-upload-request.ts`. The browser never sends a storage path anywhere, and every handler filters by `user_id` in addition to RLS.

### 3. Plan request and token

`validateCreatePlanBody` gains `entityIds: string[]` (uuids, ≤ 4 distinct). `entityPaths`, `entities`, and `resolvedReferences` are forbidden fields, rejected loudly like `maskPath`.

In `/plans`:

1. Load the caller's entities whose ids are in `entityIds`, with assets. Any missing id → `400 Invalid reference pack` (never reveals whether it exists for someone else).
2. `resolveEntityReferences({ entities, prompt, budget })` (§5) returns per-entity ordered `storage_path` lists.
3. Intent analysis: when `referenceAssetIds` is empty and entities are present, the first entity's primary asset is the preview image, and `referenceIntentOverride` is derived from type: character → `subject_identity`, product → `product_object`, brand → `style`. Mixed sets use the first entity. This keeps the analyzer from reading "put her by a pool" as an `edit_source` request against the reference photo.
4. The token payload adds:

```ts
entities: Array<{
  id: string;
  type: "character" | "product" | "brand";
  name: string;
  description: string;
  locked: true;
  resolvedReferences: Array<{ assetId: string; role: string; path: string }>;
}>;
```

`referenceAssetIds` keeps its current meaning: ad-hoc uploads only. Entity paths never enter it, so existing ownership checks and identity matching keep working unchanged.

### 4. Jobs and run

`/jobs`:

- `resolveOperation` gains an entity count: any attached reference (ad-hoc or entity) makes the operation `edit`, because the images must reach `images/edits`.
- `resolveGenerationModel` gains `lockedEntityCount`. `> 0` → Sunburst, checked right after the mask rule.
- `buildExecutionPlanJson` stores `entities` (the token's array) and `executionPlanIdentityMatches` compares entity metadata and resolved references in execution order (independent of JSON object-key order), so a zero-job session cannot be reused with a different pack.
- `resolveChildren` appends the entity preamble (§6) to the single prompt, or to **every** series child after `appendSharedConstraints`. The decomposer's user message also lists `ENTITIES: Maya (character), HALO Lemon (product)` with descriptions so children keep names consistent; the decomposer never chooses references.
- A mask plus entities is allowed (precision edit that also locks a product); the mask still applies to `image[0]` which is the source version.

`/run`:

- `extractStoredEntityReferencePaths(planJson)` returns the flat ordered list of entity paths from `plan_json.entities`. Absent entities → empty; malformed claimed entity metadata → hard failure with `entity_reference_unavailable` and refund. Locked references fail closed.
- `assembleJobImages` takes `entityReferencePaths` and appends them after ad-hoc references. Order is fixed and documented: source, ad-hoc references, then entity references in entity order. A missing entity file fails the job with `entity_reference_unavailable` and refunds, mirroring the mask path. Silently dropping a locked reference would violate the lock.

### 5. Reference resolver — `src/lib/generation/entity-reference-resolver.ts`

Pure function, no fetch, no names.

```ts
resolveEntityReferences({
  entities,          // with assets (role, sort_order, path)
  prompt,            // userInput
  budget,            // total entity reference slots for this request
}): ResolvedEntity[]
```

Budget: `MAX_JOB_INPUT_IMAGES_WITH_ENTITIES = 8` is the Depikt product budget, not the API ceiling (16). `MAX_ADHOC_REFERENCE_IMAGES = 4` remains unchanged. Entity budget = `8 − sourceVersion(0|1) − referenceAssetIds.length`. Each entity gets at least one slot; remaining slots are dealt round-robin in entity order, capped at 3 per entity. If budget < entity count, `/plans` returns `400 Too many reference images for one request`.

Shot reading from the prompt, generic regexes only:

| Signal | Regex idea | Character preference | Product preference |
|---|---|---|---|
| close framing | `close-?up`, `portrait`, `headshot`, `face`, `macro`, `label`, `detail` | primary, front, three_quarter | primary/front, detail, three_quarter |
| full body / action | `full[- ]body`, `running`, `walking`, `standing`, `dancing`, `jumping`, `holding`, `wearing`, `outfit` | primary, full_body, three_quarter | primary/front, three_quarter, side |
| default | none of the above | primary, three_quarter, full_body | primary/front, three_quarter, back |

Brand order is always logo, style_reference, product_shot. Missing roles fall through to the next preference, then `sort_order`. Ties keep upload order. The primary asset is always first for its entity.

### 6. Preserve instructions — `src/lib/generation/entity-preamble.ts`

Deterministic, tested string assembly. Prepended before the prompt (after the mask preamble when both apply):

- Character: `Reference images N–M show {name}. Preserve {name}'s identity: facial structure, age appearance, hair identity, and defining features{: description}. Clothing, pose, expression, environment and lighting may change unless the request says otherwise.`
- Product: `Reference images N–M show {name}. Preserve the exact product identity: overall geometry, package proportions, logo placement, label design, cap and defining colors{: description}. Environment, lighting, and presentation may change.`
- Brand: `Reference images N–M show the {name} brand. Preserve the supplied brand identity, logo treatment and visual language{: description}.`
- Two or more entities add: `Keep each named subject distinct; do not merge features between them.`

Image numbering comes from the fixed order in §4, so the sentence is checkable against what OpenAI receives.

### 7. UI

**Composer chips** in `GenerateWorkspace` next to the reference row: `[Maya 🔒 ×] [HALO Lemon 🔒 ×]` plus one `+ Reference pack` button that opens a picker grouped by Characters, Products, Brands with a "New…" entry. Chips count toward the visible attachment budget (`{n}/8 images` replaces `{n}/4`). Selected `entityIds` travel through `useGeneration.submit`, `lastParamsRef` (so Regenerate and Edit again keep the pack), and the pending-auth resume payload.

**Management** lives in Account as a `References` tab beside Creations: list, create (name, type, description with a short identity hint per type), upload assets with a role select, delete. No new route; frozen routes untouched. Copy strings go in `src/lib/product.ts`.

No `@Maya` syntax. No lock toggle. No per-entity settings.

### 8. Benchmark — `tests/image-evals/vnext-3/`

Frozen before implementation, same layout as VNext 1/2: `cases.json`, `load-cases.ts`, `README.md`, `fixtures/`. Fixtures are five fictional reference packs (two characters, two products, one brand), generated with `scripts/images-2-5-run.ts`, human-approved, and committed as small WebP. Each pack has three views. No real people, no real brands.

| Case id | Entities | Prompts (frozen) | Expected |
|---|---|---|---|
| `character-portrait/cafe/beach/city-night` | woman | four scene prompts | edit op, Sunburst, refs ⊂ pack, close-up picks face roles, beach picks full_body |
| `product-studio/beach/pool/city-night` | bottle | four scene prompts | edit op, Sunburst, front+detail for studio, front+three_quarter otherwise |
| `character-product-×4` | woman + bottle | four scene prompts | both entities present, budget split, distinct-subjects line |
| `two-characters-×2` | woman A + woman B | two prompts | 2 entities, each ≥1 ref, no merge |
| `two-products` | bottle A + bottle B | one prompt | distinct label preservation lines |
| `brand-ads-×4` | brand | four ad prompts | logo first, series decomposition carries brand line into every child |
| `no-entities-regression` | none | `average instagram influencer photo, casual candid, natural light` | identical plan, model, operation and prompt to VNext 1 |

CI gate: fixture entities → resolver → preamble → router, asserted per case, and a source scan proving no case id, `Maya`, `HALO`, or `Sofia` appears under `src/`. Release gate: live run with `OPENAI_API_KEY`, scored by inspection as PASS / SOFT FAIL / FAIL per case on identity, product fidelity, non-merging, and label integrity. No invented percentages.

### 9. Ship bar

Automated (all CI):

- entity ownership: foreign `entityIds` → 400, no existence leak
- cross-user asset paths never resolved even when guessed
- token tamper on `entities` → rejected; `entities` in the `/jobs` body → rejected
- resolver picks the expected roles for close-up, full-body, default, product detail, brand
- budget respected: never more than 8 images, each entity ≥ 1, overflow → 400
- `lockedEntityCount > 0` → Sunburst; `0` → existing router result
- mask + entity keeps mask on image[0]
- no entities → `plan_json`, prompt, model, operation identical to today
- VNext 1 11/11 fixture and live gates, VNext 2 suite, 662+ unit tests green

Manual, real browser, scored PASS / SOFT FAIL / FAIL: character across four scenes, product across four scenes, character + product, two characters, two products, brand ads, and one no-entity generation that behaves exactly as before.

### 10. Telemetry

`generation_planned` gains `entityCount` and `lockedEntityCount`. New `reference_pack_created` and `reference_pack_asset_added` with type and role only. No names or descriptions leave the database.

## Alternatives considered

- **Entity paths inside `referenceAssetIds`.** Smallest change, but /run could not tell a locked reference from an ad-hoc one, the identity match would silently accept a swapped pack, and the 4-image cap would collide immediately. Rejected.
- **Let the decomposer or a writer choose references.** A model call per plan for something a regex and role table decide deterministically. Untestable in CI. Rejected for VNext 3.
- **Face embeddings or identity vectors.** Out of scope by the roadmap; the image API already accepts multiple references and Sunburst is the fidelity model.

## Owner decisions (approved)

1. **Image budget of 8 per job with entities.** Source and ad-hoc references count toward the total; ad-hoc uploads stay capped at 4.
2. **Management in Account → References.** No new product route.
3. **Human-approved fictional fixtures generated with Sunburst and committed** as compressed WebP. Benchmarks verify hashes and never regenerate fixtures.
4. **Locks fail closed** on malformed persisted metadata or unavailable required inputs, with `entity_reference_unavailable` and refund.

## Implementation order

| Slice | Ship |
|---|---|
| 3A | Freeze `tests/image-evals/vnext-3/` cases, README, generate and commit fixtures |
| 3B | Migration, `storage-paths`, `entities.ts` vocabulary, `entity-request.ts` validators, entity API routes |
| 3C | Resolver + preamble (pure, CI-tested against fixtures) |
| 3D | Plan request/token/execution-plan/router/run wiring; security tests |
| 3E | Composer chips, picker, Account References tab, client plumbing (submit, regenerate, resume) |
| 3F | Live release gate, browser validation doc `docs/plans/2026-09-xx-vnext-3-validation.md` |

3A–3D do not change production behavior without an `entityIds` field. 3E is the user-visible change.

## Risks

- **Analyzer misreads a pack request as an edit of the reference photo.** Mitigated by the type-derived `referenceIntentOverride`; the character benchmark cases catch regressions in `buildGenerationPlan`.
- **Reference cost and latency.** The verified provider ceiling is 16; the Depikt product budget remains 8.
- **Reference order drift** between `assembleJobImages` and the preamble numbering. One shared helper produces both the download list and the numbering.
- **Identity leakage through outfits.** The description hint and the "clothing may change" sentence are the only guard in VNext 3; looks are the real fix later.
- **Sunburst latency times four children with eight images each.** Same per-job six-minute stale window as today; the series path already runs children in parallel.

## Later roadmap (unchanged)

VNext 4 real web and visual grounding → VNext 5 visual validation and automatic repair.
