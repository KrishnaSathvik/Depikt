# Four release-blocker fixes — non-paid verification complete

Production remains **NOT READY pending targeted live verification**. These changes address the four defects found in the final run; no paid re-verification has occurred.

1. **Series precedence/counts.** Explicit separate/individual/standalone wording defeats collage and panel inference; negative collage wording suppresses collage mode. Written counts take precedence over conflicting model counts. Tests cover two separate images, three standalone images/no collage, one 2×3 contact sheet, collage of four photos, and the failed two-image wording.
2. **Owned context and grounding relevance.** Owned packs and explicitly fictional subjects suppress inferred product/factual searches. Explicit research/current/external requests still permit research. A research-laboratory setting or owned reference photographs are not themselves research commands. Retrieval now removes blank/encoded and subject-unrelated snippets before selecting prompt/validation evidence. The grounding cache key version changed to prevent reusing old unfiltered entries. V5 receives only nonempty facts with selected-source provenance; visual-search captions are not mandatory output claims.
3. **Provider inputs and operation.** Operation follows actual planned source/ad-hoc/entity/grounding visual inputs, rather than the mode label. Grounding-only references no longer fail the missing-edit-source guard. Facts-only grounding uses generation. Mock integration verifies grounding reference bytes reach the edit multipart request and facts-only requests reach generations, with one normal charge each.
4. **Precision-edit intent and geometry.** Generic local intents distinguish attribute change, replacement, removal and addition. Attribute changes require fixed shape, silhouette, dimensions, perspective, pose and internal geometry. Intent derives from original user input, independently of compiled reference preambles. V5 independently judges inside-mask structure against the original source and mask; outside-mask pixel preservation remains unchanged. Missing/uncertain evidence cannot trigger repair; the existing global/session budgets and credit economics remain intact.

Relevance filtering and local-edit classification are conservative deterministic heuristics. They do not prove semantic correctness for every possible phrasing or search result. Real grounded-image quality and geometry preservation still require the targeted live gate; insufficient relevant evidence fails before image generation rather than accepting unrelated evidence.

## Checks

| Check | Result |
|---|---|
| Full non-paid unit suite | 802 passed, 0 failed |
| Typecheck | PASS |
| Production build | PASS |
| Changed-file lint (22 files) | PASS |
| Disposable local DB migrations/RLS/concurrency | PASS |
| Diff whitespace | PASS |
| Approved fixture hashes | 17/17 unchanged |
| Original frozen matrix | SHA256 unchanged: 082a3cb04029a1763e7750f9e1a63a1f1d4356c3570800d35d9efc86de22dff1 |
| Original durable state | Identical to final accounting: 14 initial + 1 repair = 15 |
| New paid image / search / validation calls | 0 / 0 / 0 |
| Production flags | V4=false, V5=false, repair=disabled |
| QA flags | V4=true, V5=true |

DB checks used a disposable local PostgreSQL cluster, not the hosted QA database. Sandbox shared-memory restrictions required the existing test script to run outside the sandbox. No new migrations were authored or applied to QA/production. No deployment or browser fixes were performed. Existing workspace changes were preserved.

Logs are copied to `output/blocker-fixes/`. [Browser follow-ups](browser-followups.md) remain separate.

## Targeted verification proposed for authorization

Frozen manifest: [targeted-matrix.json](targeted-matrix.json). Six scenarios, copied without prompt edits from the original matrix: series (2 outputs), precision edit (1), product/no-grounding (1), multi-entity/no-grounding (1), game grounding (1), location grounding (1).

- New run ID: `targeted-vnext-blockers-2026-09`.
- Hard cap: **7 requested images + 1 global automatic repair = 8 provider image attempts maximum**. Failed/rejected attempts consume slots; no retries or extra images.
- Use the original Scenario 1 teapot output and original teapot mask; no new source image or reference fixture. Original owned packs remain authoritative.
- Same normal repair confidence/eligibility policy; original kept on uncertainty or failed repair. Global repair slot may be consumed by any eligible targeted scenario. Per-scenario maxRepairs fields copied from the historical template do not override this explicit global policy.
- Product and multi-entity must make zero grounding searches. Each of the two grounded scenarios remains capped at 3 web queries, 2 visual queries and 8 sources; cache testing makes no image call.
- 7 normal user credits if all requested outputs succeed; automatic repair, grounding and validation add zero user credits. Last confirmed QA balance is 72; refresh it read-only before execution.
- Guard profile `new VerificationBudget({ profile: "targeted" })` defaults to separate `benchmark-results/targeted-vnext-blockers/state.json`. Mock tests prove the 7/1/8 cap, forbidden scenarios, duplicate attempts, tampered matrix rejection and persistent counters. **No real targeted state has been initialized.**
- Preserve the original 15/19 state permanently. Do not rerun the eight passing scenarios or the full matrix. Production stays OFF.

Await explicit authorization before initializing/executing the targeted live run.
