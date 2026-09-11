// Visible commercial copy (pricing page, buy-credits sheet). Prices and
// allocations are never written here — they come from plans.ts.

export const PRICING_COPY = {
  eyebrow: "Pricing",
  headline: "Create more with Depikt.",
  sub: "Start free, then choose the amount of image creation you need. Image credits are used when you generate, edit, or regenerate an image.",
  toggleMonthly: "Monthly",
  /** $199 vs 12 × $19.99 and $399 vs 12 × $39.99 both save about 17%. */
  toggleYearly: "Yearly · save 17%",
  creditRule: "One credit = one generate, edit, or regenerate.",
  free: {
    name: "Free",
    credits: "5 image credits",
    note: "One-time starter credits. No credit card required.",
    includes: ["Explore all Depikt tools", "Generate and edit images"],
  },
  pro: {
    name: "Pro",
    note: "Approximately 40 generations, edits, or regenerations.",
    includes: ["Everything in Depikt", "Buy extra credits anytime"],
  },
  max: {
    name: "Max",
    note: "For frequent creation and iteration.",
    includes: ["Everything in Depikt", "Buy extra credits anytime"],
  },
  yearlyNote: "Billed once a year. Credits are added every month, not all at once.",
  cta: { free: "Start free", freeSignedIn: "Start creating", pro: "Get Pro", max: "Get Max" },
  current: "Current plan",
  continueCheckout: "Continue to checkout",
  packsHeading: "Need more image credits?",
  packsNote: "Purchased credits don't expire.",
  faqHeading: "Common questions",
} as const;

export const BUY_CREDITS_COPY = {
  title: "Get more image credits",
  body: "Keep creating without changing your plan.",
  footer: "Purchased credits don't expire.",
  rule: "1 credit = one generate, edit, or regenerate.",
  continue: "Continue to checkout",
} as const;
