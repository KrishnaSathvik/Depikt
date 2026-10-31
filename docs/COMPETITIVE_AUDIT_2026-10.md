# Depikt Competitive Audit — UI/UX and Architecture

Audit date: October 30, 2026. Scope: Depikt's current `main`-line code compared with public image-generation, prompt-improvement, and prompt-critique products.

## Method and limits

- **Depikt** was read from source: `CreateWorkspace`, `CreatorDraft`, `CreationComposer`, `BuildMode`, `CritiqueMode`, `src/lib/prompt-engine/*`, `src/lib/generation/*`, the generation API routes, billing plans, Library browse, and the MCP tools. The September audit (`docs/FINAL_PRODUCT_AUDIT_2026-09.md`) was used for known defects.
- **Competitors** were studied from public sources: docs, help centres, changelogs, launch posts, and reviews. Direct page fetches (and so page-source and stack inspection) were blocked by this environment's network policy. Findings therefore come from search-indexed summaries of those pages. "Reverse engineering" here means product behaviour and publicly inferable architecture, not competitor code. Claims marked *(inferred)* are reasoned, not documented. Treat secondary-source numbers (prices, counts) as approximate.
- **Products covered**
  - **Generators:** Midjourney web, Ideogram, Leonardo.ai, Krea, Adobe Firefly, Freepik, Recraft, ChatGPT Images.
  - **Prompt tools:** PromptHero, Lexica, PromptBase, OpenArt, Civitai, Midjourney /describe and /shorten, Ideogram Magic Prompt and Describe, the GPT Image 2 open galleries, and prompt graders (PrompTessor, gptprompts Prompt Checker, Opten, shapes.inc Image Rater).
- **Market changes found during the research**
  - **PromptPerfect (Jina)** shut down on 2026-09-01.
  - **Google ImageFX and Whisk** were merged into Flow and closed on 2026-04-30.

> **Review status (2026-10-31):** approved as a planning reference, not as an implementation plan. The original recommendation list was re-prioritised. See [Review decisions](#review-decisions-2026-10-31) at the end. Claims about uniqueness, pricing, and rate limiting were corrected in place.

## Executive summary

1. **Critique is a promising differentiator, not yet a proven moat.** This research did not identify an equivalent *dedicated, dimension-scored prompt critique and rewrite workflow* in a major generator. The nearest analogue is Midjourney `/shorten`, which only weights tokens. Third-party graders score general text prompts or finished images. Any chat assistant can still critique a prompt conversationally, so the claim must stay that precise. Depikt also needs evidence that its scores and rewrites measurably improve generated images (see Review decisions). Today it is under-marketed: it is the third tab, and the hero does not mention it.
2. **Information architecture is right-sized.** "Home = creator, Library = discovery, Account = mine" matches the Midjourney, Ideogram, and ChatGPT pattern. It avoids the canvas and node-graph complexity that reviewers consistently criticise in Krea, Freepik Spaces, Leonardo, and Firefly Boards. Keep it.
3. **Improve prompt is a destination, not a toggle.** The market standard is an inline enhancer:
   - Ideogram Magic Prompt has Auto, On, and Off modes, and shows the original next to the expanded prompt.
   - Firefly has "Enhance prompts".
   - Midjourney has Conversational mode.

   Depikt's Builder is better (intent analysis, playbooks, streaming, variations), but users have to switch tabs to get it.
4. **Generation economics need validation, not a price change.**
   - Pro is $19.99 for 40 credits, which is about $0.50 per image.
   - Competitors return 2–8 images per prompt, offer cheap draft modes (Midjourney Draft: 24 low-res images for 0.4 GPU-minutes), and give free daily allowances (Freepik 20/day, Recraft about 50 credits/day).
   - Depikt's included grounding, validation, and auto-repair may justify a premium, but the UI does not yet explain that value.
   - These headline numbers are **not like-for-like**. They ignore resolution and quality tier, commercial rights (Recraft's 50 daily free credits come with different ownership terms from paid output), real usage limits, and repair cost. Build a comparable cost and margin model before changing pricing.
5. **The architecture is careful but has one structural fragility.** Generation runs inside a browser-opened long-lived request (`/api/generation/jobs/:id/run`) because the deployment has no Queues and no `waitUntil`. Competitors run queue-backed workers *(inferred)*. Moving to Cloudflare Queues, Workflows, or Durable Objects is the highest-leverage architecture change.

## Feature matrix

| Capability | Depikt | Midjourney | Ideogram | Leonardo | Krea | Firefly | Freepik | Recraft | ChatGPT Images |
|---|---|---|---|---|---|---|---|---|---|
| Creation on home | Yes (`/#create`) | Create page plus Explore | Feed with prompt bar | Dedicated tools | Unified workspace | Home tools plus Boards | Suite and Spaces | Canvas | Chat and Images tab |
| Inline prompt enhancer | No (separate tab) | Conversational mode | Magic Prompt Auto/On/Off | Improve Prompt | Not found | Enhance prompts | Not found | Styles instead | Chat rewrites |
| Prompt critique/score | **Yes, rubric + rewrite** | `/shorten` token weights | No | No | No | No | No | No | No |
| Image → prompt | Reference intent analysis | `/describe`: 4 prompts with `--ar` | Describe | — | — | — | — | — | Chat |
| Reference roles | Auto-inferred intent | Image, style, omni (weights) | Style ×3, character | Up to 4, weighted | Image prompt (Krea 1 only) | Composition/style with strength | Style presets, characters | Style from 5 images | Chat attachments |
| Reusable style or pack | Owner-scoped Reference Packs | sref codes, moodboards | Style codes | Elements | Presets | Boards | Characters | Saved styles, palettes | — |
| Images per run | 1 per credit, series | 4 (24 in Draft) | 4 | Configurable | 2–4 | 4 | Configurable | Configurable | Up to 8 |
| Region edit | Mask editor | Vary Region | Canvas Magic Fill | Canvas | Realtime Edit | Generative Fill | Yes | Canvas | Select |
| Auto-validate/repair | **Yes (V5, 1 included)** | No | No | No | No | No | No | No | No |
| Grounding (facts, entities) | **Yes (V4)** | No | No | No | No | No | No | No | Model-native |
| Model choice | Hidden, deterministic router | Version flag | Model select | Many models | 60+ models | Firefly plus partners | Many models | V4.x | Instant/Thinking |
| Cost display | Single credit label | GPU minutes | Plan tiers | Tokens | Compute units per model | Generative credits | Credits per model | Credits per output type | Plan limits |
| Curated prompt library | **500 tested plus Images 2.5 set** | Explore (community) | Explore feed | Community | — | — | — | — | Trending prompts |
| Public API | No | No | Yes | Yes | Yes | Via Adobe | Limited | Yes | Yes |
| MCP | **First-party, 6 read-only tools** | No | Third-party only | No | No | No | No | Yes (reported) | — |

## UI/UX comparison

### 1. Information architecture

**Depikt:** one header row (Library plus account controls). Home hosts the hero, the three-tab creator, capabilities, and the footer. Library has Prompts, Templates, and Gallery tabs. Account owns creations and Reference Packs in dialogs.

| Pattern | Who | Depikt status | Recommendation |
|---|---|---|---|
| Prompt bar over or next to an inspiration feed | Midjourney, Ideogram, ChatGPT | Library is a separate route; Home shows example chips | Add a slim "From the Library" strip under the composer with hover "Use prompt". It keeps the creator-first Home but shortens the discovery → create loop. |
| Personal work as a top-level surface (Organize, My Creations, Image Library) | Midjourney, Ideogram, ChatGPT | Creations live in an Account dialog; History sits beside the section title | Promote **Creations** to a header item or route for signed-in users. Dialog-hosted galleries caused the F06 overlay bug and hide the user's most valuable asset. |
| Canvas or node workspace | Krea, Recraft, Freepik Spaces, Firefly Boards | None | **Do not copy.** Reviewers repeatedly call these overwhelming for simple text-to-image users. That is Depikt's audience. |

### 2. Composer

Depikt's `CreationComposer` is a single bordered shell: textarea, a reference tray, and a footer with caption and submit. It matches the best-in-class minimal composers (Midjourney Imagine bar, Ideogram). Gaps against the market:

- **Inline enhance.** Add a Magic-Prompt-style control to the Generate composer (Off, Auto, On) that runs the existing Builder before submit. Show **original vs enhanced** on the result, with "Use original" and "Edit enhanced" actions. Keep the Improve prompt tab for deliberate work: variations, template briefs, intent inspection. This turns Depikt's strongest engine into a default, not a detour.
- **Visible reference roles.** Competitors let users say what a reference *is for*: Midjourney image, style, or omni; Firefly composition vs style with strength; Whisk-style subject, scene, and style slots. Depikt infers `reference_intent` automatically, which is simpler but opaque. Show the inferred role as a chip on each reference thumbnail ("Style", "Product", "Subject identity") that users can override. This also explains the Imago re-attach rule.
- **Pinned references.** Midjourney's lock keeps references across prompts. Reference Packs cover the saved case. A one-click "keep for next prompt" pin covers the in-session case.
- **Cost transparency.** One credit label is cleaner than Krea's or Freepik's per-model costs. Keep it, but say what the credit includes: "1 credit · includes automatic check and one free repair". Today that value is invisible.

### 3. Improve prompt (Builder)

| Dimension | Depikt | Market |
|---|---|---|
| Input | Free text plus reference, template briefs, remix ref | Free text (Ideogram, Leonardo) or chat (Midjourney Conversational, ChatGPT) |
| Pipeline transparency | Live intent shown during streaming | Ideogram shows the final enhanced prompt only |
| Output | Streamed structured prompt, why-it-works, lazy variations | One rewritten prompt, sometimes per image |
| Diff | Not shown | Ideogram shows original vs enhanced; Leonardo advises users to "check what was added" |
| Follow-up edits | Re-run | Midjourney Conversational applies small changes ("make it dusk") to the prompt |

**Recommendations**
1. Add a word-level **diff view** (added, removed, kept) between the user's input and the built prompt. It builds trust and teaches prompting.
2. Add **refinement chips** under the output, such as "Warmer light", "Tighter crop", or "Fewer props". They re-run the writer with the intent locked: Midjourney Conversational-style edits without a chat UI. ImageFX's "expressive chips" made a similar idea popular.

### 4. Critique (moat)

Depikt already scores four core and six conditional dimensions with anchors, caps the overall score on essential failures, and returns a rewrite. To widen the lead:

- **In-place annotations.** Midjourney `/shorten` colours each token by weight, and that visual is memorable and shareable. Highlight prompt spans tied to the dimension they affect: contradiction, wasted words, missing text-layout rule. Click a highlight to apply its fix. Right now the rewrite is a separate block.
- **One-click partial fixes.** Let users accept the rewrite dimension by dimension instead of all or nothing.
- **Critique after generation.** V5 validation already compares output to intent. Expose a "Why does my image not match?" critique that pairs the prompt score with validation findings. shapes.inc's Image Rater shows demand for image-side feedback, and nobody joins the two.
- **Positioning and SEO.** With PromptPerfect gone and no first-party rival, give Critique its own landing page (for example, "Image prompt grader") and consider leading the hero with it. Make rubric explanations indexable.

### 5. Results and iteration

- Competitors converge on **hover actions** on each result: Vary, Upscale, Use prompt, Use image, Use style (Midjourney), and Firefly's "use as composition or style reference". Depikt has editing (mask), series, and repair, but should expose **Use as reference** and **Critique this prompt** directly on each result tile.
- **Multi-up vs single.** Every major generator returns 2–8 images per run, and Midjourney adds a cheap Draft mode. Depikt's single-image, one-credit flow relies on grounding and repair to land the first try. Either communicate that clearly ("checked and repaired, not a lottery"), or offer a low-cost exploratory mode. The model router could pick the faster model for drafts.

### 6. Library

| Pattern | Who | Depikt |
|---|---|---|
| Every prompt paired with its real result | PromptBase (review team reproduces examples), open GPT Image 2 galleries | **Strong.** Tested thumbnails; `approved` vs `gallery_ready` are reviewed separately |
| Copy or remix in one click from the grid | Midjourney Explore hover, Lexica, Civitai Remix | "Use this prompt" fills the creator without submitting (good); it goes through the dialog |
| Reverse image search, "similar" | Lexica, Midjourney Explore | Missing |
| Describe (image → prompt) | Midjourney `/describe` (4 options), Ideogram | Partial (reference analysis inside Build) |
| Community submissions | PromptHero, Civitai | Intentionally absent; curation is a trust advantage |
| Distribution via open repo plus agent skill | awesome-gpt-image-2 (about 7.3k stars), wuyoscar skill | MCP exists; no public repo or skill |

**Recommendations**
1. Add a hover "Use prompt" button to Library cards.
2. Add "More like this" using categories and tags, before any embedding work.
3. Ship a standalone **Describe** entry point: upload an image to get three prompt options, then Improve or Critique one.
4. Publish a lightweight open "Depikt prompt skill" that calls the MCP. Competing galleries get significant distribution this way.

## Architecture comparison

### Depikt today

```
Browser (TanStack Start / React 19, Radix, Tailwind 4, Dexie for favorites/history)
  │  SSE (structured partial JSON)            │  REST + polling
  ▼                                           ▼
Cloudflare Worker (TanStack server routes)
  ├─ /api/public/generate-prompt  → Intent (gpt-6-luna) → playbook → Writer (stream)
  ├─ /api/public/critique-prompt  → Critic (gpt-6.1-sol) → deterministic score + caps
  ├─ /api/generation/jobs         → plan, credit reserve, idempotency key
  ├─ /api/generation/jobs/:id/run → browser-held long request: claim → grounding (V4)
  │                                 → OpenAI image → validation/repair (V5) → storage
  └─ /mcp                          → 6 read-only discovery tools
Supabase: Postgres (RLS, owner-scoped entities), Storage (private, signed URLs), Auth
Kill switches: GENERATION_ENABLED, GROUNDING_ENABLED, VALIDATION_REPAIR_ENABLED (runtime vars)
```

### Assessment against market patterns

| Area | Depikt | Market pattern | Verdict and recommendation |
|---|---|---|---|
| Job execution | Browser opens `/run` and the Worker does the work inside that request; the client polls. Atomic claim, stale-job recovery, refunds. | Queue-backed workers with webhooks or streaming *(inferred for all; Ideogram, Leonardo, and Krea APIs expose async jobs)* | **Fragile.** Work depends on a client-initiated request staying alive. Cloudflare may cancel a Worker when the client disconnects, so closing the tab mid-run relies on stale-job cleanup. **Move to Cloudflare Queues or Workflows** (durable steps fit grounding → generate → validate → repair) **or a Durable Object per session.** This also lets you run parallel generations, as ChatGPT now does. |
| Progress feedback | Polling | Real-time streaming (Krea), parallel queues (ChatGPT) | Once jobs are durable, push status via SSE or a WebSocket from a Durable Object instead of polling. |
| Prompt engine | Two-stage intent → writer with category playbooks; deterministic critic scoring; versioned (`PROMPT_VERSION`); benchmark harness | Single LLM rewrite (Magic Prompt) *(inferred)* | **Ahead.** Keep the deterministic scoring and benchmarks. Expose `PROMPT_VERSION` in history for reproducibility. |
| Model strategy | OpenAI only; deterministic router hides model choice | Aggregators (Krea 60+, Leonardo, Freepik, Firefly partners) | **Defensible for the current audience**: Midjourney and ChatGPT also hide choice. `openai-images.ts` is a natural seam if a second provider is ever needed. The risk is concentration: OpenAI pricing or policy changes hit Depikt directly. |
| Verification layer | Grounding plus validation and auto-repair | Not offered by any competitor | **Differentiator.** Surface it in the UX (see Composer). |
| Rate limiting | In-memory, per isolate | Centralised *(inferred)* | **Weak.** Not shared across Workers. Use two layers: the Workers Rate Limiting binding for **burst protection only** (it is enforced per Cloudflare location, not globally strict), plus an **atomic, account-level quota in Supabase** for free daily allowances and spend limits. |
| User data | Favorites and history in IndexedDB; creations server-side | Server-side, cross-device | Sync favorites and history to Supabase for signed-in users. Today a user's library does not follow them across devices. |
| Public API | None (MCP is read-only) | Ideogram, Leonardo, Krea, Recraft, OpenAI | Add write-capable MCP tools first (`improve_prompt`, `critique_prompt`) behind auth and credits. That is the cheapest "API" and fits the agent-distribution trend. |
| Front-end weight | 2.41 MB main bundle (F17) | Unknown (stack not fetchable) | Code-split Generate and Account more aggressively; the creator is above the fold on Home. |
| Pricing model | $19.99 for 40 credits (Pro), $39.99 for 100 (Max), 5 starter credits, packs | Free daily allowances; 4-up runs; per-image API costs of about $0.03–0.09 | **Validate before changing.** Model cost per settled generation (including grounding, validation, and repair), and compare competitors on resolution, quality, and rights. Any free Improve and Critique allowance waits for global quota enforcement. |

## Prioritised recommendations (original — superseded by Review decisions)

| # | Change | Type | Effort | Impact |
|---|---|---|---|---|
| 1 | Durable generation via Cloudflare Queues or Workflows; push progress | Architecture | M–L | Reliability, parallel runs |
| 2 | Inline Enhance (Off/Auto/On) in the Generate composer, with original-vs-enhanced on results | UX | M | Brings the Builder's value into the main flow |
| 3 | Show credit value ("includes check and one free repair") and a clear free tier for Improve and Critique | UX/business | S | Conversion |
| 4 | In-place Critique annotations, per-dimension apply, and a dedicated Critique landing page | UX/SEO | M | Strengthens the moat |
| 5 | Creations as a top-level surface; result-tile actions (Use as reference, Critique prompt) | UX | M | Iteration loop |
| 6 | Visible, overridable reference-role chips; pin reference | UX | S–M | Control and trust |
| 7 | Library hover "Use prompt", "More like this", standalone Describe | UX | S–M | Discovery → create |
| 8 | Centralised rate limiting; sync favorites and history | Architecture | S–M | Correctness, cross-device |
| 9 | Write-capable MCP tools plus an open agent skill | Distribution | M | Agent channel |
| 10 | Low-cost draft or multi-up mode (router chooses the fast model) | Product | M | Matches market expectation |

## What not to copy

- Node graphs and infinite canvases (Krea, Freepik Spaces, Recraft, Firefly Boards): reviewers call them overwhelming for text-to-image users.
- Exposing model pickers with per-model pricing: it adds a decision Depikt deliberately removed (`model-router.ts`).
- Community-submitted prompts without review: PromptHero and Civitai suffer inconsistent quality and missing metadata. Depikt's reviewed `approved` flow is a trust asset.
- Chat-as-the-only-interface (ChatGPT): reviewers report ambiguous edit targets and libraries tied to conversations.

## Sources (selection)

- Midjourney: docs.midjourney.com (Explore, Style Reference, `/shorten`, `/describe`); vidmuse.ai/blog/midjourney-8-2; unifically.com/blogs/midjourney-api
- Ideogram: docs.ideogram.ai (Magic Prompt, Prompting Guide, Canvas, Reference features); about.ideogram.ai/character
- Leonardo: intercom.help/leonardo-ai (Image Guidance, prompt writing); leonardo.ai/news
- Krea: krea.ai/release-notes; docs.krea.ai/image-generation; krea.ai/features/api
- Firefly: helpx.adobe.com/firefly (Text to Image, Boards, partner models)
- Freepik: freepik.com/ai/docs (style, models, nodes and connectors)
- Recraft: recraft.ai/llms-full.txt; recraft.ai/blog
- ChatGPT Images: tomsguide.com (Image Library); storyboard18.com (Images section); buildfastwithai.com (Images 2.0)
- Prompt tools: promptbase.com/prompt-guidelines; developer.civitai.com; promptessor.com/methodology; gptprompts.ai/prompt-checker; shapes.inc/aiimagerater; github.com/freestylefly/awesome-gpt-image-2
- Market changes: promptbuilder.cc (PromptPerfect shutdown); testingcatalog.com (ImageFX and Whisk → Flow)

## Review decisions (2026-10-31)

Depikt should not compete on model count, image volume, or editing depth. Its proposition is one guided workflow: **write → improve → critique → generate → verify → refine.**

### Revised priorities

| Priority | Work | Why |
|---|---|---|
| P0 | Durable image generation (Cloudflare Workflows) | Prevent interrupted jobs, lost progress, and incorrect credit settlement |
| P0 | Global quota enforcement and usage metrics | Protect costs before any free usage increases |
| P1 | Inline Enhance (Off/Auto/On) and credit messaging | Make existing capabilities discoverable |
| P1 | Critique visibility and quality evaluation | Prove the differentiator delivers measurable value |
| P2 | Dedicated Creations page and result actions | Repeat-generation experience |
| P3 | Reference roles, Describe, Library discovery, write-capable MCP | Only after the primary workflow works well |

**Next milestone: Depikt V1, Reliable Generation and Clear Value.** It is complete when all of these hold:

- generation survives closing or reloading the browser
- retries never double-charge or duplicate images
- credits settle correctly on success, failure, and unknown provider outcomes
- the UI states what each paid generation includes

### Deliberately not doing yet

A multi-model selector, a 24-image draft system, unlimited free critiques, a canvas, a prompt-agent ecosystem, and publishing this internal audit. A public competitive page would be a separate, sanitised document.

### Critique evaluation before more Critique UI

Before building word-level annotations, run a controlled benchmark on a representative prompt set comparing three arms:

1. the original prompt
2. Depikt's rewrite
3. at least one competing enhancement approach

Measure human-rated instruction fidelity, image quality, and prompt adherence, and test whether the rubric score predicts a better final image. Moving Critique into homepage messaging can happen now; it does not depend on this result.

Implementation plan: `docs/plans/2026-10-31-v1-reliable-generation-and-redesign.md`.
