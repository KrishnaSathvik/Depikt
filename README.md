# Depikt

**Discover · Build · Create**

Depikt is a library, prompt workspace, and image generator for ChatGPT Images. Browse curated prompts, build or critique your own, generate and edit images from a prompt and references, and take the same library into ChatGPT or Claude through MCP.

**Live at [www.depikt.app](https://www.depikt.app)**

The canonical host is `www.depikt.app`. `depikt.app` redirects there.

## Product

Header: Library · Generate · Gallery · Templates · Blog. MCP, Help, and Pricing live in the footer.

### Library (`/library`)

543 curated prompts: 500 GPT Image 2 examples kept as written, plus 43 reviewed ChatGPT Images 2.5 recipes. Each entry has a sample image, the full prompt, and a short note on why it works. Remix into Prompt, or generate from it directly.

### Prompt (`/prompt`)

One workspace with three modes. They stay mounted so each keeps its own draft. `/generate` and `/critique` 301 here.

| Mode | URL | What it does |
|------|-----|----------------|
| Generate | `/prompt?mode=generate` | Create and edit images from a prompt and optional references. Aspect ratio is resolved from the prompt. Routing between GPT Image 2.5 Flare and Sunburst is internal — there is no model, quality, or size picker. Edit, regenerate, and keep versions. |
| Build | `/prompt?mode=build` | Turn an idea or reference into a structured image prompt. |
| Critique | `/prompt?mode=critique` | Score an existing prompt, name what is weak, and return a rewrite. |

Build and Critique still produce a plain prompt you can copy. Generate is the step after, when you want the image inside Depikt.

### Gallery (`/gallery`)

Hand-picked reference images. Use one as a reference in Build, or generate with it directly.

### Templates (`/templates`)

30 reusable, model-neutral structures for common image jobs (create, layout, edit, references, brand). Fill in the fields and continue in Build.

### Blog (`/blog`)

Field notes: Images 2.5 guides, historical GPT Image 2 posts (kept as written), prompting technique, and product updates.

### MCP (`/integrations/mcp`)

Public, read-only tools for MCP-compatible assistants. Endpoint: `https://www.depikt.app/mcp`.

- `search_prompts` / `get_prompt`
- `list_templates` / `get_template`
- `search_guides` / `get_guide`

MCP only exposes published Library prompts, templates, and guides. No accounts, drafts, or image generation.

## Accounts and credits

Browsing, Build, and Critique do not require an account. Generate does.

Sign in with email (magic link) or Google, Apple, Microsoft, or Lovable. A new account gets **5 starter image credits**. 1 credit = 1 successful generate, edit, or regenerate.

| Plan | Credits | Price |
|------|---------|-------|
| Free | 5 starter (one-time) | $0 |
| Pro | 40 / month | $19.99/mo or $199/yr |
| Max | 100 / month | $39.99/mo or $399/yr |

Credit packs (10 / 25 / 50) never expire while the account exists. Creations, plan, and credits live on the account hub. Favorites and Build/Critique history stay on-device (IndexedDB).

## Pages

| Page | Notes |
|------|-------|
| [Home](https://www.depikt.app/) | Product story and latest guides |
| [Library](https://www.depikt.app/library) | 543 curated prompts |
| [Generate](https://www.depikt.app/prompt?mode=generate) | Canonical workspace URL is `/prompt` |
| [Gallery](https://www.depikt.app/gallery) | Reference images |
| [Templates](https://www.depikt.app/templates) | Task structures |
| [Blog](https://www.depikt.app/blog) | Field notes |
| [MCP](https://www.depikt.app/integrations/mcp) | Connect an assistant |
| [Pricing](https://www.depikt.app/pricing) | Free, Pro, Max, packs |
| [Help](https://www.depikt.app/help) | How Depikt works |
| [Sign in](https://www.depikt.app/sign-in) / [Sign up](https://www.depikt.app/sign-up) | `noindex` |
| [Privacy](https://www.depikt.app/privacy) / [Terms](https://www.depikt.app/terms) | Legal |

`/sitemap.xml` and `/robots.txt` list the public pages on `https://www.depikt.app`. Account, favorites, and history are not in the sitemap.

## Development

```bash
npm install
npm run dev          # Vite — http://localhost:8080/
npm test             # unit tests (Node test runner)
npm run typecheck    # tsc for src and tests
npm run lint
npm run build        # production build (Cloudflare Workers)
npm run bench -- --config v3-luna --filter reference   # prompt-engine subset (needs OPENAI_API_KEY)
```

Copy `.env.example` to `.env.local`. OpenAI, Supabase, and Stripe keys are required for generation, the library, and billing. There is no service-role key in the browser; curated-prompt writes go through the Supabase SQL Editor.

Shared product copy, routes, and SEO strings live in `src/lib/product.ts`. Canonical URLs come from `src/lib/site.ts` (`www.depikt.app`). The prompt engine is in `src/lib/prompt-engine/`. Generation is in `src/lib/generation/`. MCP tools are in `src/lib/mcp/`.

## Built with

React 19, TanStack Start, Vite 7, Tailwind CSS 4, Radix UI, Supabase, Stripe, OpenAI, Dexie, Cloudflare Workers.

## License

Private project.
