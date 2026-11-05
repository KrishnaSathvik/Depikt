# Step 5 — UI/UX Audit and Refinement

- [ ] 5A Capture current desktop/tablet/mobile journeys and accessibility evidence.
- [ ] 5B Document prioritized findings and consistent interaction decisions.
- [ ] 5C Implement evidence-led frontend fixes preserving shared hooks and security.
- [ ] 5D Verify keyboard, touch, reduced motion, overflow and media performance.
- [ ] 5E Run application tests, relevant lint and browser regression checks; record remaining limitations.

No deployment, production database changes, paid provider calls, payments or price changes. Stop before benchmarks and coordinated release; do not ask for publication.

# Step 4 — Images 2.6 Media Capabilities

Constraints honored: no publish, no production DB changes, no paid OpenAI calls, no broad UI redesign, Steps 1–3 and fallbacks preserved.

- [x] 1. Capability matrix: docs/images-2-6-capability-matrix.md (verified against official docs 2026-11-05)
- [x] 2. Provider capability registry (src/lib/generation/provider-capabilities.ts); models.ts family switch (IMAGES_MODEL_FAMILY, default 2.5); openai-images.ts validates combos before any billable request
- [x] 3. Routing: deterministic alias rules unchanged, family orthogonal; 21 router tests + 14 registry tests
- [x] 4. Job-execution abuse closed: per-job execution_token (DB-minted, hidden column), token-gated transitions, claim_generation_job RPC, encrypted tokens in plan_json, stale-job defers to reaper
- [x] 5. supabase/pending/step3_job_execution_tokens.sql + step3.sh: 42/42 isolated DB tests
- [x] 6. Benchmark plan: docs/images-2-6-benchmark-plan.md (150 generations, $40 cap; none executed)
- [x] 7. Milestones: docs/images-2-6-milestones.md (4a markup, 4b SVG, 4c GIF, 5 UI/UX)
- [x] 8. Verification: typecheck clean, build OK, 972/974 app tests (2 known pre-existing), report at /mnt/documents/audits/step3-report-2026-11-05.md

Step 3 baseline above is preserved. Step 4 constraints: no deployment, shared database changes, paid calls, subscription changes, or broad UI redesign. Stop before Step 5.

- [x] 4A development: separate markup editor, aligned annotation upload, API integration, pointer/keyboard and regression tests. Paid provider execution not performed.
- [x] 4B development: signed SVG requests, safe native-vector validation/storage/preview/download, security and regression tests. Release needs active 2.6 family and pending metadata migration.
- [x] 4C development: GIF adapter, actual animation metadata/preview/download, server-authoritative pricing gate and tests. Paid generation remains disabled pending pricing benchmark.
- [x] Consolidated report with per-milestone files, test outcomes, limitations and blockers.
- [x] Closed inherited token disclosure in Step 4D with real-role isolated database tests.

Blocked: live provider verification and GIF pricing benchmark require paid calls, prohibited in this step. Security boundary needs a separate authorized follow-up; production remains untouched until explicit future approval. Step 5 not started.

# Step 4D — Execution-token boundary & media readiness
- [x] Job creation RPCs no longer return tokens (new + replay); service_role-only reader
- [x] Removed encrypted session token copy, merge RPC and plan_json carve-out
- [x] Repair RPCs revoked from anon
- [x] 90/90 isolated DB tests with real roles; app suite 986/988 (2 known)
- [ ] Apply Steps 1–4D migrations at coordinated release (blocked: final verification and explicit approval)
- [ ] Paid provider verification for markup/SVG and GIF pricing benchmark (blocked: no paid calls allowed)
