# Step 4D — Execution-token security hardening & media readiness (2026-11-05)

Nothing published. No production database changes. No paid provider calls.

## 1. Root cause and resolution
**Cause:** Step 3 minted a per-job execution token and returned it from `create_generation_job(s)`. Signed-in users can call those functions directly through the Data API (idempotent replay included), so an owner could read their own token and drive `claim/transition/save_validation`, i.e. force a running job to fail and be refunded. Encrypting the session copy did not help because the RPC itself disclosed the token.

**Resolution:** a server-only boundary backed by the service_role key.
- Job creation returns only `job_id/job_ids, reserved, available_credits` (new and replayed calls).
- New `get_generation_execution_token(job_id, user_id)`: SECURITY DEFINER, pinned `search_path`, re-checks ownership, EXECUTE granted to `service_role` only.
- The server reads the token per request in `/run` and stale-job recovery after authenticating the caller, and never stores, returns or logs it.
- Removed the encrypted token map in `plan_json`, `merge_generation_execution_tokens`, the recovery helper, and the `executionTokensEnc` immutability exception. The migration strips existing maps.
- `execution_token` column SELECT/UPDATE stays revoked from anon/authenticated.
- Repair RPCs are revoked from anon (they already rejected null users).

## 2. Files changed
- New: `supabase/pending/step4d_execution_boundary.sql`, `supabase/pending/step4d.sh`, `src/lib/generation/execution-token-server.ts`, `tests/unit/generation-execution-boundary.test.ts`
- Edited: `src/routes/api/generation/jobs.ts` (token persistence removed), `jobs.$id.run.ts`, `jobs.$id.ts`, `sessions.$id.ts` (server-side token fetch), `supabase/pending/step3.sh` (Step 4D block), `AGENTS.md`, `roadmap.md`
- Removed: `src/lib/generation/execution-token.ts`, `src/lib/generation/persist-execution-tokens.ts`, `tests/unit/generation-execution-token.test.ts`

Apply order at release: Step 1 → Step 2 (+ cron) → Step 3 → Step 4 media → **Step 4D**, after the new app code is live. Before 4D is applied, the app falls back to the token-less path, which only works before Step 3.

## 3. Effective grants and DB results (isolated Postgres, real roles)
`step4d.sh`: **90/90 pass**: 52 earlier Step 3/4 checks plus 38 new ones.
- anon/authenticated: cannot select `execution_token`, cannot call the token reader, and creation/replay results have no token column; the merge RPC is gone; `plan_json` is fully immutable.
- service_role: can read the token, and gets nothing for the wrong owner.
- Catalog checks: the only client-executable functions that mention the token compare it and never return it (claim/transition/save_validation). Every public SECURITY DEFINER function pins `search_path`. anon executes no credit/job/repair definer function.
- Lifecycle: force-fail without a token is denied, and guessed tokens are rejected. Cross-account claims return not_found. Two concurrent claims give exactly one `claimed`. A succeeded job charges once, can't be refunded and can't be failed. A failed job refunds once and can't be charged. A cancellation mid-run without a token works, the executor can't then mark it succeeded, and the job refunds.

## 4. App checks
- Unit suite: **986/988**. The 2 known pre-existing failures are unchanged: `previous VNext PNG fixture…` and `series validation scopes exact text…`. The count drops from 993 because 5 encryption tests for the removed code were deleted and 3 boundary tests were added.
- Typecheck clean, build OK, lint clean on changed files.

## 5. Media readiness
Re-verified in this step: the media unit tests are included in the suite above. They cover the SVG sanitizer against hostile and malformed inputs, markup alignment and alpha, native payloads, GIF bytes and metadata, the fixed image charge, the GIF refusal, and signed-plan tampering.
Carried over from Step 4 browser checks, not re-run here: markup pointer and keyboard drawing, undo/clear, GIF play/pause/restart with reduced motion, SVG→PNG export, and format controls at 1280px and 440px.
Fixed this session: SVG output is now disabled in the UI unless `VITE_IMAGES_MODEL_FAMILY=2.6`, so users can't hit the 2.5 rejection.
Not verified: real-device touch gestures, very high-resolution markup performance on low-end phones, and provider-side markup/SVG behaviour (needs paid calls).

## 6. Remaining release blockers
1. Apply all pending migrations in order, with the new code published first.
2. Paid provider verification for markup and SVG; switch to the 2.6 family on the server and in the site setting together.
3. GIF pricing benchmark. GIF stays non-executable and no credits are reserved.
4. Real-device mobile markup check.

## 7. Ready for Step 5?
Yes for UI/UX work. The token-disclosure blocker is resolved in code and in isolated DB tests. Release still requires items 1–4.
