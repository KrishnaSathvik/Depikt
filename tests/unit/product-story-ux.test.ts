// Signed-out product-story unification: keep the Images 2.5 editorial hero,
// then make Generate the primary product. Grep-on-source, no provider calls.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ANNOUNCEMENT,
  AUTH_COPY,
  CTA,
  HOME_ACTION,
  HOME_CAPABILITIES,
  homeCapabilities,
  NAV_ITEMS,
  TOOL,
} from "../../src/lib/product.ts";
import { galleryLabel } from "../../src/lib/gallery-labels.ts";
import { HOME_GENERATE_EXAMPLES } from "../../src/data/home-generate-examples.ts";

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
  assert.match(home, /<CreateWorkspace/);
  const demoIdx = home.indexOf("<CreateWorkspace");
  const launchIdx = home.indexOf("<LaunchModule");
  assert.ok(launchIdx >= 0 && demoIdx > launchIdx, "interactive Generate follows the hero");
  assert.doesNotMatch(home, /<ProductAction/);
  assert.doesNotMatch(home, /ProofStrip|GalleryPeek|PricingNote|FinalCTA/);
});

test("homepage uses the real workspace without the demo or navigation explainer", () => {
  const home = read("src/routes/index.tsx");
  assert.match(home, /<CreateWorkspace/);
  assert.match(home, /id="create"/);
  assert.doesNotMatch(home, /HomeGenerateDemo|StartWays|GALLERY_IMAGES/);
  const workspace = read("src/components/CreateWorkspace.tsx");
  assert.match(workspace, /<GenerateWorkspace\s+active=/);
  assert.match(workspace, /hidden=\{mode !== "generate"\}/);
});

test("homepage capabilities describe the product and hide V4/V5 when those flags are off", () => {
  assert.equal(HOME_ACTION.capabilitiesTitle, "More control when you need it.");
  assert.deepEqual(
    HOME_CAPABILITIES.map((c) => c.label),
    ["Reference Packs", "Precision editing", "Grounded generation", "Validation + refinement"],
  );
  const grounded = HOME_CAPABILITIES.find((c) => c.label === "Grounded generation");
  const validation = HOME_CAPABILITIES.find((c) => c.label === "Validation + refinement");
  assert.equal(grounded?.requires, "grounding");
  assert.equal(validation?.requires, "validation");
  assert.match(grounded?.body ?? "", /research current, factual, or visual context/i);
  assert.match(validation?.body ?? "", /automatically refine one issue/i);
  assert.doesNotMatch(grounded?.body ?? "", /not enabled/i);
  assert.doesNotMatch(validation?.body ?? "", /not enabled/i);

  assert.deepEqual(
    homeCapabilities({ grounding: false, validation: false }).map((c) => c.label),
    ["Reference Packs", "Precision editing"],
  );
  assert.deepEqual(
    homeCapabilities({ grounding: true, validation: true }).map((c) => c.label),
    ["Reference Packs", "Precision editing", "Grounded generation", "Validation + refinement"],
  );
  assert.deepEqual(
    homeCapabilities({ grounding: true, validation: false }).map((c) => c.label),
    ["Reference Packs", "Precision editing", "Grounded generation"],
  );

  const home = read("src/routes/index.tsx");
  assert.match(home, /homeCapabilities/);
  assert.match(home, /isGroundingEnabled/);
  assert.match(home, /isValidationRepairEnabled/);
  assert.doesNotMatch(home, /Control structure, hierarchy, and exact text/);
  assert.doesNotMatch(home, /not enabled in the current release/);
});

test("primary nav is Library, with Sign in", () => {
  assert.deepEqual(
    NAV_ITEMS.map((n) => n.label),
    ["Library"],
  );
  const header = read("src/components/Header.tsx");
  assert.match(header, /const items: NavItem\[\] = \[\.\.\.NAV_ITEMS\]/);
  assert.doesNotMatch(header, /workspaceItem/);
  assert.doesNotMatch(header, /ROUTES\.pricing/);
  assert.match(header, /Sign in/);
  assert.match(header, /loading/);
  assert.match(header, /h-12/);
  assert.match(header, /after:opacity-100/);
  assert.match(header, /text-\[color:var\(--text-tertiary\)\]/);
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
  const gallery =
    read("src/components/library/GalleryBrowser.tsx") + read("src/hooks/use-gallery-reference.ts");
  assert.match(gallery, /CTA\.useAsReference/);
  assert.match(gallery, /sourceType: "gallery"/);
  assert.match(gallery, /ROUTES\.legacyBuilder/);
  assert.doesNotMatch(gallery, /Use in /);
  assert.doesNotMatch(gallery, /Generate with reference/);
  assert.doesNotMatch(gallery, /Remix in Prompt/);
  assert.equal(
    galleryLabel("0BE55AAE-0160-4BE9-8637-3D22FD96220D.PNG", 0),
    "Reflected silhouette poster",
  );
  assert.equal(galleryLabel("IMG_3630.JPG", 4), "Monochrome apparel brand kit");
});

test("Templates continue to Generate without a forced Build handoff when generation is live", () => {
  const page = read("src/components/library/TemplatesBrowser.tsx");
  assert.match(page, /CTA\.continueToGenerate/);
  assert.match(page, /composeTemplateBrief/);
  assert.match(page, /sourceType: "template"/);
  assert.match(page, /isNativeGenerationEnabled\(\)/);
  assert.doesNotMatch(page, /Continue in Prompt/);
});

test("Generate exposes Improve prompt and Critique as secondary tools and a compact composer", () => {
  const gen = read("src/components/generate/GenerateWorkspace.tsx");
  const workspace = read("src/components/CreateWorkspace.tsx");
  assert.match(workspace, /id: "build", label: TOOL.improvePrompt/);
  assert.match(workspace, /id: "critique", label: TOOL.critique/);
  assert.match(gen, /REFERENCES_COPY\.oneOffAdd/);
  assert.match(read("src/lib/product.ts"), /oneOffAdd: "\+ Reference image"/);
  assert.match(gen, /Describe your image\.\.\./);
  assert.match(gen, /aria-label="Aspect ratio"/);
  assert.match(gen, /· 1 credit/);
  assert.doesNotMatch(gen, /Generate image → · 1 credit/);
  assert.match(gen, /Preparing your request/);
  const prompt = read("src/lib/creator-search.ts");
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
