# Final two-scenario grounding gate

Run: `final-grounding-claims-2026-09`. Executed 2026-09-19T03:51:42.494Z; production remains OFF.

**1 PASS, 1 SOFT FAIL.** The claim-boundary fix works in live execution. This is not two unqualified passes: official/current location evidence remains unavailable. No production-readiness activation is implied.

| Scenario | Score | V5 result | Requested / repair attempts | User credits |
| --- | --- | --- | --- | --- |
| game-grounding | PASS | Initial repairable (0.90); selected repair pass (0.93) | 1 / 1 | 1 |
| location-grounding | SOFT FAIL | Pass on dimensions/count/no-text; grounding omitted | 1 / 0 | 1 |

## Accounting

- Starting credits **65**, ending **63**; **2 charged, 0 refunded**. Ledger debits are two -1 reservations, each settled successfully with no further debit.
- Requested attempts **2/2**; automatic repairs **1/1**; total provider image attempts **3/3**. All three returned HTTP 200. No retries or rejected attempts.
- Repair used only by game-grounding, selected as improved. Original and repaired versions both preserved. Location did not request a repair.
- Grounding: **4 web queries, 4 visual queries** total (2 + 2 per scenario), **7 sources per scenario**, 2 visual references per scenario.
- **2 visual validation calls**, **1 OCR call**, **1 cache hit**. Location cache check reused the exact signed snapshot with **0 searches and 0 images**.
- Grounding, validation and automatic repair cost the user **0 extra credits**. Provider grounding dollar-cost estimates remain null/unconfigured; this is separate from verified user-credit accounting.

## Preflight and integrity

Read-only QA balance was refreshed before state initialization (65). QA V4/V5 ON; production V4/V5 OFF and repair disabled. Both prior state hashes matched preflight and still match after execution. All 17 approved fixture hashes match. Original, targeted and grounding matrices retain their frozen hashes. New state initialized once; never deleted/reset.

State: `benchmark-results/final-grounding-claims/state.json`. Grounding matrix SHA-256: `9f2379b3a28f9ff9e2536018abd2604531e2c3e707e788dd32be8cda8d7a5bc7`.

## game-grounding — PASS

Selected repair is visibly shorter and less elongated than the original. It depicts a KSP-like lander, Kerbal, landing legs and engine on gray cratered terrain. No labels or infographic layout. Exact stock-part/mechanical fidelity is not independently established.

All selected sources classified community; authorityStatus not_required. Visual game-style validation passed, not an official mechanical-fidelity certification.

### Validation claim

`create a game-faithful image of a compact stock-style Mun lander on the Mun surface`

Origin: user. Supported by: s4, s5, s6, s7. Visually checkable: true. Authority status: `not_required`. No incidental 122/22-part counts, creator attribution or fireworks obligation was compiled.

The initial judge marked the tall multi-stage-looking craft insufficiently compact (confidence 0.90), legitimately tied to the user's compact-lander's requirement. Normal policy triggered the single repair. Revalidation passed at 0.93 and selected the repair as improved. No source-count/author requirement caused repair.

Selected output: [repaired lander](../../../benchmark-results/final-grounding-claims/game-grounding-version-1.png). Original retained: [original lander](../../../benchmark-results/final-grounding-claims/game-grounding-version-0.png).

### Queries

Both of these queries were sent once to web and once to visual search (2 web, 2 visual; no additional queries):

1. Research Kerbal Space Program 1 stock-game parts and authentic game visuals, then create a game-faithful image of a compact stock-style Mun lander on the Mun surface. Use only visual/mechanical concepts supported by the actual game. One standalone image, no labels or infographic layout.
2. Research Kerbal Space Program 1 stock-game parts and authentic game visuals, then create a game-faithful image of a compact stock-style Mun lander on the Mun surface. Use only visual/mechanical concepts supported by the actual game. One standalone image, no labels or infographic layout. official documentation reference photographs

### Selected sources

- s1: [Mun Lander I on KerbalX.com](https://kerbalx.com/Redbiertje/Mun-Lander-I) — community
- s2: [Mun Lander on KerbalX.com](https://kerbalx.com/r00t/Mun-Lander) — community
- s3: [Kerbal Space Program - Wikipedia](https://en.wikipedia.org/wiki/Kerbal_Space_Program) — community
- s4: [r/KerbalSpaceProgram on Reddit: Compact Mun Lander](https://www.reddit.com/r/KerbalSpaceProgram/comments/7d1qiv/compact_mun_lander/) — community
- s5: [Mun and minmus lander designs - KSP1 Discussion - Kerbal Space Program Forums](https://forum.kerbalspaceprogram.com/topic/229510-mun-and-minmus-lander-designs/) — community
- s6: [Early Career Mun Landing - KSP1 Tutorials - Kerbal Space Program Forums](https://forum.kerbalspaceprogram.com/topic/151932-early-career-mun-landing/) — community
- s7: [r/KerbalSpaceProgram - is this a good mun lander design?](https://www.reddit.com/r/KerbalSpaceProgram/comments/16np0k3/is_this_a_good_mun_lander_design/) — community

Visual reference source IDs: s4, s7. Provenance, image-reference URLs and signed plan evidence are preserved in the scenario JSON. Initial planning cache hit: false. No separate cache test for this scenario.

## location-grounding — SOFT FAIL

Blue-hour harbour view shows Opera House left and Harbour Bridge right/behind, with water, boats and rocky vegetation foreground. No visible text or fireworks. Viewpoint is visually plausible; current appearance and absence of invented skyline details are not authoritatively verified.

All selected sources classified community; official evidence unavailable. User-derived location claim retained but checkableVisually=false, so V5 omitted the grounding check. Machine pass covers canvas/count/no-text only.

### Validation claim

`create a photorealistic blue-hour view from Mrs Macquarie’s Point in Sydney showing the Sydney Opera House and Harbour Bridge in their correct relative placement as they appear today`

Origin: user. Supported by: s1, s2, s3, s4, s5, s6, s7. Visually checkable: false. Authority status: `official evidence unavailable`. No incidental 122/22-part counts, creator attribution or fireworks obligation was compiled.

V5 reports pass with warning=false because its emitted checks pass; this is **not** evidence that current location fidelity was checked. Authority uncertainty is recorded in the grounding bundle. No repair was triggered. The visual result alone cannot prove the user's official/current requirement.

Output: [Sydney view](../../../benchmark-results/final-grounding-claims/location-grounding-version-0.png).

### Queries

Both of these queries were sent once to web and once to visual search (2 web, 2 visual; no additional queries):

1. Research current official and recent visual references, then create a photorealistic blue-hour view from Mrs Macquarie’s Point in Sydney showing the Sydney Opera House and Harbour Bridge in their correct relative placement as they appear today. Do not invent skyline landmarks. No text.
2. Research current official and recent visual references, then create a photorealistic blue-hour view from Mrs Macquarie’s Point in Sydney showing the Sydney Opera House and Harbour Bridge in their correct relative placement as they appear today. Do not invent skyline landmarks. No text. official documentation reference photographs

### Selected sources

- s1: [Sydney Opera House & Harbour Bridge: Every Viewpoint (2026)](https://awalkintheworld.com/sydney-opera-house-harbour-bridge-viewpoints/) — community
- s2: [Sydney Opera House - Wikipedia](https://en.wikipedia.org/wiki/Sydney_Opera_House) — community
- s3: [Best Point to See Sydney Opera House and Harbour Bridge | TikTok](https://www.tiktok.com/discover/best-point-to-see-sydney-opera-house-and-harbour-bridge) — community
- s4: [Sydney | History, Population, Climate, & Facts | Britannica](https://www.britannica.com/place/Sydney-New-South-Wales) — community
- s5: [25 Famous Viewpoints Better Seen From Somewhere Else - NewsBreak](https://www.newsbreak.com/travel-pug-307649113/4891954732687-25-famous-viewpoints-better-seen-from-somewhere-else) — community
- s6: [Lookouts in Sydney: the harbour seen from the water](https://www.lifestylecharters.com.au/celebrations-events/lookouts-in-sydney/) — community
- s7: [Sydney Harbour Bridge from the water on an overcast day, boat railing visible in the foreground, both pylons and the full arch in frame](https://awalkintheworld.com/sydney-opera-house-harbour-bridge-viewpoints) — community

Visual reference source IDs: s7, s7. Provenance, image-reference URLs and signed plan evidence are preserved in the scenario JSON. Initial planning cache hit: false. Post-generation read-only cache hit confirmed; same key and seal, zero search/image calls.

## Stopped

Both scenarios and final accounting completed before the runner was stopped. No fixes, prompt edits, new seeds, extra scenarios, reruns, deployment, or production enablement followed. Browser follow-ups remain separate.

Detailed evidence: `benchmark-results/final-grounding-claims/{scorecard,accounting,start-evidence,end-integrity,location-cache-check,state}.json`, scenario JSON/output PNGs, and `provider-events.jsonl`.
