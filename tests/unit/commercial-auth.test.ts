// Commercial launch, layer 1: AuthSurface, /sign-in, /sign-up, safe `next`,
// provider availability, header account chrome, and the shared provider
// chooser that replaces the hard-coded Google sign-in on Generate.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { safeNextPath } from "../../src/lib/auth/next-param.ts";
import {
  AUTH_PROVIDERS,
  enabledAuthProviders,
  isEmailAuthEnabled,
} from "../../src/lib/auth/providers.ts";
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

test("provider catalog is Email + Google, Apple, Microsoft, Lovable with short labels", () => {
  assert.deepEqual(
    AUTH_PROVIDERS.map((p) => p.id),
    ["google", "apple", "microsoft", "lovable"],
  );
  // Short labels for the 2x2 grid ("Google", not "Continue with Google");
  // AuthSurface itself supplies "Continue with email" for the email button.
  for (const p of AUTH_PROVIDERS) assert.doesNotMatch(p.label, /^Continue with /);
  assert.match(read("src/lib/product.ts"), /continueWithEmail: "Continue with email"/);
});

test("all five methods (email + four OAuth providers) are enabled by default; each has its own override flag", () => {
  assert.deepEqual(enabledAuthProviders({}), ["google", "apple", "microsoft", "lovable"]);
  assert.ok(isEmailAuthEnabled({}));
  assert.deepEqual(
    enabledAuthProviders({
      VITE_AUTH_APPLE_ENABLED: "false",
      VITE_AUTH_MICROSOFT_ENABLED: "false",
    }),
    ["google", "lovable"],
  );
  assert.deepEqual(enabledAuthProviders({ VITE_AUTH_GOOGLE_ENABLED: "false" }), [
    "apple",
    "microsoft",
    "lovable",
  ]);
  assert.equal(isEmailAuthEnabled({ VITE_AUTH_EMAIL_ENABLED: "false" }), false);
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

test("AuthSurface has both modes, passwordless email (magic link, never a password), and the sign-up legal line", () => {
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
  assert.match(src, /type="email"/, "email is now a real input, not OAuth-only");
  assert.match(
    src,
    /enabledAuthProviders\(/,
    "OAuth buttons must come from the enabled-provider list",
  );
  assert.match(src, /isEmailAuthEnabled\(/, "email must also be feature-flag gated");
  // /sign-in must never silently create an account via the email flow.
  assert.match(src, /shouldCreateUser: isSignUp/);
});

test("email sign-in never creates an account; sign-up does", () => {
  const ctx = read("src/lib/auth-context.tsx");
  assert.match(ctx, /signInWithOtp/);
  assert.match(ctx, /shouldCreateUser: opts\.shouldCreateUser/);
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
  // Fast navigation via the one AccountHub, not a second account
  // architecture -- see tests/unit/account-tabs.test.ts for the full
  // AccountMenu/AccountHub assertions.
  const menu = read("src/components/auth/AccountMenu.tsx");
  assert.match(menu, /useAccountHub\(/);
  assert.match(menu, /hub\.openHub\(/);
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

test("AuthGateDialog headline follows what the user already asked for, shows an excerpt/reference, and uses a centered dialog on every viewport", () => {
  const src = read("src/components/auth/AuthGateDialog.tsx");
  assert.match(src, /generationGateHeadline\(/);
  assert.match(src, /promptExcerpt\(/);
  assert.match(src, /AuthChooserDialog/);
  assert.doesNotMatch(src, /useIsMobile\(/);
  assert.doesNotMatch(src, /Sheet|side="bottom"/);
  assert.match(src, /authPromptContext/);
  assert.match(src, /busyLabel=\{AUTH_COPY\.signingIn\}/);
  assert.doesNotMatch(src, /Sign in to generate|Sign in required/i);

  const shell = read("src/components/auth/AuthChooserDialog.tsx");
  assert.match(shell, /DialogContent/);
  assert.match(shell, /max-w-\[440px\]/);
  assert.doesNotMatch(shell, /Sheet/);

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

  // The auth gate lives in BuyCreditsBody now -- shared by BuyCreditsSheet
  // and the AccountHub's own "buy-credits" view.
  const body = read("src/components/billing/BuyCreditsBody.tsx");
  assert.match(body, /<BillingAuthDialog/);
  assert.match(body, /PACK_GATE_HEADLINE/);
  assert.doesNotMatch(body, /ROUTES\.signUp/, "no navigate-away on Continue to checkout");

  const dialog = read("src/components/auth/BillingAuthDialog.tsx");
  assert.match(dialog, /savePendingCheckout\(/);
  assert.match(dialog, /AuthChooserDialog/);
  assert.doesNotMatch(dialog, /useIsMobile\(/);
  assert.doesNotMatch(dialog, /Sheet|side="bottom"/);

  const resume = read("src/lib/billing/use-resume-checkout.ts");
  assert.match(resume, /readPendingCheckout\(\)/);
  assert.match(resume, /clearPendingCheckout\(\)/);
  assert.match(resume, /startCheckout\(/);
  assert.match(read("src/components/billing/BuyCreditsProvider.tsx"), /useResumeCheckoutOnAuth\(/);
});

// ---------- regression: single OAuth start per click ----------

test("AuthGateDialog's OAuth click starts sign-in exactly once (skipOwnSignIn), email always through AuthSurface itself", () => {
  const dialog = read("src/components/auth/AuthGateDialog.tsx");
  assert.match(
    dialog,
    /skipOwnSignIn/,
    "AuthGateDialog must opt AuthSurface out of its own OAuth call",
  );
  assert.match(dialog, /if \(provider !== "email"\) gen\.chooseAuthProvider\(provider\)/);

  const surface = read("src/components/auth/AuthSurface.tsx");
  // With skipOwnSignIn, an OAuth click must return before AuthSurface's own signInWithProvider call.
  const startFnIdx = surface.indexOf("async function startProvider(");
  const startFnBody = surface.slice(startFnIdx, surface.indexOf("\n  }\n", startFnIdx));
  assert.match(startFnBody, /if \(skipOwnSignIn\) return;/);
  const skipIdx = startFnBody.indexOf("if (skipOwnSignIn) return;");
  const signInIdx = startFnBody.indexOf("await signInWithProvider(");
  assert.ok(skipIdx > 0 && signInIdx > skipIdx, "the skip must guard the signInWithProvider call");
  // Email has no equivalent caller-side starter, so it's never gated by skipOwnSignIn.
  const emailFnIdx = surface.indexOf("async function submitEmail(");
  const emailFnBody = surface.slice(emailFnIdx, surface.indexOf("\n  }\n", emailFnIdx));
  assert.doesNotMatch(emailFnBody, /skipOwnSignIn/);
});

// ---------- brand marks ----------

test("provider marks use real brand colors, not a monochrome placeholder", () => {
  const src = read("src/components/auth/AuthSurface.tsx");
  // Google's four-color G.
  for (const hex of ["#4285F4", "#34A853", "#FBBC05", "#EA4335"]) assert.ok(src.includes(hex), hex);
  // Microsoft's four-square mark.
  for (const hex of ["#F25022", "#7FBA00", "#00A4EF", "#FFB900"]) assert.ok(src.includes(hex), hex);
});

test("the dialog close control is a plain 32px icon button, not a filled gray circle", () => {
  const src = read("src/components/ui/dialog.tsx");
  const closeIdx = src.indexOf("DialogPrimitive.Close className=");
  const closeTag = src.slice(closeIdx, src.indexOf(">", closeIdx));
  // bg-black/60 belongs to the overlay backdrop, not the close button itself.
  assert.doesNotMatch(closeTag, /bg-black\/60/);
  assert.match(src, /h-8 w-8/);
});
