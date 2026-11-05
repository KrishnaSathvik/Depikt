# Step 3 — Images 2.6 Integration & Job-Execution Lockdown

Constraints honored: no publish, no production DB changes, no paid OpenAI calls, no UI changes, Steps 1–2 and fallbacks preserved.

- [x] 1. Capability matrix: docs/images-2-6-capability-matrix.md (verified against official docs 2026-11-05)
- [x] 2. Provider capability registry (src/lib/generation/provider-capabilities.ts); models.ts family switch (IMAGES_MODEL_FAMILY, default 2.5); openai-images.ts validates combos before any billable request
- [x] 3. Routing: deterministic alias rules unchanged, family orthogonal; 21 router tests + 14 registry tests
- [x] 4. Job-execution abuse closed: per-job execution_token (DB-minted, hidden column), token-gated transitions, claim_generation_job RPC, encrypted tokens in plan_json, stale-job defers to reaper
- [x] 5. supabase/pending/step3_job_execution_tokens.sql + step3.sh: 42/42 isolated DB tests
- [x] 6. Benchmark plan: docs/images-2-6-benchmark-plan.md (150 generations, $40 cap; none executed)
- [x] 7. Milestones: docs/images-2-6-milestones.md (4a markup, 4b SVG, 4c GIF, 5 UI/UX)
- [x] 8. Verification: typecheck clean, build OK, 972/974 app tests (2 known pre-existing), report at /mnt/documents/audits/step3-report-2026-11-05.md

Open (blocked on user): production release only after the full 2.6 upgrade is approved; then publish + apply pending migrations (Step 1, 2, 3 + cron) and re-verify. Step 4 (GIF/SVG/markup) can start in development.
