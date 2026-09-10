// Commercial UX surfaces: pricing, buy-credits sheet, out-of-credits panel,
// account page, help / privacy / terms, footer, SEO plumbing, deletion.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { outOfCreditsCopy } from "../../src/lib/billing/credit-state.ts";
import { HELP_SECTIONS, PRIVACY_MD, TERMS_MD, LEGAL_LAST_UPDATED } from "../../src/data/legal.ts";
import { PRICING_COPY, BUY_CREDITS_COPY } from "../../src/lib/billing/copy.ts";
import { OG_ROUTE_IMAGES } from "../../src/lib/og-routes.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

// ---------- out-of-credits copy ----------

test("out-of-credits copy per plan and billing state", () => {
  const free = outOfCreditsCopy({ plan: "free", subscriptionStatus: null, nextResetAt: null });
  assert.equal(free.title, "You're out of image credits.");
  assert.equal(free.body, "Your 5 starter credits have been used.");
  assert.equal(free.primary, "buy");
  assert.equal(free.secondary, "upgrade_pro");

  const pro = outOfCreditsCopy({
    plan: "pro",
    subscriptionStatus: "active",
    nextResetAt: "2026-10-10T00:00:00Z",
  });
  assert.equal(pro.title, "You've used this month's 40 image credits.");
  assert.match(pro.body, /refresh on Oct 10/);
  assert.equal(pro.primary, "buy");
  assert.equal(pro.secondary, "upgrade_max");

  const max = outOfCreditsCopy({
    plan: "max",
    subscriptionStatus: "active",
    nextResetAt: "2026-10-10T00:00:00Z",
  });
  assert.equal(max.title, "You've used this month's 100 image credits.");
  assert.equal(max.secondary, null, "no forced upgrade on Max");

  const pastDue = outOfCreditsCopy({
    plan: "pro",
    subscriptionStatus: "past_due",
    nextResetAt: "2026-10-10T00:00:00Z",
  });
  assert.equal(pastDue.title, "Your latest payment needs attention.");
  assert.equal(pastDue.primary, "update_billing");
  assert.equal(pastDue.secondary, "buy");
});

// ---------- pricing ----------

test("pricing copy is the locked editorial copy", () => {
  assert.equal(PRICING_COPY.eyebrow, "Pricing");
  assert.equal(PRICING_COPY.headline, "Create more with Depikt.");
  assert.match(
    PRICING_COPY.sub,
    /Image credits are used when you generate, edit, or regenerate an image\./,
  );
  assert.equal(PRICING_COPY.toggleMonthly, "Monthly");
  assert.match(PRICING_COPY.toggleYearly, /^Yearly/);
  assert.doesNotMatch(
    PRICING_COPY.toggleYearly,
    /2 months free/,
    "$199/$399 is not exactly two months",
  );
  assert.equal(PRICING_COPY.cta.free, "Start free");
  assert.equal(PRICING_COPY.cta.pro, "Get Pro");
  assert.equal(PRICING_COPY.cta.max, "Get Max");
  assert.equal(PRICING_COPY.packsHeading, "Need more image credits?");
  assert.equal(PRICING_COPY.packsNote, "Purchased credits don't expire.");
});

test("pricing page renders plan cards, packs, honest annual framing, and no fake features", () => {
  const src = read("src/routes/pricing.tsx");
  assert.match(src, /<PlanCards/);
  assert.match(src, /pricing_viewed/);
  const cards = read("src/components/billing/PlanCards.tsx");
  assert.match(cards, /monthlyEquivalent\(/);
  assert.match(cards, /credits every month/i);
  assert.match(cards, /startCheckout\(/);
  assert.match(cards, /ROUTES\.signUp/);
  for (const fake of [
    "priority support",
    "faster generation",
    "higher image quality",
    "Unlimited",
    "unlimited",
  ]) {
    assert.doesNotMatch(cards, new RegExp(fake), `no fake feature: ${fake}`);
    assert.doesNotMatch(src, new RegExp(fake), `no fake feature: ${fake}`);
  }
  assert.match(cards, /CREDIT_PACKS/);
});

// ---------- buy credits sheet ----------

test("BuyCreditsSheet lists the three packs from the catalog and starts hosted checkout", () => {
  assert.equal(BUY_CREDITS_COPY.title, "Get more image credits");
  assert.equal(BUY_CREDITS_COPY.body, "Keep creating without changing your plan.");
  assert.equal(BUY_CREDITS_COPY.footer, "Purchased credits don't expire.");
  assert.match(BUY_CREDITS_COPY.continue, /Continue to checkout/);
  const src = read("src/components/billing/BuyCreditsSheet.tsx");
  assert.match(src, /BUY_CREDITS_COPY\.title/);
  assert.match(src, /BUY_CREDITS_COPY\.body/);
  assert.match(src, /BUY_CREDITS_COPY\.footer/);
  assert.match(src, /BUY_CREDITS_COPY\.continue/);
  assert.match(src, /CREDIT_PACKS/);
  assert.match(src, /startCheckout\(/);
  assert.doesNotMatch(src, /\$6|\$12|\$22/, "prices come from the catalog, not literals");
  const root = read("src/routes/__root.tsx");
  assert.match(root, /BuyCreditsProvider/);
});

// ---------- out-of-credits panel wiring ----------

test("generation exposes creditState and hosts render the shared panel", () => {
  const gen = read("src/lib/generation/use-generation.ts");
  assert.match(gen, /creditState/);
  assert.match(gen, /credits_exhausted/);
  assert.match(gen, /err\.status === 402/);
  // pre-emption: a signed-in user at 0 credits never hits the API
  assert.match(gen, /credits === 0/);
  for (const file of [
    "src/components/generate/GenerateWorkspace.tsx",
    "src/components/prompt/BuildMode.tsx",
    "src/components/prompt/CritiqueMode.tsx",
  ]) {
    assert.match(read(file), /<GenerationCreditGate gen=\{gen\}/, file);
  }
  const panel = read("src/components/billing/OutOfCreditsPanel.tsx");
  assert.match(panel, /outOfCreditsCopy\(/);
  assert.match(panel, /Buy credits/);
  assert.match(panel, /Update billing/);
  assert.doesNotMatch(panel, /DialogContent/, "inline panel, not a modal");
});

// ---------- account ----------

test("/account has the V1 sections, confirms checkout server-side, and a deliberate delete flow", () => {
  const src = read("src/routes/account.tsx");
  for (const s of ["PLAN", "CREDITS", "USAGE", "Delete account", "Manage billing", "Buy credits"]) {
    assert.match(src, new RegExp(s), s);
  }
  assert.match(src, /AUTH_COPY\.signOut/, "sign out label comes from the shared auth copy");
  assert.match(src, /confirmCheckout\(/);
  assert.match(src, /checkout_completed/);
  assert.match(src, /credit_purchase_completed/);
  assert.match(src, /Type DELETE to continue|type DELETE/i);
  assert.match(src, /account_deleted/);
  assert.match(src, /noindex, nofollow/);
  assert.doesNotMatch(src, /recharts|<Chart/);
  const api = read("src/routes/api/account/delete.ts");
  assert.match(api, /subscriptions\.cancel\(/);
  assert.match(api, /removeUserStorage\(/);
  assert.match(api, /deleted_accounts/);
  assert.match(api, /auth\.admin\.deleteUser\(/);
  assert.match(api, /authenticateGenerationRequest\(request\)/);
});

// ---------- help / legal ----------

test("help page is self-service only, no fake support channel", () => {
  const src = read("src/routes/help.tsx");
  assert.match(src, /HELP_SECTIONS/);
  const questions = HELP_SECTIONS.flatMap((s) => s.items.map((i) => i.q));
  for (const q of [
    "What is one credit?",
    "Why don't I choose an image model?",
    "How are image sizes chosen?",
    "Can I use reference images?",
    "What happens if generation fails?",
    "How do monthly credits work?",
    "Do credits roll over?",
    "Can I buy credits without subscribing?",
    "What happens if I cancel?",
    "How do I manage billing?",
    "Where are generated images stored?",
    "How do I delete my account?",
  ]) {
    assert.ok(questions.includes(q), `missing help question: ${q}`);
  }
  const all = JSON.stringify(HELP_SECTIONS);
  assert.doesNotMatch(all, /24\/7|support@|Contact support|live chat/i);
});

test("privacy and terms cover the required subjects and invent no owner details", () => {
  for (const [md, required] of [
    [
      PRIVACY_MD,
      [
        "Google",
        "Apple",
        "Microsoft",
        "OpenAI",
        "Supabase",
        "Cloudflare",
        "Lovable",
        "Stripe",
        "Google Analytics",
        "IndexedDB",
        "reference images",
        "generated images",
        "delete",
      ],
    ],
    [
      TERMS_MD,
      [
        "1 credit",
        "Failed",
        "reset",
        "do not expire",
        "Starter credits",
        "annual",
        "Cancel",
        "Refund",
        "reference images",
        "not be unique",
        "Acceptable use",
        "OpenAI",
        "Governing law",
      ],
    ],
  ] as const) {
    for (const s of required) assert.match(md, new RegExp(s, "i"), `missing: ${s}`);
    assert.doesNotMatch(md, /@depikt\.app/, "no invented email address");
    assert.doesNotMatch(md, /GDPR[- ]certified|CCPA[- ]certified|SOC ?2/i);
    assert.match(md, /\[OWNER INPUT/, "unresolved owner inputs must stay visibly flagged");
  }
  assert.match(LEGAL_LAST_UPDATED, /^\d{4}-\d{2}-\d{2}$/);
  for (const f of ["src/routes/privacy.tsx", "src/routes/terms.tsx"])
    assert.match(read(f), /renderMarkdown\(/);
});

// ---------- footer / header ----------

test("footer has the four restrained columns and no stale tagline", () => {
  const src = read("src/components/Footer.tsx");
  for (const s of [
    "Product",
    "Resources",
    "Account",
    "Legal",
    "ROUTES.pricing",
    "ROUTES.help",
    "ROUTES.privacy",
    "ROUTES.terms",
    "/templates",
    "MCP.pagePath",
  ]) {
    assert.match(src, new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), s);
  }
  assert.doesNotMatch(src, /A workspace for better image prompts\./);
  assert.doesNotMatch(src, /Sign up/);
  assert.match(src, /useAuth\(\)/, "signed-in footer shows Account instead of Sign in");
});

// ---------- SEO ----------

test("sitemap lists the public commercial pages and never the auth/account routes; robots blocks /account", () => {
  const sitemap = read("src/routes/sitemap[.]xml.tsx");
  for (const p of ["/pricing", "/help", "/privacy", "/terms"])
    assert.match(sitemap, new RegExp(`"${p}"`), p);
  for (const p of ["/sign-in", "/sign-up", "/account"])
    assert.doesNotMatch(sitemap, new RegExp(`"${p}"`), p);
  const robots = read("src/routes/robots[.]txt.tsx");
  assert.match(robots, /Disallow: \/account/);
  // A dedicated pricing OG card is reserved but not generated yet (that runs
  // outside the product); until then it falls back like any other route.
  assert.equal(OG_ROUTE_IMAGES.pricing, "/og/pricing.png");
  assert.match(read("src/routes/pricing.tsx"), /getOgImageForPath\("pricing"\)/);
});
