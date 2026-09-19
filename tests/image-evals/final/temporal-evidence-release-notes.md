# Temporal-evidence truthfulness — local release candidate

**READY FOR PRODUCTION ACTIVATION after publishing the tested local code and setting the production flags.** Kept local at the owner's request. Nothing was committed, pushed, published, deployed, or enabled in production by this task. No further image benchmark is required or authorized.

## Behavior

Visual matching and temporal support are now separate. Temporal language (`current`, `today`, `latest`, `present-day`, `as of 2026`, etc.) is removed from the grounded visual judge target and retained as a separate signed temporal-support record.

When emitted visual checks pass and temporal support is unavailable, the result is **`pass_with_limitation`**, with **`temporalSupport.status = "unverified"`**, rather than an unqualified pass. Missing temporal evidence cannot claim a repair slot. A genuine visual defect can still qualify for the normal included repair; its temporal limitation remains attached after revalidation. Failed/unavailable visual checks remain failures rather than being softened to a pass.

The recorded Sydney authority bundle (including 1967/2005 archives and undated visual references) is a checked-in non-paid fixture. It now produces the qualified result despite passing mocked visual checks. The historical live-run evidence and verdict records were not rewritten.

User-facing copy, including result surfaces and grounding resume:

- Verified current authoritative support: **Grounded with current authoritative sources**
- Authoritative context but unverified recency: **Grounded with authoritative references. Current appearance could not be independently verified.**
- No authoritative support: **Current appearance could not be independently verified.**
- Verified explicit historical/as-of period uses requested-period wording, not “current.”

Single-image, series and inline results display the temporal message. Existing download/edit actions remain available. A rendered React regression verifies that a qualified series result displays its limitation without showing a repair-in-progress state or blocking those actions.

## Evidence standard and remaining scope

An institutional domain, source publication year, upload path, current search query, or retrieval timestamp is insufficient. A trusted evidence provider must supply a `verified_appearance` attestation covering the selected user-derived visual requirement and the entire requested date/period. The selected source must be authoritative, and expired/future/partial-date or wrong-subject attestations do not qualify.

This is an optional structured provider field (`appearanceEvidence` with coverage and validity interval). The current Brave adapter does **not** fabricate it from snippets. Consequently, current-appearance requests through Brave remain qualified unless explicit temporal evidence is supplied by a trusted provider. That is truthful behavior, not another paid verification gate. No extra evidence-gathering or model call was introduced.

Temporal cache keys include the request date. Old signed bundles/plans remain readable because added metadata is optional. Exact requested image text such as “TODAY” does not by itself request current factual evidence. New assessments persist the qualified verdict and temporal metadata through signing and result polling. Previously saved live results are historical records and are not retroactively re-scored or rewritten.

## Non-paid validation

- **834/834 tests pass**.
- `npm run typecheck`: pass.
- `npm run build`: pass (non-fatal dependency bundler warnings).
- Changed-file lint and `git diff --check`: pass.
- All four previous verification states preserved; all 17 approved fixture hashes match.
- Production V4/V5 remain **OFF** and repair remains **disabled**.
- **0 image calls, 0 live searches, 0 paid validation calls** during this change.

Logs/integrity proof: `output/temporal-evidence/`.

## Later publication handoff

The working Lovable connection can read the existing Depikt project. The other connection needs reauthentication. Only read-only app calls were made; no Lovable agent message or publish action was sent.

The connected project was last observed at commit `b8007c450e25228b34e9f9efb9796ee1ecb4b27e`. The local branch includes additional V4/V5 commits plus the verified fixes in the working tree. Publishing that older remote revision alone would not publish this release candidate. Synchronize the tested local changes before activating flags.

For the later production release, preserve the launch caps: 3 web queries, 2 visual queries, 8 sources, one included automatic repair per session; grounding/validation/automatic repair add no user credits; manual generate/edit/regenerate use normal credits; provider failures refund. Enable production V4/V5 and the included-repair policy only with that synchronized release. Then perform one non-generative production smoke. No additional images or live search benchmark is needed.
