// Locked SEO contract (titles, descriptions, OG, robots). Change product.ts
// only when the product itself changes — not to chase keywords.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SEO } from "../../src/lib/product.ts";
import { pageSeoHead } from "../../src/lib/seo.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const MODEL_KEYWORD = /GPT|OpenAI|Images 2\.5|GPT Image 2/i;

test("locked core page SEO titles, descriptions, OG, and robots", () => {
  const expected = {
    home: {
      title: "AI Image Prompt Library & Generator | Depikt",
      description:
        "Discover image prompts, build or critique your own, and generate images from prompts and references with Depikt.",
      ogTitle: "Ideas into images. Better.",
      ogDescription: "Discover prompts, improve them, and create images from one place.",
      robots: "index, follow",
    },
    library: {
      title: "AI Image Prompt Library | Depikt",
      description:
        "Browse curated AI image prompts by style, category, and use case. Search, save, and reuse prompts for your next image.",
      ogTitle: "Explore the Depikt Prompt Library",
      ogDescription: "Find a prompt, make it yours, and start creating.",
      robots: "index, follow",
    },
    promptGenerate: {
      title: "AI Image Generator | Depikt",
      description: "Create and edit images from prompts and references with Depikt.",
      ogTitle: "Generate with Depikt",
      ogDescription: "Turn a prompt and reference into an image.",
      robots: "index, follow",
    },
    gallery: {
      title: "AI Image Gallery & Inspiration | Depikt",
      description:
        "Explore images created with Depikt and discover prompts, styles, and ideas for your next generation.",
      ogTitle: "Made with Depikt",
      ogDescription: "Explore generated images, prompts, styles, and creative directions.",
      robots: "index, follow",
    },
    templates: {
      title: "AI Image Prompt Templates | Depikt",
      description:
        "Start faster with reusable AI image prompt templates for photography, products, design, illustration, and more.",
      ogTitle: "Start with a better prompt",
      ogDescription: "Reusable prompt templates for the images you want to create.",
      robots: "index, follow",
    },
    blog: {
      title: "AI Image Generation Guides & Prompting Tips | Depikt",
      description:
        "Learn image prompting, creative workflows, reference-image techniques, and practical ways to get better AI-generated images.",
      ogTitle: "Learn to create better images",
      ogDescription: "Guides, experiments, prompting techniques, and practical creative workflows.",
      robots: "index, follow",
    },
    mcp: {
      title: "Depikt MCP Integration | Connect Your AI Tools",
      description:
        "Connect Depikt to MCP-compatible AI tools and bring Depikt's image-prompt library into your workflow.",
      ogTitle: "Depikt, wherever you work",
      ogDescription: "Bring the Depikt prompt library into MCP-compatible AI tools.",
      robots: "index, follow",
    },
    pricing: {
      title: "Depikt Pricing | Free, Pro & Max Image Credits",
      description:
        "Start free with 5 image credits. Compare Depikt Free, Pro, and Max plans or buy extra image credits whenever you need them.",
      ogTitle: "Simple image generation pricing",
      ogDescription: "Start with 5 free credits. Upgrade when you need more.",
      robots: "index, follow",
    },
    help: {
      title: "Depikt Help Center | Prompts, Images, Credits & Account",
      description:
        "Get help with Depikt prompts, image generation, references, credits, plans, billing, and account settings.",
      ogTitle: "Depikt Help Center",
      ogDescription:
        "Answers for creating images, using credits, managing plans, and your account.",
      robots: "index, follow",
    },
    terms: {
      title: "Terms of Service | Depikt",
      description:
        "Read the terms that apply when using Depikt, including accounts, image generation, credits, subscriptions, and acceptable use.",
      ogTitle: "Depikt Terms of Service",
      ogDescription: "Terms for using Depikt and its services.",
      robots: "index, follow",
    },
    privacy: {
      title: "Privacy Policy | Depikt",
      description:
        "Learn how Depikt handles account information, generated content, payments, analytics, and other data used to provide the service.",
      ogTitle: "Depikt Privacy Policy",
      ogDescription: "How Depikt collects, uses, and protects information.",
      robots: "index, follow",
    },
    signIn: {
      title: "Sign in to Depikt",
      description:
        "Sign in to your Depikt account to access your creations, credits, saved prompts, and account settings.",
      ogTitle: "Welcome back to Depikt",
      ogDescription: "Sign in and continue creating.",
      robots: "noindex, follow",
    },
    signUp: {
      title: "Create your Depikt account",
      description:
        "Create a free Depikt account and get 5 starter image credits to begin generating and saving your work.",
      ogTitle: "Create with Depikt",
      ogDescription: "Create a free account and get 5 starter image credits.",
      robots: "noindex, follow",
    },
  } as const;

  for (const [key, want] of Object.entries(expected)) {
    const got = SEO[key as keyof typeof SEO];
    assert.equal(got.title, want.title, `${key} title`);
    assert.equal(got.description, want.description, `${key} description`);
    assert.equal(got.ogTitle, want.ogTitle, `${key} ogTitle`);
    assert.equal(got.ogDescription, want.ogDescription, `${key} ogDescription`);
    assert.equal(got.robots, want.robots, `${key} robots`);
    assert.ok(got.title.length <= 70, `${key} title too long: ${got.title.length}`);
    assert.ok(
      got.description.length <= 160,
      `${key} description too long: ${got.description.length}`,
    );
  }

  assert.deepEqual(SEO.root, SEO.home);
  assert.deepEqual(SEO.generate, SEO.promptGenerate);
  assert.equal(SEO.promptBuild.title, "AI Image Prompt Builder | Depikt");
  assert.equal(SEO.promptCritique.title, "AI Image Prompt Critic | Depikt");
});

test("core page titles and descriptions do not chase model-name keywords", () => {
  const keys = [
    "home",
    "library",
    "promptGenerate",
    "promptBuild",
    "promptCritique",
    "gallery",
    "templates",
    "blog",
    "mcp",
    "pricing",
    "help",
    "terms",
    "privacy",
    "signIn",
    "signUp",
    "generate",
  ] as const;
  for (const key of keys) {
    const m = SEO[key];
    assert.equal(MODEL_KEYWORD.test(m.title), false, `${key} title`);
    assert.equal(MODEL_KEYWORD.test(m.description), false, `${key} description`);
    assert.equal(MODEL_KEYWORD.test(m.ogTitle ?? ""), false, `${key} ogTitle`);
    assert.equal(MODEL_KEYWORD.test(m.ogDescription ?? ""), false, `${key} ogDescription`);
  }
});

test("pageSeoHead emits title, og overrides, robots, and canonical", () => {
  const { meta, links } = pageSeoHead(SEO.home, {
    url: "https://depikt.app/",
    image: "https://depikt.app/og/home.png",
  });
  const byName = Object.fromEntries(
    meta.filter((t) => "name" in t).map((t) => [t.name, t.content]),
  );
  const byProp = Object.fromEntries(
    meta.filter((t) => "property" in t).map((t) => [t.property, t.content]),
  );
  const titleTag = meta.find((t): t is { title: string } => "title" in t);
  assert.equal(titleTag?.title, SEO.home.title);
  assert.equal(byName.description, SEO.home.description);
  assert.equal(byName.robots, "index, follow");
  assert.equal(byProp["og:title"], SEO.home.ogTitle);
  assert.equal(byProp["og:description"], SEO.home.ogDescription);
  assert.equal(byProp["og:image"], "https://depikt.app/og/home.png");
  assert.deepEqual(links, [{ rel: "canonical", href: "https://depikt.app/" }]);
});

test("sign-in and sign-up emit noindex, follow (not nofollow)", () => {
  for (const page of [SEO.signIn, SEO.signUp]) {
    const { meta } = pageSeoHead(page, { url: "https://depikt.app/sign-in" });
    const robots = meta.find((t) => "name" in t && t.name === "robots");
    assert.ok(robots && "content" in robots);
    assert.equal(robots.content, "noindex, follow");
  }
  assert.match(read("src/routes/sign-in.tsx"), /pageSeoHead\(SEO\.signIn/);
  assert.match(read("src/routes/sign-up.tsx"), /pageSeoHead\(SEO\.signUp/);
});

test("/prompt stays the canonical URL; Generate uses its own OG card", () => {
  const src = read("src/routes/prompt.tsx");
  assert.match(src, /pageSeoHead\(page/);
  assert.match(src, /const PROMPT_URL = absoluteUrl\("\/prompt"\)/);
  assert.match(src, /mode === "generate" \? "generate" : "prompt"/);
  assert.match(read("src/routes/generate.tsx"), /statusCode: 301/);
  assert.doesNotMatch(read("src/routes/sitemap[.]xml.tsx"), /absoluteUrl\("\/generate"\)/);
});
