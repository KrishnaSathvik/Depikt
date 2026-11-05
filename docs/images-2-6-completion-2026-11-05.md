# Images 2.6 completion — development only

No publishing, production database changes, payments or paid requests were performed.
The 28-call and 150-call benchmark plans are superseded. Only four representative functionality checks remain.

## Implementation

- New requests default to Images 2.6 in both server and browser, from the shared capability registry. Explicit 2.5 overrides remain available; automatic Flare/Sunburst routing is unchanged. Historical signed plans and library labels are not rewritten.
- SVG is selectable under the new default. Native vectors remain validated, stored privately and downloadable without raster conversion.
- Saved SVG/GIF handoffs retain MIME and actual media metadata. Reopened native creations cannot accidentally enter PNG editing, downloads keep their extensions, and GIF regeneration preserves stored frame settings.
- Corrected the provider's current documented request limit to **2–16 frames**, not 64, consistently across validation, registry and controls. Historical byte parsing still accepts earlier valid assets.
- Static SVG typography/stroke attributes are supported while scripts, CSS, external resources, recursion and active content remain rejected.
- Existing still-image generate/edit/regenerate charges stay **one credit**. Subscription prices are unchanged.
- Updated generation structured data to describe 2.6; retained the historically accurate 2.5 prompt tools, collection, examples and articles.

## GIF pricing: precise remaining dependency

Official model pages publish $5/M text input, $8/M image input and $30/M output tokens. They do not document a guaranteed GIF output-token bound or per-GIF charge. Frame count alone is not a cost guarantee. Inventing a multiplier would not be reliable server-controlled pricing.

The minimum next step is **one approved four-frame GIF request** with actual usage returned, not a benchmark. Calculate its cost from usage and documented rates; choose a conservative server-owned charge and restrict enabled GIF requests to the verified dimensions/frame envelope. If usage is absent or preview access is denied, stop; do not guess or make another call. One sample verifies only that envelope, not arbitrary 16-frame/high-resolution requests. The existing no-reservation gate remains until this evidence is available.

Sources checked November 5, 2026:
- https://developers.openai.com/api/docs/guides/image-generation
- https://developers.openai.com/api/docs/models/gpt-image-2.6-flare
- https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst

## Four individual development checks

`scripts/verify-images-2-6.ts` is a one-shot manual check, not a benchmark runner. It never touches a database, calls only the documented Images API and refuses repeat attempts. Run only after explicit paid-call approval, in this order:

```sh
bun scripts/verify-images-2-6.ts image --approve-paid
bun scripts/verify-images-2-6.ts markup --approve-paid
bun scripts/verify-images-2-6.ts svg --approve-paid
bun scripts/verify-images-2-6.ts gif --approve-paid
```

Each command makes at most one request. Stop on a provider denial/unavailable model or missing usage. No retries or extra calls. Standard image uses Flare; markup, SVG and GIF use Sunburst. Markup reuses the first result. Outputs and usage/cost records stay in `/tmp/depikt-2-6-verification/`, never in shared production storage. Visual review is still required after structural validity.

## Release

Use `docs/release-runbook-images-2-6.md` after separate final release approval: pause generation, deploy security-compatible code, apply pending Steps 1–4D in order, verify exactly-once settlement and token secrecy, match server/client flags, then reopen generation. Do not reverse security grants for rollback. Production remains untouched.

## Verification

- Full application tests: **994 passed, zero failed, one skipped** (missing offline fixture remains explicitly documented).
- Isolated real-role database security harness: **90/90 passed**, including token secrecy, concurrent claims, exactly-once charging/refunds and terminal-outcome protection. No production database access or mutation.
- Changed application files: ESLint clean. Harness typecheck and production compilation: **build OK** after final fixes; no separate manual build/typecheck invoked.
- Signed-in browser: SVG selectable, PNG/GIF settings, 16-frame request cap, tablet/mobile widths 820/390/360 without horizontal overflow, real saved creation reopened into existing editing UI; zero runtime errors. Screenshots in `/tmp/browser/upgrade/` are sandbox-local, not permanent deliverables.
- Unapproved one-shot check invocation refused before any provider request.

Paid generation/editing and native-provider outputs are **not yet verified**; preparation does not prove provider access or cost. Current account has no available credits; no paid submission was attempted. New native saved-result recovery is covered by offline regression checks, not a live newly generated SVG/GIF.

**Remaining blockers:** explicit approval for four paid development checks; GIF policy depends on the single GIF usage result; pending production migrations and coordinated release require separate release approval. This is not an unconditional release-ready claim.