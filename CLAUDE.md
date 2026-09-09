# Pixelary/Depikt — Claude Code Instructions

## Product (V1, ChatGPT Images 2.5 migration)

Depikt is a **reference library and prompt workspace for ChatGPT Images**. It writes and reviews prompts; it does **not** generate images (that is a future V2). Do not add image-generation API calls, "Generate Image" buttons, credits, generated-image storage, or model selectors.

| Visible name | Route (frozen) | Internal identifiers (keep) |
|---|---|---|
| Library | `/library` | `curated_prompts` table, `target_model` column |
| Prompt Builder | `/generate` | route file `generate.tsx`, API `/api/public/generate-prompt`, history `kind: "generate"` |
| Prompt Critic | `/critique` | route file `critique.tsx`, API `/api/public/critique-prompt`, mode `CRITIQUE`, history `kind: "critique"` |
| Gallery | `/gallery` | |
| Blog | `/blog` | |

- Visible copy: "Prompt Builder" / "Build Prompt", "Prompt Critic" / "Critique Prompt". Never "generator", "Generate prompt", or "image generator" in current product UI or metadata. All shared labels, SEO strings, and JSON-LD names live in `src/lib/product.ts`; tests read the same source.
- The current Builder and Critic target **ChatGPT Images 2.5**. The 500-prompt library is the **GPT Image 2 collection** (`target_model = 'gpt-image-2'`), kept byte-for-byte; do not relabel it as Images 2.5 and do not create placeholder Images 2.5 rows. `src/lib/target-model.ts` holds the model vocabulary; the Library shows a collection filter only when a second collection has real rows.
- **One library, two collections.** Images 2.5 entries live in `src/data/images-2-5-staged.ts` with provenance and review metadata (`src/lib/library-metadata.ts`: `source_type`, `status`, `reference_mode`, `generation_ready`, `gallery_ready`). Only `status = 'approved'` rows are public; `fetchLibrary` merges approved staged rows (23 as of 2026-09-09) and hides non-approved DB rows. Result images are `public/library/images-2-5/<slug>.webp`; every attempt, setup image, fixture and log is under `research/images-2-5-community/runs/`. Generation runs outside the product with `node scripts/images-2-5-run.ts` (needs `OPENAI_API_KEY`). Promotion: run → review → set status and `outcome_notes` in the TS file → `node scripts/export-staged-images-2-5.ts` (approved rows only) → run the upsert SQL → verify counts. The provenance migration is already applied in production; do not re-run it. Supabase is the approved library and DB rows win over staged rows on id, so staging is for work in progress. `approved` and `gallery_ready` are decided separately: a prompt can be a good recipe while its example image is not strong enough to promote. Never mark a record approved without a reviewed result. Library counts come from `LIBRARY_PROMPT_COUNT` in `src/lib/product.ts`.
- Historical blog posts and templates about GPT Image 2 stay historically accurate; only index-level product copy and generic CTAs were migrated.
- Reference images do not transfer to Imago; the UI shows a re-attach note when `reference_intent != none` and an image exists (`needsReferenceReattach`).
- Model routing is locked: Intent + Builder = gpt-5.6-luna (reasoning none, writer temp 0.7); Critic = gpt-5.6-terra (reasoning medium); GPT-6 Astra offline evaluation only.

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server (Vite) |
| `npm run build` | Production build (Cloudflare Workers) |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier format |
| `npm test` | Unit tests (Node built-in runner, `tests/unit/**`) |
| `npm run typecheck` | `tsc` for `src` and `tests` |
| `npm run bench -- --config v3-luna --filter <id|group>` | Prompt-engine benchmark (needs `OPENAI_API_KEY`; results in git-ignored `benchmark-results/`) |

## Tech Stack

TanStack Start (React 19) + Vite 7 + Tailwind CSS 4 + Radix UI (shadcn pattern)
Deployed to Cloudflare Workers. Supabase for DB + Storage. OpenAI for generation.
Local state: Dexie IndexedDB (favorites, history). No test framework.

## Architecture

```
src/
  routes/         # TanStack file-based routing (library, generate, gallery, critique, blog)
  components/     # React components (ui/ = shadcn/Radix primitives)
  lib/            # Utilities, contexts, DB, SSE, image processing
  lib/prompt-engine/  # Images 2.5 engine: intent.ts, builder.ts, critic.ts, playbooks/, reference.ts
  lib/product.ts      # Visible names, CTAs, SEO strings, JSON-LD names, Imago re-attach rule
  lib/target-model.ts # gpt-image-2 / gpt-image-2.5 vocabulary and collection helpers
  data/           # Auto-generated curated-prompts.ts, gallery-images.ts
  integrations/   # Supabase client (auto-generated)
  hooks/          # Custom React hooks
  types/          # TypeScript type definitions
scripts/          # Thumbnail generation, DB sync, batch helpers
supabase/         # Migration files, batch SQL scripts
public/gallery/   # Gallery images served statically
```

## Adding New Prompts (Batch Workflow)

When user sends new prompts, follow these steps in order:

1. Categorize & add to `src/data/curated-prompts.ts` — id, title, category, tags, user_input, prompt, why_it_works
2. Update `scripts/generate-thumbnails.mjs`:
   - **SKIP_IDS** — prompts that need an input image (image-edit type)
   - **PLACEHOLDER_FILLS** — substitute `[insert date]`, `[BRAND NAME]`, etc. for thumbnail generation
   - **PROMPT_OVERRIDES** — full prompt rewrites for copyright-sensitive or brand-heavy prompts
3. Create `supabase/insert-batch{N}-prompts.sql` with `ON CONFLICT (id) DO NOTHING` (set `target_model` explicitly: `'gpt-image-2'` for legacy-style additions, `'gpt-image-2.5'` for the future Images 2.5 collection)
4. **User runs INSERT SQL** in Supabase SQL Editor (anon key can't write due to RLS)
5. Generate thumbnails: `node scripts/generate-thumbnails.mjs`
6. Upload to Supabase Storage: `node scripts/generate-thumbnails.mjs --upload`
7. Create `supabase/update-batch{N}-thumbnails.sql` (anon key can't UPDATE — needs SQL Editor)
8. **User runs UPDATE SQL** in Supabase SQL Editor
9. Sync TS file from DB: `node scripts/sync-curated-prompts.mjs`
10. Restart dev server to clear SSR module-level cache (`_libraryCache`)
11. Update prompt count in UI copy if needed (`src/routes/library.tsx`, `src/routes/__root.tsx`)

## Adding Gallery Images

1. User drops images into `public/gallery/`
2. Update `src/data/gallery-images.ts` with new filenames

## Key Files

| File | Purpose |
|------|---------|
| `src/data/curated-prompts.ts` | All curated prompts (auto-generated by sync script — don't edit manually) |
| `src/data/gallery-images.ts` | Gallery image filename list |
| `scripts/generate-thumbnails.mjs` | GPT Image 2 thumbnail generator + Supabase Storage uploader |
| `scripts/sync-curated-prompts.mjs` | Pulls prompts from Supabase DB → writes TS file |
| `src/lib/library.ts` | Fetches library from Supabase; has module-level `_libraryCache` |
| `src/routes/library.tsx` | Library page; TanStack Router loader with 5min staleTime |
| `src/lib/depikt.ts` | Legacy category/mode constants still used for API allowlists |
| `src/lib/prompt-engine/builder.ts` | Prompt Builder pipeline (intent → playbook → writer) and CORE_RULES |
| `src/lib/prompt-engine/critic.ts` | Prompt Critic pipeline, rubric, essential-dimension cap |
| `src/routes/api/public/generate-prompt.ts` | Prompt Builder API route (SSE) |
| `src/routes/api/public/critique-prompt.ts` | Prompt Critic API route (SSE) |
| `supabase/migrations/20260908120000_add_target_model_to_curated_prompts.sql` | Adds `target_model` (default/backfill `gpt-image-2`) |
| `supabase/migrations/20260909120000_add_prompt_provenance_to_curated_prompts.sql` | Adds slug, source_type, status, reference_mode, generation/gallery flags, review_notes |
| `src/data/images-2-5-staged.ts` | Staged Images 2.5 records (batch 1: 24) with review guidance and setup prompts |
| `src/lib/library-metadata.ts` | Status / source / reference vocabularies, public filter, model/status/source filters |
| `scripts/export-staged-images-2-5.ts` | Writes `supabase/insert-images-2-5-batch1-staged.sql` from the staged records |
| `scripts/images-2-5-run.ts` | Images 2.5 generation runner (setup / run / fixture) with per-record logs |

## RLS Constraints

- Anon key can **SELECT** but **NOT INSERT/UPDATE** on `curated_prompts`
- `fetchCurated` falls back to the pre-`target_model` column list if the migration has not been applied (rows then read as `gpt-image-2`)
- All writes to `curated_prompts` must go through Supabase SQL Editor
- No service role key in `.env`
- Storage uploads work with anon key, but `thumbnail_url` DB updates do not

## Design System (Images 2.5 refresh, September 2026)

- White is the canvas, black is the ink. All colors, radii, shadows, and type sizes are CSS variables in `src/styles.css`: pure white `--bg`, `--bg-subtle` #F7F7F7 used sparingly, ink `--text-primary`/`--accent` #111, opaque hairline borders. No cream/beige tokens; do not reintroduce raw hex in components.
- Black is for text, primary buttons, active states, and icons only. Never use it as a large content surface (no dark prompt blocks, footer, or panels).
- `PromptSurface` (`src/components/PromptSurface.tsx`) is the one visual treatment for a prompt: light, bordered, mono body, small label + actions header. Used by the homepage example, Builder output, Critic rewrite, Library dialog, templates, and blog fenced blocks (the fence info string becomes the label: ```before / ```after).
- Typography scale: `.text-display-*`, `.text-heading-*`, `.text-body-*`; `.eyebrow` is a 13px sans label, `.label-mono` is reserved for data. Display and heading weights are 500.
- Copy rule: the announcement owns the launch moment, the blog owns Images 2.5 detail, the Library owns the GPT Image 2 collection label. Product chrome (header, hero, Builder, Critic, footer) does not repeat the model name or V1 scope disclaimers.
- Shared chrome: `Header`, `Footer` (white, hairline, one line), `AnnouncementBar` (driven by `ANNOUNCEMENT` in `src/lib/product.ts`; flip `active` or set `until` to retire it, change `id` for a new announcement).
- Blog: `getPostsByDate()` and `getLatestGuides()` in `src/data/posts.ts` drive ordering; the homepage never uses array order. Posts in the `Images 2.5` category are the current-model set. Historical GPT Image 2 posts keep their model claims (guarded by `tests/unit/product-phase3.test.ts`). The markdown renderer supports `![alt](src "caption")` figures.

## Code Style

- Path alias: `@/*` → `./src/*`
- Prettier: double quotes, semicolons, trailing commas, 100 char width
- ESLint: flat config (v9), unused vars allowed (`@typescript-eslint/no-unused-vars: off`)
- `cn()` from `@/lib/utils` for className merging (clsx + tailwind-merge)

## Navigation

- Desktop: centered nav links in header
- Mobile: scrollable tab row below header (no hamburger, no bottom bar)
- Labels: Library · Prompt Builder · Prompt Critic · Gallery · Blog (from `NAV_ITEMS` in `src/lib/product.ts`)
- Icons: LayoutGrid (Library), Wand2 (Prompt Builder), MessageSquare (Prompt Critic)

## UI Patterns

- Gallery lightbox: Radix Dialog with "Use as reference" button
- Close button: 32px circular `bg-black/60` for mobile visibility
- Library cards: always-visible "View prompt" indicator (no hover-only)

## Gotchas

- **Vite config**: `@lovable.dev/vite-tanstack-config` provides base config — do NOT add plugins manually (tanstackStart, viteReact, tailwindcss, cloudflare, etc. already included)
- **Rate limiting**: In-memory, per-instance — not distributed across Workers
- **Auth UI removed**: Login/signup routes redirect home. Auth plumbing (context, Supabase auth) kept for Phase 2
- **Local data**: Favorites and history stored in IndexedDB via Dexie (not server-side)
- **Image preprocessing**: Client resizes to max 1024px, JPEG 0.8 quality, 2MB base64 cap
- **SSR cache**: After DB changes, restart dev server to clear `_libraryCache`. Use incognito to bypass TanStack Router's client-side staleTime cache
