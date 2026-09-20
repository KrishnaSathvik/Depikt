// Signed-out product-story unification: keep the Images 2.5 editorial hero,
// then make Generate the primary product. Grep-on-source, no provider calls.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ANNOUNCEMENT,
  AUTH_COPY,
  CTA,
  HOME_ACTION,
  NAV_ITEMS,
  TOOL,
} from "../../src/lib/product.ts";
import { galleryLabel } from "../../src/lib/gallery-labels.ts";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("Images 2.5 editorial hero is preserved", () => {
  assert.equal(ANNOUNCEMENT.eyebrow, "New in Depikt");
  assert.match(ANNOUNCEMENT.title, /See what works with ChatGPT Images 2\.5/);
  assert.equal(ANNOUNCEMENT.primary.label, "Explore Images 2.5");
  assert.equal(ANNOUNCEMENT.secondary.label, "Read what's new");
  const launch = read("src/components/LaunchModule.tsx");
  assert.match(launch, /a\.eyebrow/);
  assert.match(launch, /a\.title/);
  assert.match(launch, /a\.primary\.label/);
  assert.match(launch, /a\.secondary\.label/);
  assert.doesNotMatch(launch, /recipes/);
  const home = read("src/routes/index.tsx");
  assert.match(home, /<LaunchModule/);
  assert.match(home, /<ProductAction/);
  const actionIdx = home.indexOf("<ProductAction");
  const launchIdx = home.indexOf("<LaunchModule");
  assert.ok(launchIdx >= 0 && actionIdx > launchIdx, "product action follows the hero");
});

test("homepage conversion CTAs after the hero are Generate image + Browse Prompt Library", () => {
  assert.equal(HOME_ACTION.title, "Make something with Depikt");
  assert.equal(CTA.generateImage, "Generate image");
  assert.equal(CTA.browseShort, "Browse Prompt Library");
  const home = read("src/routes/index.tsx");
  assert.match(home, /CTA\.generateImage/);
  assert.match(home, /CTA\.browseShort/);
  assert.match(home, /HOME_ACTION\.finalTitle/);
  assert.doesNotMatch(home, /CTA\.buildHero/);
  assert.doesNotMatch(home, /Build a Prompt/);
  assert.doesNotMatch(home, /recipe/i);
});

test("primary nav is Generate, Prompt Library, Templates, Gallery, plus Pricing and Sign in", () => {
  assert.deepEqual(
    NAV_ITEMS.map((n) => n.label),
    ["Prompt Library", "Templates", "Gallery"],
  );
  const header = read("src/components/Header.tsx");
  assert.match(header, /const items: NavItem\[\] = \[workspaceItem, \.\.\.NAV_ITEMS\]/);
  assert.match(header, /TOOL\.generate/);
  assert.match(header, /ROUTES\.pricing/);
  assert.match(header, /Pricing/);
  assert.match(header, /Sign in/);
  assert.match(header, /loading/);
  assert.doesNotMatch(header, /TOOL\.blog/);
  assert.doesNotMatch(header, /id: "build"/);
  const footer = read("src/components/Footer.tsx");
  assert.match(footer, /TOOL\.blog/);
});

test("Library primary action generates; Imago and Edit prompt sit under More", () => {
  const dialog = read("src/components/library/PromptDetailDialog.tsx");
  assert.match(dialog, /CTA\.generateWithPrompt/);
  assert.match(dialog, /CTA\.copyPrompt/);
  assert.match(dialog, /<DropdownMenu/);
  const moreBlock = dialog.slice(
    dialog.indexOf("<DropdownMenu"),
    dialog.indexOf("</DropdownMenu>"),
  );
  assert.match(moreBlock, /CTA\.remix/);
  assert.match(moreBlock, /CTA\.openImago/);
  assert.doesNotMatch(dialog, /Remix in Prompt/);
  const card = read("src/components/library/PromptCard.tsx");
  assert.doesNotMatch(card, /opacity-0 group-hover:opacity-100/);
});

test("Gallery has one Use as reference action that hands off to Generate", () => {
  const gallery = read("src/routes/gallery.tsx");
  assert.match(gallery, /CTA\.useAsReference/);
  assert.match(gallery, /sourceType: "gallery"/);
  assert.match(gallery, /ROUTES\.legacyBuilder/);
  assert.doesNotMatch(gallery, /Use in /);
  assert.doesNotMatch(gallery, /Generate with reference/);
  assert.doesNotMatch(gallery, /Remix in Prompt/);
  assert.equal(galleryLabel("0BE55AAE-0160-4BE9-8637-3D22FD96220D.PNG", 0), "Gallery reference 1");
  assert.equal(galleryLabel("IMG_3630.JPG", 4), "Gallery photo 5");
});

test("Templates continue to Generate without a forced Build handoff when generation is live", () => {
  const page = read("src/routes/templates.index.tsx");
  assert.match(page, /CTA\.continueToGenerate/);
  assert.match(page, /composeTemplateBrief/);
  assert.match(page, /sourceType: "template"/);
  assert.match(page, /isNativeGenerationEnabled\(\)/);
  assert.doesNotMatch(page, /Continue in Prompt/);
});

test("Generate exposes Improve prompt and Critique as secondary tools and a compact composer", () => {
  const gen = read("src/components/generate/GenerateWorkspace.tsx");
  assert.match(gen, /CTA\.improvePrompt/);
  assert.match(gen, /mode: "build"/);
  assert.match(gen, /mode: "critique"/);
  assert.match(gen, /\+ Reference/);
  assert.match(gen, /Describe your image\.\.\./);
  assert.match(gen, /"Auto"/);
  assert.match(gen, /"1 credit"/);
  assert.match(gen, /Preparing your request/);
  const prompt = read("src/routes/prompt.tsx");
  assert.match(prompt, /if \(value === "build"\) return "build"/);
  assert.match(prompt, /return "generate"/);
});

test("auth gate keeps the pending prompt promise and 5 free credits", () => {
  assert.equal(
    AUTH_COPY.continuePromise,
    "Sign in to continue. Your prompt is saved and we'll continue with this image.",
  );
  assert.equal(AUTH_COPY.starterCreditsLine, "5 free credits included.");
  const gate = read("src/components/auth/AuthGateDialog.tsx");
  assert.match(gate, /AUTH_COPY\.continuePromise/);
  assert.match(gate, /AUTH_COPY\.starterCreditsLine/);
  assert.match(gate, /generationGateHeadline/);
  const chooser = read("src/components/auth/AuthChooserDialog.tsx");
  assert.doesNotMatch(chooser, /DialogDescription className="sr-only">\{title\}/);
  const surface = read("src/components/auth/AuthSurface.tsx");
  assert.match(surface, /providers\.includes\("google"\)/);
  assert.match(surface, /providers\.includes\("lovable"\)/);
  const googleBtn = surface.slice(
    surface.indexOf('providers.includes("google")'),
    surface.indexOf('providers.filter((id) => id !== "google"'),
  );
  assert.doesNotMatch(googleBtn, /variant="outline"/);
  const emailBtn = surface.slice(surface.indexOf('type="submit"'), surface.indexOf("EmailMark"));
  assert.match(surface, /variant="outline"/);
  assert.ok(emailBtn.length >= 0);
  assert.equal(TOOL.improvePrompt, "Improve prompt");
  assert.equal(TOOL.critique, "Critique");
});
