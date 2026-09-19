# VNext 4 — grounding

Default: `GROUNDING_ENABLED` is absent/false. No live research, image generation, new image fixtures, or visual review was performed during implementation. IntentSchema is unchanged.

The planner derives bounded web/visual queries from Intent and generic prompt evidence. Facts and appearance references are separate, with source IDs and provenance. Official documentation/product/institutional/secondary evidence precedes community evidence; community factual excerpts are excluded when higher-quality evidence exists. Excerpts are bounded and JSON-delimited as untrusted evidence in the image brief. This reduces prompt injection exposure; it does not make retrieved text authoritative instructions.

The server resolves the bundle before signing the plan. Each persisted snapshot also has a canonical HMAC bound to its owner and query hash, because owner-scoped Supabase rows may be written directly by an authenticated client. Jobs reject browser-supplied facts/URLs; `/run` verifies the stored snapshot before retrieving transient references. Images are never added to the storage bucket or reference packs. Existing source/entity image ordering is preserved, with research references appended.

Apply `20260917120000_generation_grounding_cache.sql` before controlled activation. Cache snapshots persist across Workers/redeploys and have no implicit time expiry: regenerate reuses results until `refreshGrounding: true` is explicitly submitted. Query hashes include owner, prompt, mode, queries, and provider namespace. Invalid signatures fail closed. A provider error or missing required evidence fails planning before reserving image credits.

## Concrete provider

Set `BRAVE_SEARCH_API_KEY` to use the included Brave web/image search adapter. Only Brave's fixed API endpoints are contacted for searches, and transient image downloads are restricted to `imgs.search.brave.com` with redirects disabled. No arbitrary source URLs are fetched. Snippets supply attributed facts; thumbnails provide actual visual inputs. Snapshot provenance is retained; image bytes are not stored. Proxy URLs may become unavailable later; retry then requires an explicit research refresh rather than a silent new search.

Optional `GROUNDING_SOURCE_RULES_JSON` supplies operator-verified `{host,quality}` classifications. The longest matching hostname rule wins. Institutional `.gov`/`.edu` sites are classified generically; unknown domains conservatively default to community. Page titles claiming to be official do not confer official status. Rules are configuration, not domain hardcoding in the planner. Configure verified official/reputable source hosts for the activation use cases. Rules participate in the cache namespace.

The adapter follows the [Brave web search documentation](https://api-dashboard.search.brave.com/app/documentation/web-search/get-started) and [image search reference](https://api-dashboard.search.brave.com/api-reference/images/image_search). Only documentation was read; no live search endpoint was called during implementation.

## Optional gateway deployment contract

The alternative production HTTP adapter is vendor-independent and requires a trusted search gateway configured with `GROUNDING_PROVIDER_URL` (HTTPS) and `GROUNDING_PROVIDER_TOKEN`. It is deliberately not coupled to a vendor. No gateway is provisioned by this change; this alternative requires an implementation of the protocol. Set no gateway URL to use Brave instead.

POST to the configured endpoint, bearer auth, JSON `{operation,input}`:

- `searchWeb` / `searchImages`: input `{query,limit:10}`. Response: at most 20 objects `{url,title,excerpt,quality,imageUrl?}`. Quality must be assigned by the trusted provider's source classification, not a page's self-description. Quality enum: official_documentation, official_product, institutional, secondary, community. Title max 200 chars, excerpt max 400, URLs max 2048.
- `referenceImage`: input `{url}` selected from a signed search snapshot. Response: decoded/sanitized PNG, JPEG or WebP, at most 4 MB. The gateway must enforce public DNS, deny private/link-local destinations on every redirect, strip credentials, and enforce dimensions and decoder limits. The application only fetches the fixed configured endpoint, disallows redirects, caps responses, and uses a 15-second timeout.

Offline tests use authored, frozen search-response fixtures, not a claim of live search accuracy. No CI network or provider keys are needed. Provider configuration and live quality are deferred to the one final verification.

## Verification

The initial VNext 4 gate passed 720 unit tests (including grounding/security cases); typecheck; production build; changed-file lint. Repository-wide lint has existing violations outside this change and is not repaired here. Final live matrix is frozen in `tests/image-evals/final/matrix.json`: 14 scenarios, 18 initial images, at most one repair image; no execution yet.

The follow-on VNext 5 changes also authenticate the complete stored execution plan against the job and add grounded request/source resume plus an explicit refresh-research action. The final combined verification record is in the VNext 5 document.
