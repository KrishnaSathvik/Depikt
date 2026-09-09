# Depikt

**Learn what works. Build what you want.**

Depikt is a reference library and prompt workspace for ChatGPT Images. Describe what you want, or attach a reference image, and the **Prompt Builder** writes a precise prompt for ChatGPT Images 2.5. Paste an existing prompt into the **Prompt Critic** to find what is weakening it. Browse the **Library** of 500 curated GPT Image 2 prompt examples to learn from and remix. No account required.

Depikt writes and reviews prompts. It does not generate images: you take the prompt to ChatGPT (the "Open in Imago" button copies it for you).

**Live at [depikt.app](https://depikt.app)**

## What you can do

### Prompt Builder (`/generate`)
Rough idea or reference image → intent analysis → Prompt Builder → Images 2.5-ready prompt.

1. **Intent analysis.** A short structured pass works out the task (create, edit, series, remix), the deliverable category, how an attached reference should be used (style, subject/identity, edit source, product, composition, sketch/layout), the aspect ratio (only when the user gave one or the format implies it), exact text to render, series counts, and facts that are missing and must become placeholders. Explicit user choices always win over the analysis.
2. **Prompt writing.** The writer receives the confirmed intent, a short category playbook, and reference guidance, and streams one prompt plus a short "why this works" note. Reference-dependent prompts address "the attached reference image" explicitly, because the user re-attaches the same image in ChatGPT.
3. **Handoff.** Copy the prompt or open it in Imago. When the prompt depends on a reference image, the UI reminds you to attach the same image there.

### Prompt Critic (`/critique`)
Prompt (+ optional source/reference image) → Images 2.5 rubric → dimensional feedback → improved prompt.

Ten dimensions: intent fidelity, clarity, contradictions, composition control, reference handling, edit preservation, text and layout, style coherence, factual integrity, efficiency. Dimensions that do not apply are skipped, not zeroed. Essential dimensions cap the overall score when they fail (for example a bare edit request that never says what to preserve). The Critic returns a summary, the breakdown, weaknesses, concrete improvements, and a rewritten prompt.

### Library (`/library`)
500 curated prompts across 10 categories, each with a thumbnail and a "why it works" note. This is the **GPT Image 2 collection**: the prompts are kept exactly as written. Each prompt carries a `target_model` (`gpt-image-2` today) so a separate ChatGPT Images 2.5 collection can be added later without touching the existing rows. The collection filter appears automatically once a second collection exists.

### Reference Gallery (`/gallery`)
Hand-picked reference images. Send any of them to the Prompt Builder as a reference and choose how it is used.

### Favorites and history
Favorites and every Builder or Critic result are stored in the browser (IndexedDB). Restore any past result, including its reference image when it fit the storage budget.

## Pages

| Page | What it does |
|------|-------------|
| [/library](https://depikt.app/library) | Browse and search the 500-prompt GPT Image 2 collection |
| [/generate](https://depikt.app/generate) | Prompt Builder for ChatGPT Images 2.5 |
| [/critique](https://depikt.app/critique) | Prompt Critic for ChatGPT Images 2.5 |
| [/gallery](https://depikt.app/gallery) | Reference images you can send to the Prompt Builder |
| [/blog](https://depikt.app/blog) | Articles on prompting for image models (older posts are about GPT Image 2 and are kept as written) |

The `/generate` and `/critique` URLs are kept for compatibility and SEO; the visible tool names are Prompt Builder and Prompt Critic.

## Prompt categories

Cinematic Scene · Poster / Cover · Infographic / Diagram · UI Mockup · Social Post / Ad · Storyboard / Multi-panel · Interior / Food / Fashion / Product · Visual Summary · Image Edit · Open-Ended Creative

## Development

```bash
npm install
npm run dev          # Vite dev server
npm test             # unit tests (Node test runner)
npm run typecheck    # tsc for src and tests
npm run build        # production build (Cloudflare Workers)
npm run bench -- --config v3-luna --filter reference   # prompt-engine benchmark subset (needs OPENAI_API_KEY)
```

The prompt engine lives in `src/lib/prompt-engine/` (intent analyzer, builder, critic, playbooks, reference guidance). Benchmarks and their cases live in `tests/bench/`.

## Built with

React 19, TanStack Start, Vite, Tailwind CSS 4, Radix UI, Supabase, OpenAI (Responses API), deployed on Cloudflare Workers.

## License

Private project.
