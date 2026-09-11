// Commercial launch, layer 1: AuthSurface, /sign-in, /sign-up, safe `next`,
// provider availability, header account chrome, and the shared provider
// chooser that replaces the hard-coded Google sign-in on Generate.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { safeNextPath } from "../../src/lib/auth/next-param.ts";
import { AUTH_PROVIDERS, enabledAuthProviders } from "../../src/lib/auth/providers.ts";
import { ROUTES, SEO } from "../../src/lib/product.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

// ---------- safe next ----------

test("safeNextPath accepts same-origin internal paths", () => {
  assert.equal(safeNextPath("/account"), "/account");
  assert.equal(safeNextPath("/pricing?interval=yearly#max"), "/pricing?interval=yearly#max");
  assert.equal(
    safeNextPath("/prompt?mode=build&template=poster"),
    "/prompt?mode=build&template=poster",
  );
});

test("safeNextPath rejects external, protocol-relative, javascript, and malformed values", () => {
  for (const bad of [
    "https://evil.example/",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "account",
    "",
    "/account\nX-Injected: 1",
    "/%2F%2Fevil.example",
    undefined,
    null,
    42,
    "/" + "a".repeat(2000),
  ]) {
    assert.equal(safeNextPath(bad), "/", `should reject ${String(bad)}`);
  }
});

test("safeNextPath honors a custom fallback", () => {
  assert.equal(safeNextPath("https://evil.example", "/pricing"), "/pricing");
});

// ---------- providers ----------

test("provider catalog is Google, Apple, Microsoft with visible labels", () => {
  assert.deepEqual(
    AUTH_PROVIDERS.map((p) => p.id),
    ["google", "apple", "microsoft"],
  );
  for (const p of AUTH_PROVIDERS) assert.match(p.label, /^Continue with /);
});

test("only Google is enabled by default; Apple and Microsoft need explicit flags", () => {
  assert.deepEqual(enabledAuthProviders({}), ["google"]);
  assert.deepEqual(
    enabledAuthProviders({ VITE_AUTH_APPLE_ENABLED: "true", VITE_AUTH_MICROSOFT_ENABLED: "true" }),
    ["google", "apple", "microsoft"],
  );
  assert.deepEqual(enabledAuthProviders({ VITE_AUTH_GOOGLE_ENABLED: "false" }), []);
});

// ---------- routes + SEO ----------

test("auth and account routes are declared in product.ts", () => {
  assert.equal(ROUTES.signIn, "/sign-in");
  assert.equal(ROUTES.signUp, "/sign-up");
  assert.equal(ROUTES.account, "/account");
  assert.equal(SEO.signIn.title, "Sign in | Depikt");
  assert.equal(SEO.signUp.title, "Create account | Depikt");
  assert.equal(SEO.account.title, "Account | Depikt");
});

test("/sign-in and /sign-up routes exist, are noindex, and share AuthSurface", () => {
  for (const [file, mode] of [
    ["src/routes/sign-in.tsx", "sign-in"],
    ["src/routes/sign-up.tsx", "sign-up"],
  ] as const) {
    assert.ok(existsSync(resolve(ROOT, file)), `${file} missing`);
    const src = read(file);
    assert.match(src, /name: "robots", content: "noindex/);
    assert.match(src, /<AuthSurface[\s\S]*mode="(sign-in|sign-up)"/);
    assert.match(src, new RegExp(`mode="${mode}"`));
    assert.match(src, /safeNextPath/);
  }
  assert.ok(!existsSync(resolve(ROOT, "src/routes/forgot-password.tsx")));
});

// ---------- AuthSurface ----------

test("AuthSurface has both modes, no email/password fields, and the sign-up legal line", () => {
  const src = read("src/components/auth/AuthSurface.tsx");
  const copy = read("src/lib/product.ts");
  assert.match(copy, /Sign in to Depikt/);
  assert.match(copy, /Create your Depikt account/);
  assert.match(copy, /New to Depikt\?/);
  assert.match(copy, /Already have an account\?/);
  assert.match(copy, /By continuing, you agree to the/);
  assert.match(src, /AUTH_COPY\.signInTitle/);
  assert.match(src, /AUTH_COPY\.signUpTitle/);
  assert.match(src, /AUTH_COPY\.legalPrefix/);
  assert.match(src, /ROUTES\.terms/);
  assert.match(src, /ROUTES\.privacy/);
  assert.doesNotMatch(src, /type="password"/);
  assert.doesNotMatch(src, /type="email"/);
  assert.match(src, /enabledAuthProviders\(/, "buttons must come from the enabled-provider list");
});

test("sign-in goes through auth-context, which wraps the Lovable OAuth client once", () => {
  const ctx = read("src/lib/auth-context.tsx");
  assert.match(ctx, /signInWithProvider/);
  assert.match(ctx, /lovable\.auth\.signInWithOAuth/);
  const surface = read("src/components/auth/AuthSurface.tsx");
  assert.doesNotMatch(surface, /lovable\.auth/);
  const gen = read("src/lib/generation/use-generation.ts");
  assert.doesNotMatch(gen, /signInWithOAuth\("google"/, "Generate must not hard-code Google");
});

// ---------- Generate provider chooser ----------

test("use-generation exposes an auth prompt instead of starting OAuth itself", () => {
  const gen = read("src/lib/generation/use-generation.ts");
  assert.match(gen, /authPrompt/);
  assert.match(gen, /chooseAuthProvider/);
  assert.match(gen, /dismissAuthPrompt/);
  // Pending generation is still persisted BEFORE the provider is chosen.
  const submitStart = gen.indexOf("async function submit(");
  const submitBody = gen.slice(submitStart, gen.indexOf('setPhase("starting")', submitStart));
  assert.match(submitBody, /savePendingGeneration\(/);
  assert.match(submitBody, /setAuthPrompt\(true\)/);
});

test("every generation host renders the shared auth gate dialog", () => {
  for (const file of [
    "src/components/generate/GenerateWorkspace.tsx",
    "src/components/prompt/BuildMode.tsx",
    "src/components/prompt/CritiqueMode.tsx",
  ]) {
    assert.match(read(file), /<AuthGateDialog gen=\{gen\}/, `${file} must render AuthGateDialog`);
  }
});

// ---------- header ----------

test("header shows one Sign in link when signed out and an avatar menu when signed in", () => {
  const header = read("src/components/Header.tsx");
  assert.match(header, /useAuth\(\)/);
  assert.match(header, /ROUTES\.signIn/);
  assert.match(header, /<AccountMenu/);
  assert.doesNotMatch(header, /Get started/);
  assert.doesNotMatch(header, /Sign up/);
  const menu = read("src/components/auth/AccountMenu.tsx");
  assert.match(menu, /DropdownMenu/);
  assert.match(menu, /ROUTES\.account/);
  assert.match(menu, /AUTH_COPY\.signOut|Sign out/);
  assert.match(menu, /credits/);
});

// ---------- editorial auth surface: no card, contextual subtitle ----------

test("AuthSurface is the page itself (no bordered card) and each mode has a contextual subtitle", () => {
  const src = read("src/components/auth/AuthSurface.tsx");
  assert.doesNotMatch(src, /rounded-lg border|shadow-xl|bg-\[color:var\(--bg-elevated\)\]/);
  assert.match(src, /AUTH_COPY\.signInSubtitle/);
  assert.match(src, /AUTH_COPY\.signUpSubtitle/);
  const copy = read("src/lib/product.ts");
  assert.match(copy, /signInSubtitle: "Continue where you left off\."/);
  assert.match(
    copy,
    /signUpSubtitle: "Save your creations, get 5 image credits, and continue your work anywhere\."/,
  );
  // Sign-in never mentions credits — the user may already be on a paid plan.
  assert.doesNotMatch(copy.match(/signInSubtitle:.*/)?.[0] ?? "", /credit/i);
  assert.match(src, /busyLabel/);
});

test("welcome toast fires once on real first sign-in, quiet and specific", () => {
  const ctx = read("src/lib/auth-context.tsx");
  assert.match(ctx, /AUTH_COPY\.welcomeToast/);
  assert.match(ctx, /if \(isNew\) toast\.success/);
  const copy = read("src/lib/product.ts");
  assert.match(copy, /welcomeToast: "Welcome to Depikt — 5 image credits added\."/);
});

// ---------- contextual generation auth gate ----------

test("AuthGateDialog headline follows what the user already asked for, shows an excerpt/reference, and adapts to mobile", () => {
  const src = read("src/components/auth/AuthGateDialog.tsx");
  assert.match(src, /generationGateHeadline\(/);
  assert.match(src, /promptExcerpt\(/);
  assert.match(src, /useIsMobile\(/);
  assert.match(src, /side="bottom"/, "mobile uses a bottom sheet, not a floating dialog");
  assert.match(src, /authPromptContext/);
  assert.match(src, /busyLabel=\{AUTH_COPY\.signingIn\}/);
  assert.doesNotMatch(src, /Sign in to generate|Sign in required/i);

  const gen = read("src/lib/generation/use-generation.ts");
  assert.match(gen, /authPromptContext/);
  const submitStart = gen.indexOf("async function submit(");
  const submitBody = gen.slice(submitStart, gen.indexOf('setPhase("starting")', submitStart));
  assert.match(submitBody, /setAuthPromptContext\(/);
});

// ---------- billing auth gate (Pricing / Buy credits while signed out) ----------

test("Pricing and Buy-credits keep the chosen plan/pack across auth instead of navigating away", () => {
  const cards = read("src/components/billing/PlanCards.tsx");
  assert.match(cards, /<BillingAuthDialog/);
  assert.match(cards, /planGateHeadline\(/);
  assert.doesNotMatch(
    cards,
    /navigate\(\{\s*to: ROUTES\.signUp/s,
    "no navigate-away on Get Pro/Max",
  );

  const sheet = read("src/components/billing/BuyCreditsSheet.tsx");
  assert.match(sheet, /<BillingAuthDialog/);
  assert.match(sheet, /PACK_GATE_HEADLINE/);
  assert.doesNotMatch(sheet, /ROUTES\.signUp/, "no navigate-away on Continue to checkout");

  const dialog = read("src/components/auth/BillingAuthDialog.tsx");
  assert.match(dialog, /savePendingCheckout\(/);
  assert.match(dialog, /useIsMobile\(/);
  assert.match(dialog, /side="bottom"/);

  const resume = read("src/lib/billing/use-resume-checkout.ts");
  assert.match(resume, /readPendingCheckout\(\)/);
  assert.match(resume, /clearPendingCheckout\(\)/);
  assert.match(resume, /startCheckout\(/);
  assert.match(read("src/components/billing/BuyCreditsProvider.tsx"), /useResumeCheckoutOnAuth\(/);
});
