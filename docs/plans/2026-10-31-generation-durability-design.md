# Durable Generation — Feasibility Results and Design

Date: 2026-10-31. Status: **design only. Nothing implemented in the app, nothing deployed.** Spike code lives outside the repository (local scratch).

## 1. Confirmed build integration (local)

| Check                                                | Result                 | Evidence                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A Workflow class can be exported from the app Worker | Yes                    | Nitro (used by `@lovable.dev/vite-tanstack-config` 2.26.5, `nitro` 3.0.260603-beta, preset `cloudflare-module`) auto-detects a root `exports.cloudflare.ts` and re-exports it from the Worker entry. The build logged `Detected exports.cloudflare.ts as Cloudflare entrypoint`.  |
| A `workflows` binding reaches the deploy config      | Yes                    | Nitro merges the repo's `wrangler.jsonc` into `.output/server/wrangler.json`. The generated file contained the binding, and Wrangler listed `env.SPIKE_GENERATION_WORKFLOW (Workflow)`.                                                                                           |
| App routes can reach the binding                     | Yes, with a constraint | Routes must **not** `import "cloudflare:workers"`, because Vite's SSR stage fails to resolve it. Read bindings from the env Nitro attaches per request (`request.runtime.cloudflare.env`, or `globalThis.__env__`). Only `exports.cloudflare.ts` may import `cloudflare:workers`. |
| Jobs finish without a client                         | Yes                    | `create()` returned in about 17 ms; the instance completed with no client attached.                                                                                                                                                                                               |
| Step retry                                           | Yes                    | A simulated provider error on attempt 1 succeeded on attempt 2.                                                                                                                                                                                                                   |
| Crash recovery                                       | Yes, with a caveat     | The dev server was killed mid-step and restarted. The completed `ground` step was **not** re-run; the in-flight `generate` step **re-ran from the start**.                                                                                                                        |
| Service binding to a separate Workflow Worker        | Yes (same account)     | A two-Worker setup (RPC `WorkerEntrypoint`) worked locally.                                                                                                                                                                                                                       |

**Pre-existing, unrelated local issues**

- The full app returns 500 under local `wrangler dev` even without any change. `@lovable.dev/mcp-js` creates an `AbortController` at module scope, which this local runtime forbids.
- The local runtime only supports compatibility dates up to 2026-04-17.
- `npm run preview` points at `dist/server/wrangler.json`, but the build writes `.output/server/wrangler.json`.

## 2. Remaining uncertainty: Lovable production hosting

`@lovable.dev/vite-tanstack-config` chooses its build target from `LOVABLE_NITRO_PRESET`, which Lovable's infrastructure sets.

- **`cloudflare-module`**: honours `exports.cloudflare.ts` and merges `wrangler.jsonc`. Workflows would work.
- **`lovable-fetch-bundle`**: the entry is `export default { fetch: (request) => nitroApp.fetch(request) }`. There is no env, no execution context, and no named exports. **Workflows, service bindings, and `waitUntil` would all be unavailable.**

### Questions for Lovable support

1. Which Nitro preset does Lovable's **publish** pipeline use for this project: `cloudflare-module` or `lovable-fetch-bundle`? Is that fixed per project, or can it change without notice?
2. Is the published Worker deployed from `.output/server/wrangler.json` as generated, including keys merged from our `wrangler.jsonc`? Which keys are stripped, overridden, or rejected? Today we rely on `vars`.
3. Are additional **named exports** from the Worker entry (`exports.cloudflare.ts`) preserved in the deployed script?
4. Does the Cloudflare account Lovable deploys to allow a **`workflows` binding**, and will publish create or update the Workflow (`name`, `class_name`) on deploy? Is this a standard Workers account or Workers for Platforms (dispatch namespace)?
5. Can the project declare **service bindings**, **Queues**, **Durable Objects**, **cron triggers**, or the **Rate Limiting** binding?
6. How are **secrets** set for the published Worker? The Workflow needs a server credential (see §4.6).
7. Can we see Workflow instances, logs, and errors (dashboard or API access) for a Lovable-hosted Worker?
8. Is a custom domain plus our own Cloudflare account supported, so that we control the account?
9. Does publish run `nodejs_compat` stripping (`stripRedundantNodejsCompatFlag`) or other rewrites that change runtime behaviour?
10. Is there a supported way to run a non-production preview with the same preset and bindings, for verification?

## 3. Duplicate instance ID: explained

- **Documented production behaviour:** `create({ id })` with an ID that is already in use (and still retained) fails.
- **Local behaviour (miniflare 4.20260410.0):** `create()` does not check for an existing instance. It calls `init()` on the same engine Durable Object (`idFromName(id)`). `init()` returns early if the instance is running, or is errored, terminated, complete, or paused. Init errors are swallowed (`.catch(() => {})`), and `create()` returns `{ id }`.
  - The second call therefore did **not** start a second run. It was a silent no-op.
  - The local emulator does not reproduce the production error.

**Design consequence: never rely on either behaviour.**

- Use the job ID as the instance ID.
- Treat "already exists" as "already started", which makes start idempotent.
- The database claim stays the source of truth.
- An instance ID can become reusable after its retention period ends, so the database must still refuse to re-run a settled job.
- Verify the production error code during the eventual preview test.

## 4. Design

### 4.1 Flow

```
Browser ── POST /api/generation/jobs ──► app Worker
   │                                      ├─ RPC: create job + reserve credit (one transaction)
   │                                      ├─ Workflow.create({ id: job.id })   ("exists" ⇒ ok)
   │◄─────────── { jobId } ───────────────┘
   └─ polls GET /api/generation/jobs/:id  (read-only; DB is authoritative)

Workflow(job.id): load → ground → generate → persist → validate → repair? → settle
```

Polling is unchanged. The browser can close, reload, or reopen.

### 4.2 Job state

The job row (`generation_jobs`) gains or uses these fields:

- `status`: `queued`, `running`, `succeeded`, `failed`, or `outcome_unknown`
- `credit_state`: `reserved`, `charged`, or `released`
- `workflow_started_at`
- `step`: the current step name, for honest UI progress

Each external effect gets its own record:

| Effect             | Record                                                                | Idempotency key                |
| ------------------ | --------------------------------------------------------------------- | ------------------------------ |
| Grounding snapshot | `grounding_snapshot` column                                           | Present ⇒ reuse                |
| Provider call      | `generation_attempts(job_id, attempt_no, state, provider_request_id)` | `(job_id, attempt_no)`, unique |
| Image object       | Storage path `…/{job_id}/{attempt_no}.png`                            | Deterministic path, upsert     |
| Image version row  | `image_versions` unique on `(job_id, attempt_no)`                     | `ON CONFLICT DO NOTHING`       |
| Validation result  | `validation_results` unique on `(job_id, attempt_no)`                 | Present ⇒ reuse                |
| Credit settlement  | Conditional update on `credit_state = 'reserved'`                     | Single transition              |

### 4.3 Step rules

- Every step starts by re-reading the job and its effect records. If the effect is already recorded, the step returns the stored value.
- Steps return small values only (IDs, storage paths), never image bytes.
- Configure **Workflow-level retries to 0 for the provider step.** Provider retries are explicit, through new attempt rows, because a crash re-executes an in-flight step regardless of retry settings.
- Generous `timeout` on the provider step. Normal retries on cheap, idempotent steps (load, ground, persist, settle).

### 4.4 Unknown provider outcome

On entering the provider step:

1. Look for an attempt with `state = 'submitting'` and no result. **The previous run was interrupted mid-call; the outcome is unknown.**
2. Otherwise insert attempt _n_ as `submitting`, call OpenAI, then record `succeeded` (with the request ID) or `failed`.

OpenAI's Images API does not document request idempotency keys (re-check before implementation). So an interrupted call cannot be deduplicated with the provider.

**Proposed policy (consistent with `platform_absorbs_one_per_request`):**

- Mark attempt _n_ `outcome_unknown`.
- Run **one** platform-paid re-attempt (_n_+1).
- The user is charged at most once, at settlement.
- If the re-attempt also fails or is unknown: job `failed`, credit `released`, and log it for review.
- Record the absorbed cost in usage metrics.

The alternative is failing and refunding immediately on an unknown outcome. It is safer on spend and worse for the user. **This is an owner decision.**

### 4.5 Settlement and crash recovery

- **Settle step:**
  - success: `UPDATE … SET credit_state = 'charged' WHERE id = $job AND credit_state = 'reserved'`
  - failure: the same update setting `released`
- Repair attempts never charge.
- **Backstop sweeper:** a cron trigger, or the existing `stale-job.ts` logic moved out of GET handlers. For jobs `running` longer than N minutes, it queries `Workflow.get(id).status()`:
  - `errored` or `terminated`: release the credit and fail the job
  - `queued` with no instance: call `create()` again (idempotent)
  - complete but unsettled: run the settle logic
- GET handlers become read-only. The September audit noted they currently mutate stale-job and credit state.

### 4.6 Credentials (applies to both hosting options)

Today generation routes act with the user's JWT under RLS, and there is no service-role key. A Workflow runs without a user request, so it needs a server credential:

- **Recommended:** `SECURITY DEFINER` RPCs scoped to the job-execution transitions, called with a dedicated secret held as a Worker secret. This is narrower than a full service-role key.
- **Alternative:** a service-role key stored as a Worker secret. It is broad, so it needs strict code review.

### 4.7 Account-level quotas and usage metrics

- **Burst protection:** keep the per-isolate limiter, or use the Workers Rate Limiting binding if Lovable allows it. Per-location limits are fine for bursts.
- **Authoritative quota:** a `usage_quotas(subject, period, kind, used, cap)` table plus an atomic RPC:

  ```sql
  UPDATE usage_quotas SET used = used + $n
  WHERE subject = $s AND period = $p AND kind = $k AND used + $n <= cap
  RETURNING used;
  ```

  No row returned means the quota is exceeded.
  - `subject` is the account ID when signed in. For anonymous Improve or Critique, it is a salted IP hash per day (owner decision: keep anonymous access, or require sign-in beyond a small allowance).
  - Call it before Improve, Critique, and job creation. Never expand free usage before this exists.

- **Metrics:** `usage_events(subject, kind, tokens_in, tokens_out, image_calls, repair_calls, est_cost_usd, absorbed, created_at)`, written by the prompt routes and by each Workflow step. This feeds the pricing analysis.

### 4.8 Hosting options

| Option                                     | When                                                            | Notes                                                                                                                                                                                                                                                                                  |
| ------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. In-app Workflow**                     | Lovable publish uses `cloudflare-module` and allows the binding | Smallest change: `exports.cloudflare.ts`, a `workflows` entry in `wrangler.jsonc`, and the job route starts the instance                                                                                                                                                               |
| **B. Separate Workflow Worker** (fallback) | Lovable cannot host Workflows                                   | Deployed by us to our own Cloudflare account with Wrangler. If the app stays on Lovable's account, **service bindings will not work across accounts**. Call over HTTPS with an HMAC-signed body, timestamp, and job ID; reject replays. The Worker holds the server credential (§4.6). |
| C. Status quo, hardened                    | Neither                                                         | Keep the browser-held `/run` route, move stale-job recovery to a sweeper, add attempt records. This reduces the risk but does not remove it.                                                                                                                                           |

## 5. Before implementing

- Lovable answers to §2.
- Owner decisions:
  - unknown-outcome policy (§4.4)
  - quota subject for anonymous users (§4.7)
  - credential approach (§4.6)
- One approved non-production preview to confirm:
  - the duplicate-ID error code
  - named exports survive publish
  - Workflow instance visibility
- Unit tests against the `GenerationDataAccess` in-memory fake for:
  - crash re-execution of every step
  - unknown outcome
  - duplicate start
  - double settlement
