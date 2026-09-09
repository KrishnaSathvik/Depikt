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

## RLS Constraints

- Anon key can **SELECT** but **NOT INSERT/UPDATE** on `curated_prompts`
- `fetchCurated` falls back to the pre-`target_model` column list if the migration has not been applied (rows then read as `gpt-image-2`)
- All writes to `curated_prompts` must go through Supabase SQL Editor
- No service role key in `.env`
- Storage uploads work with anon key, but `thumbnail_url` DB updates do not

## Design System (Images 2.5 refresh, September 2026)

- All colors, radii, shadows, and type sizes are CSS variables in `src/styles.css`. Monochrome: white paper (`--bg`), a short gray ladder (`--bg-subtle`, `--bg-muted`), near-black ink (`--text-primary`, `--accent`), hairline borders. No cream/beige tokens; do not reintroduce raw hex in components.
- `.ink` is the one dark surface: prompt output blocks, the footer, and emphasis CTAs. Use `--ink-*` tokens inside it; `Button variant="inverse"` sits on it.
- Typography scale: `.text-display-*`, `.text-heading-*`, `.text-body-*`, `.eyebrow` (mono uppercase label). Display and heading weights are 500; do not bold for emphasis.
- Chips use `.pill`; the selected state is `.pill-solid`. Cards are hairline-bordered `gap-px` grids, not shadowed boxes.
- Shared chrome: `Header` (nav underline active state), `Footer` (ink band, every route), `AnnouncementBar` (driven by `ANNOUNCEMENT` in `src/lib/product.ts`; flip `active` or set `until` to retire it, change `id` for a new announcement).
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
