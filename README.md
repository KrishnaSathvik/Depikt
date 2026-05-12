# Depikt

**Turn rough ideas into production-grade image prompts.**

Depikt is a free prompt tool for AI image generation. Type a rough idea — "poster for a coffee brand" — and get back a structured, copy-ready prompt optimized for GPT Image 2. No account required.

**Live at [depikt.app](https://depikt.app)**

## What you can do

### Generate prompts
Paste a rough idea and Depikt builds a polished prompt with aspect ratio, lighting, composition, materials, and style direction — all the details that make AI image models produce better output. It auto-detects the category (poster, cinematic scene, product shot, infographic, storyboard, etc.) and applies the right structural template.

### Browse 500 curated prompts
A library of production-grade prompts across 10 categories, each with an example thumbnail showing what it produces. Copy any prompt directly or remix it into something new.

### Critique existing prompts
Paste any prompt and get a 1–10 score, specific weaknesses, and a fully rewritten version with all improvements applied. Good for learning what makes a prompt work.

### Use reference images
Upload or drag an image as a style reference. Depikt extracts the visual style (palette, lighting, composition, medium) and weaves it into your generated prompt.

### Save favorites and history
Favorite any prompt from the library to save it locally. Every prompt you generate or critique is saved to your history — revisit and restore past results anytime. All stored in-browser via IndexedDB, no account needed.

### Open in Imago
Every generated prompt includes a one-click button to open [Imago](https://chatgpt.com/g/g-69e7de729cb48191a6aa83ec3af8a6cb-imago) (a GPT that generates images) with your prompt already copied.

## How it works

1. You type a rough idea
2. Depikt classifies it into one of 10 categories (cinematic, poster, infographic, UI mockup, storyboard, etc.)
3. It applies a category-specific structural template with 5–8 concrete constraints
4. You get back a polished prompt ready to paste into ChatGPT, the OpenAI API, or fal.ai

The prompt engine replaces vague adjectives ("stunning," "beautiful") with observable physical detail — lens specs, lighting direction, material textures, cultural anchors. It also handles aspect ratio locking, text-in-image rendering, multi-page storyboards, and image edit instructions.

## Pages

| Page | What it does |
|------|-------------|
| [/library](https://depikt.app/library) | Browse and search 400+ curated prompts with thumbnails |
| [/generate](https://depikt.app/generate) | Turn a rough idea into a polished prompt |
| [/critique](https://depikt.app/critique) | Score and rewrite an existing prompt |
| [/gallery](https://depikt.app/gallery) | Gallery of AI-generated images (use any as a style reference) |
| [/blog](https://depikt.app/blog) | Articles on prompt engineering for image generation |

## Prompt categories

- Cinematic Scene
- Poster / Cover
- Infographic / Diagram
- UI Mockup
- Social Post / Ad
- Storyboard / Multi-panel
- Interior / Food / Fashion
- Visual Summary
- Image Edit
- Open-Ended Creative

## Built with

React 19, TanStack Start, Vite, Tailwind CSS 4, Radix UI, Supabase, OpenAI, deployed on Cloudflare Workers.

## License

Private project.
