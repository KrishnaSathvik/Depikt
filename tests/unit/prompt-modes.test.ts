// Regression coverage for the 2026-09-12 end-to-end audit fixes on the
// unified /prompt workspace: the eyebrow label tracking the active mode, the
// mode-aware SEO/OG metadata (canonical URL stays /prompt for all three),
// removal of the stale "Improve in Prompt" CTA from Generate, and a guard
// against reintroducing the SSR/client style-prop divergence that produced a
// hydration mismatch on every /prompt load. Same grep-on-source approach as
// tests/unit/profile-avatar-hydration.test.ts (no React renderer in this
// project -- see CLAUDE.md's "No test framework").

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CTA, SEO } from "../../src/lib/product.ts";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

const PROMPT_SRC = read("src/routes/prompt.tsx");

// ---------- eyebrow tracks the active mode ----------

test("prompt eyebrow is derived from the active mode, not hardcoded to Generate", () => {
  // The bug: `{generationEnabled ? TOOL.generate : TOOL.prompt}` never
  // changed when the user switched to Build or Critique.
  assert.doesNotMatch(PROMPT_SRC, /generationEnabled \? TOOL\.generate : TOOL\.prompt/);
  assert.match(PROMPT_SRC, /<p className="eyebrow">\{eyebrow\}<\/p>/);
  // Reuses the same canonical labels already shown on the mode tabs (MODES)
  // instead of a second, hardcoded set of "Generate"/"Build"/"Critique" strings.
  assert.match(PROMPT_SRC, /const eyebrow = MODES\.find\(\(m\) => m\.id === mode\)\?\.label/);
});

test("the three canonical mode labels used for both tabs and the eyebrow are Generate/Build/Critique", () => {
  assert.match(PROMPT_SRC, /id: "generate", label: "Generate"/);
  assert.match(PROMPT_SRC, /id: "build", label: "Build"/);
  assert.match(PROMPT_SRC, /id: "critique", label: "Critique"/);
});

// ---------- mode-aware SEO/OG ----------

test("SEO.promptGenerate/promptBuild/promptCritique carry the locked per-mode copy", () => {
  assert.equal(SEO.promptGenerate.title, "Generate Images | Depikt");
  assert.equal(
    SEO.promptGenerate.description,
    "Create and edit images from prompts and references with Depikt.",
  );
  assert.equal(SEO.promptGenerate.ogTitle, "Generate with Depikt");
  assert.equal(SEO.promptGenerate.ogDescription, "Turn a prompt and reference into an image.");

  assert.equal(SEO.promptBuild.title, "AI Image Prompt Builder | Depikt");
  assert.equal(
    SEO.promptBuild.description,
    "Turn an idea or reference into a stronger image prompt with Depikt.",
  );
  assert.equal(SEO.promptBuild.ogTitle, "Build better image prompts");
  assert.equal(
    SEO.promptBuild.ogDescription,
    "Start with an idea. Leave with a production-ready image prompt.",
  );

  assert.equal(SEO.promptCritique.title, "AI Image Prompt Critic | Depikt");
  assert.equal(
    SEO.promptCritique.description,
    "Review, score, and improve an existing image prompt with Depikt.",
  );
  assert.equal(SEO.promptCritique.ogTitle, "Improve your image prompt");
  assert.equal(
    SEO.promptCritique.ogDescription,
    "Find what is weakening your prompt and get a stronger rewrite.",
  );
});

test("/prompt's head() resolves metadata by the requested mode, falling back like the component does", () => {
  assert.match(PROMPT_SRC, /head: \(\{ match \}\) => \{/);
  assert.match(PROMPT_SRC, /const requestedMode = parsePromptMode\(match\.search\.mode\)/);
  assert.match(
    PROMPT_SRC,
    /requestedMode === "generate" && !isNativeGenerationEnabled\(\) \? "build" : requestedMode/,
  );
  assert.match(PROMPT_SRC, /const meta = SEO_BY_MODE\[mode\]/);
  // OG/twitter fall back to title/description when a mode has no ogTitle/ogDescription
  // override, same convention as every other page in the app.
  assert.match(PROMPT_SRC, /const ogTitle = meta\.ogTitle \?\? meta\.title/);
  assert.match(PROMPT_SRC, /const ogDescription = meta\.ogDescription \?\? meta\.description/);
});

test("the canonical URL for all three modes stays /prompt (no per-mode routes)", () => {
  assert.match(PROMPT_SRC, /const PROMPT_URL = absoluteUrl\("\/prompt"\)/);
  assert.match(PROMPT_SRC, /property: "og:url", content: PROMPT_URL/);
  assert.match(PROMPT_SRC, /rel: "canonical", href: PROMPT_URL/);
});

test("Generate is represented in SEO copy -- this must fail if Generate metadata disappears again", () => {
  assert.match(SEO.promptGenerate.title, /Generate Images/);
  assert.doesNotMatch(SEO.promptGenerate.title, /Builder & Critic/);
  assert.doesNotMatch(SEO.promptGenerate.title, /AI Image Generator/);
});

// ---------- stale "Improve in Prompt" CTA removed ----------

test("Generate no longer offers a stale 'Improve in Prompt' link back into the same unified workspace", () => {
  const generateSrc = read("src/components/generate/GenerateWorkspace.tsx");
  assert.doesNotMatch(generateSrc, /improveInPrompt/);
  assert.doesNotMatch(generateSrc, /Improve in Prompt/);
  assert.doesNotMatch(generateSrc, /CTA\.improveInPrompt/);
  assert.ok(!("improveInPrompt" in CTA), "CTA.improveInPrompt should be removed, not just unused");
});

test("Generate's real result actions (Download/Edit/Regenerate/New) are untouched", () => {
  const actionsSrc = read("src/components/generate/GenerationActions.tsx");
  assert.match(actionsSrc, /Download/);
  assert.match(actionsSrc, /Edit/);
  assert.match(actionsSrc, /Regenerate image/);
  assert.match(actionsSrc, /New/);
});

test("Build resets inline generation on New Prompt and Rebuild, and labels them distinctly from image Regenerate", () => {
  const build = read("src/components/prompt/BuildMode.tsx");
  const critique = read("src/components/prompt/CritiqueMode.tsx");
  assert.match(build, /CTA\.rebuildPrompt/);
  assert.match(build, /gen\.reset\(\)/);
  assert.match(build, /handleNewPrompt[\s\S]*gen\.reset\(\)/);
  assert.match(critique, /handleNewCritique[\s\S]*gen\.reset\(\)/);
  assert.match(critique, /score = async[\s\S]*gen\.reset\(\)/);
  assert.match(PROMPT_SRC, /next === "build" \? \{ template: search\.template \}/);
});

test("mode heroes share ModeHero + PROMPT_MODE_COPY and do not restate the tab hint as a third line", () => {
  assert.doesNotMatch(
    PROMPT_SRC,
    /MODES\.find\(\(m\) => m\.id === mode\)\?\.hint/,
    "visible hint under tabs duplicates the hero",
  );
  for (const f of [
    "src/components/generate/GenerateWorkspace.tsx",
    "src/components/prompt/BuildMode.tsx",
    "src/components/prompt/CritiqueMode.tsx",
  ]) {
    assert.match(read(f), /ModeHero/, f);
    assert.match(read(f), /PROMPT_MODE_COPY/, f);
  }
  assert.match(read("src/lib/product.ts"), /From prompt to picture/);
  assert.match(read("src/lib/product.ts"), /From idea to prompt/);
  assert.match(read("src/lib/product.ts"), /From draft to sharper/);
});

// ---------- hydration mismatch regression guard ----------
//
// Investigation (2026-09-12): the mismatch React reported was a `style={{}}`
// diff on the <textarea>/file <input> elements shared by all three modes.
// No component in this render path (Textarea, ReferenceImagePicker,
// CreationComposer, GenerateWorkspace, BuildMode, CritiqueMode) sets a
// `style` prop anywhere, the SSR HTML and the post-hydration DOM both carry
// zero `style` attributes on these elements, and instrumenting React's own
// diffHydratedStyles internals directly showed it never fires on repeat
// clean loads -- it did not reproduce after a clean dev-server restart. This
// guard keeps it that way: it fails the moment any of these components
// starts computing a `style` prop for the shared textarea/file-input
// elements, which is the only way a real, deterministic version of this
// mismatch could come back.
const HYDRATION_SENSITIVE_FILES = [
  "src/components/ui/textarea.tsx",
  "src/components/ReferenceImagePicker.tsx",
  "src/components/composer/CreationComposer.tsx",
  "src/components/generate/GenerateWorkspace.tsx",
  "src/components/prompt/BuildMode.tsx",
  "src/components/prompt/CritiqueMode.tsx",
];

test("no style prop is set on the shared textarea/file-input elements (would cause SSR/client divergence)", () => {
  for (const file of HYDRATION_SENSITIVE_FILES) {
    const src = read(file);
    // Matches `style={...}` or `style: {...}` anywhere near a textarea/input
    // JSX tag; a bare `style` import or an unrelated `scoreColor` inline
    // style on a <span> (CritiqueMode's score readout) is fine -- only flag
    // style props inside <textarea>/<input> tags themselves.
    const tagBlocks = src.match(/<(textarea|input)\b[^>]*>/gs) ?? [];
    for (const block of tagBlocks) {
      assert.doesNotMatch(
        block,
        /\bstyle\s*=/,
        `${file}: found a style prop on a shared textarea/input element: ${block.slice(0, 80)}`,
      );
    }
  }
});

test("no client-only branch (typeof window/document) affects the composer's rendered output", () => {
  for (const file of HYDRATION_SENSITIVE_FILES) {
    const src = read(file);
    // A `typeof window === "undefined"` guard used only to compute a URL
    // hostname (BuildMode/CritiqueMode's Imago link) is fine; this guards
    // against a *new* one being introduced that changes JSX output.
    const guards = src.match(/typeof (window|document) [!=]==? "undefined"[^\n]*/g) ?? [];
    for (const guard of guards) {
      assert.match(
        guard,
        /host = window\.location\.hostname|return path/,
        `${file}: unexpected client-only render branch: ${guard}`,
      );
    }
  }
});
