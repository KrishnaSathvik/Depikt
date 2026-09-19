# Location authority micro-gate

Run: `final-location-authority-2026-09`. Started 2026-09-19T04:14:36.370Z. Executed once; stopped after cache/accounting.

**Output verdict: SOFT FAIL.** Authority acquisition succeeded: both authoritative web and visual evidence were found. V5 passed the image. The unresolved limitation is **current appearance**, not source ownership: selected evidence includes historical archives and visual references without verified capture dates/exact viewpoint. An unqualified production-readiness claim is not supported by this gate.

## Result and economics

- Output: [Sydney image](../../../benchmark-results/final-location-authority/location-grounding-version-0.png). Photorealistic blue-hour harbour scene with Opera House left, Harbour Bridge right, boats and park foreground; no visible text or fireworks. Recognizable landmark composition, but exact viewpoint/current skyline not independently verified.
- V5: **pass**; dimensions/count pass, no-text OCR pass (0.99), grounding-consistency pass (0.94).
- Repair: **not triggered**, outcome not_needed; original generated output retained.
- Guard: **1/1 requested, 0/1 repair, 1/2 total provider image attempts**. Image response HTTP 200; no retry or rejected attempt.
- QA credits: **63 → 62**, **1 charged, 0 refunded**. Ledger: -1 reservation, successfully settled with 0 additional debit.
- Extra user credits for grounding, validation and repair: **0**.
- **3 web queries, 2 visual queries, 8 selected sources**. **1 visual validation call, 1 OCR call, 1 cache hit**.
- Initial planning cache miss. Post-generation cache check reused the same key/seal with **0 searches and 0 images**.
- All three historical states, frozen run files and all 17 fixtures unchanged. QA V4/V5 ON; production V4/V5 OFF with repair disabled, verified before and after. New guard initialized once and preserved.

## Actual queries

These are the actual provider-bound attempts, in order:

1. **web**: blue-hour Mrs Macquarie’s Point Sydney Opera House Harbour Bridge skyline landmarks official references
2. **web**: blue-hour Mrs Macquarie’s Point Sydney Opera House Harbour Bridge skyline landmarks (site:gov OR site:gov.au OR site:gov.uk OR site:gouv.fr OR site:go.jp OR site:govt.nz OR site:gc.ca) official references
3. **visual**: blue-hour Mrs Macquarie’s Point Sydney Opera House Harbour Bridge skyline landmarks official references
4. **web**: blue-hour Mrs Macquarie’s Point Sydney Opera House Harbour Bridge skyline landmarks current appearance photographs
5. **visual**: blue-hour Mrs Macquarie’s Point Sydney Opera House Harbour Bridge skyline landmarks (site:gov OR site:gov.au OR site:gov.uk OR site:gouv.fr OR site:go.jp OR site:govt.nz OR site:gc.ca) official references

The second web query was the bounded authority fallback; the second visual query reused that authority scope. No external research beyond these five searches occurred.

## Selected sources

All eight were classified **institutional** from trusted government/academic namespaces; none were promoted from page-title wording. Authoritative web evidence found: **true**. Authoritative visual evidence found: **true**. Bundle authority status: **available**.

- **s1** — [Opera House and Sydney Harbour Bridge from Mrs Macquarie's Chair | City of Sydney Archives](https://archives.cityofsydney.nsw.gov.au/nodes/view/584966) — institutional
- **s2** — [Sydney Harbour Bridge - DCCEEW](https://www.dcceew.gov.au/parks-heritage/heritage/places/national/sydney-harbour-bridge) — institutional
- **s3** — [New Years Eve, illuminated heart on Harbour Bridge, Mrs Macquarie's Point Sydney Harbour, 2005 | City of Sydney Archives](https://archives.cityofsydney.nsw.gov.au/nodes/view/691455) — institutional
- **s4** — [Best vantage points for Sydney New Year’s Eve | City of Sydney - News](https://news.cityofsydney.nsw.gov.au/articles/best-vantage-points-for-sydney-new-years-eve) — institutional
- **s5** — [Panoramic view of Sydney Harbour and the city skyline | State Library of New South Wales](https://www.sl.nsw.gov.au/panoramic-view-sydney-harbour-and-city-skyline) — institutional
- **s6** — [Harbours | EROS](https://eros.usgs.gov/earthshots/harbours) — institutional
- **s7** — [Aerial view of a green peninsula in Sydney Harbour with the Harbour Bridge and skyline in the background. Credit: Placemaking NSW](https://planning.nsw.gov.au/about-us/our-work/placemaking-nsw) — institutional
- **s8** — [Sydney Harbour Bridge - Milsons Point](https://nsw.gov.au/visiting-and-exploring-nsw/locations-and-attractions/sydney-harbour-bridge) — institutional

Sources s1–s6 supplied textual context. Sources s7 and s8 supplied the two provider-bound visual references. Authority establishes institutional provenance, not that every excerpt depicts the requested place today.

## User-derived validation claim

> create a photorealistic blue-hour view from Mrs Macquarie’s Point in Sydney showing the Sydney Opera House and Harbour Bridge in their correct relative placement as they appear today

Origin: `user`. Supported by: s1, s2, s3, s4, s6, s7, s8. Compiler marked `checkableVisually: true`. No fireworks, historical construction state, archive date, source attribution or incidental count became a separate mandatory claim.

The V5 judge passed the recognizable blue-hour landmark arrangement with confidence **0.94**. Its statement about the viewpoint is a model judgment, not independent confirmation of dated geographic evidence.

## Remaining current-appearance limitations

- Source s1 explicitly describes a 1967 photograph with the Opera House under construction.
- Source s3 explicitly describes a 31 December 2005 New Year's Eve scene from Garden Island, not a current Mrs Macquarie's Point reference.
- Visual source s7 is described as an aerial peninsula/harbour view; source s8 is a Harbour Bridge/Milsons Point reference. Neither selected description establishes capture date or the exact requested viewpoint.
- Other government/library sources provide heritage, location and viewpoint context, but the selected bundle does not establish that the skyline/appearance is current today.
- V5 marked the whole user-derived claim visually checkable and passed it. That visual judgment does not independently verify recency; no automatic uncertainty warning was surfaced for this temporal evidence gap.

Consequently, the authority-acquisition improvement is proven, while “as they appear today” remains unverified. This is a documented limitation rather than a reason to claim a clean PASS or silently treat V5's pass as proof of current fidelity.

## Stop condition

No fixes, new prompts/seeds, retries, extra scenarios, game/KSP rerun, deployment or production enablement followed. The runner was stopped after output, cache check and ledger accounting.

Evidence: `benchmark-results/final-location-authority/{scorecard,state,start-evidence,end-integrity,accounting,location-cache-check,location-grounding}.json`, output PNG and `provider-events.jsonl`. Matrix SHA-256: `c1d9115d031200f114a1b21bd73090e3c750cc3147e4217d37ba104c5b7c24f1`.
