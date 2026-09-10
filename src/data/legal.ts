// Help, Privacy, and Terms content. Rendered through src/lib/markdown.tsx.
//
// Every fact here describes what Depikt actually does today. Items the owner
// or their legal counsel must decide are marked [OWNER INPUT: …] and are
// rendered verbatim so they cannot be published unnoticed
// (tests/unit/commercial-ux.test.ts checks the markers are still present;
// the launch checklist requires resolving them before going live).

export const LEGAL_LAST_UPDATED = "2026-09-10";

export interface HelpItem {
  q: string;
  a: string;
}
export interface HelpSection {
  id: string;
  title: string;
  items: HelpItem[];
}

export const HELP_SECTIONS: ReadonlyArray<HelpSection> = [
  {
    id: "getting-started",
    title: "Getting started",
    items: [
      {
        q: "What is one credit?",
        a: "One credit covers one successful image generation, edit, or regeneration. The model Depikt routes your request to never changes the price: every successful operation is exactly one credit.",
      },
      {
        q: "Why don't I choose an image model?",
        a: "Depikt routes each request automatically between the GPT Image 2.5 models based on the task: what you asked for, whether references are attached, and whether exact text is required. You describe the result; Depikt picks the route.",
      },
      {
        q: "How are image sizes chosen?",
        a: 'Depikt reads the ratio and orientation you ask for ("a tall poster", "16:9", "square icon") from your prompt or from the structured intent that Prompt Build produced, and from a reference image\'s shape when one is attached. If nothing is specified, it falls back to a sensible default for the task.',
      },
      {
        q: "Can I use reference images?",
        a: "Yes. Attach up to the reference limit shown in the composer. References are resized in your browser, stored privately under your account, and sent to the image model only for that job. Uploads are write-once in V1; deleting your account removes them.",
      },
      {
        q: "What happens if generation fails?",
        a: "A credit is reserved when a job starts and settled only when an image is produced. If the job fails for any reason (including a content-policy refusal from the model), the reserved credit is returned automatically to the bucket it came from. You are never charged for a failed operation.",
      },
    ],
  },
  {
    id: "plans-and-credits",
    title: "Plans and credits",
    items: [
      {
        q: "How do monthly credits work?",
        a: "Pro includes 40 image credits every month and Max includes 100. They are added at the start of each billing month. Annual subscribers pay once a year and still receive their credits month by month, not as one large pool.",
      },
      {
        q: "Do credits roll over?",
        a: "Plan credits do not roll over: any unused plan credits are replaced by the new month's allocation. Extra credits (your starter credits and any packs you buy) do not expire while your account exists, and they are only spent after your plan credits are used.",
      },
      {
        q: "Can I buy credits without subscribing?",
        a: "Yes. Any signed-in account, including Free, can buy a credit pack. Packs are one-time purchases, not subscriptions.",
      },
      {
        q: "What happens if I cancel?",
        a: "Cancelling stops the next renewal. Your plan and its monthly credits continue through the period you have already paid for (for annual plans, every remaining month of that year). When the paid period ends, unused plan credits are removed; your extra credits stay.",
      },
      {
        q: "How do I manage billing?",
        a: "Open Account and choose Manage billing. Stripe's billing portal handles payment methods, invoices, plan changes, cancelling, and reactivating.",
      },
    ],
  },
  {
    id: "your-account-and-data",
    title: "Your account and data",
    items: [
      {
        q: "Where are generated images stored?",
        a: "In private storage attached to your account. Only you can view or download them. Build and Critique history is kept in your own browser (IndexedDB) and never leaves your device unless you generate an image from it.",
      },
      {
        q: "How do I delete my account?",
        a: "Open Account and use Delete account at the bottom of the page. This cancels any active subscription immediately, removes your reference uploads and generated images, deletes your credits and account record, and signs you out. Purchase records that must be kept for accounting are retained without your name or email.",
      },
    ],
  },
];

export const PRIVACY_MD = `
_Last updated: ${LEGAL_LAST_UPDATED}_

This Privacy Policy describes what Depikt ("Depikt", "we") collects, why, and what happens to it. It is written to match how the product actually works. Where a detail depends on a decision the operator has not yet made, it is marked and will be completed before that section applies.

## Who operates Depikt

[OWNER INPUT: legal entity or individual name, country, and postal address of the operator of depikt.app.]

## What we collect

**Account information.** When you sign in with Google, Apple, or Microsoft, we receive the identity your provider shares with us: an identifier, your email address (Apple may provide a private relay address instead), and, where offered, your name and profile picture. We do not receive or store passwords. Sign-in is brokered by Lovable's managed OAuth service and sessions are issued by Supabase Auth.

**Prompts.** Text you enter in Prompt (Build and Critique) is sent to OpenAI to produce or review a prompt. Those requests are not tied to an account. Text you use to generate or edit an image is stored with that generation job so that you can see, regenerate, and edit your work.

**Reference images.** Images you attach are resized in your browser and uploaded to private storage under your account. They are sent to OpenAI only to run the job you requested.

**Generated images.** Every successful generation or edit is stored privately under your account, together with its prompt, size, the internal model route, and a technical usage record (including an estimate of the provider cost of that job).

**Credits and billing.** We keep a ledger of every credit change (starter grant, plan grants, purchases, reservations, refunds) and a billing record with your plan, subscription status, billing period, and your Stripe customer and subscription identifiers. We never see or store card numbers; payment details are entered on Stripe's hosted pages.

**Analytics.** We use Google Analytics 4 to understand how the site is used: page views and clicks on buttons and links (the visible label, the link target, and the page). We do not send prompt text, images, email addresses, or payment details to analytics. Google Analytics sets cookies; see Google's privacy documentation for how Google processes that data.

**Technical data.** Our hosting provider (Cloudflare) records standard request logs, including IP addresses, for security and operations. Fonts are loaded from Google Fonts, which receives your IP address when the font files are requested.

## Data stored in your browser

Depikt keeps some data only on your device: your Build and Critique history (including any reference image you attached, up to a size limit) in IndexedDB; favorites, theme, and library filters in localStorage; and short-lived hand-offs (for example, a generation you started before signing in) in sessionStorage. You can clear these through your browser at any time; deleting your account also clears them on the device you delete from.

## Who processes your data

- **OpenAI** — generates prompts and images. Per OpenAI's API data controls, inputs and outputs may be retained for a limited period for abuse monitoring and are not used to train OpenAI's models by default. [OWNER INPUT: confirm current OpenAI API data-retention terms at publication.]
- **Supabase** — database, authentication, and private file storage. [OWNER INPUT: hosting region of the Supabase project.]
- **Cloudflare** — hosting and edge network.
- **Lovable** — managed OAuth broker for Google, Apple, and Microsoft sign-in.
- **Stripe** — subscriptions, one-time purchases, invoices, and the billing portal.
- **Google** — Google Analytics 4 and Google Fonts.

We do not sell your data and do not share it with anyone else.

## How long we keep it

Your account data, generated images, reference images, and credit ledger are kept while your account exists. When you delete your account (Account → Delete account), we cancel any active subscription, remove your reference uploads and generated images from storage, and delete your account and credit records. We keep a minimal deletion record (a one-way hash of your email and your Stripe customer identifier) and purchase records without your name or email, because payment records may need to be retained for accounting, refund, and dispute purposes. Stripe retains its own records of your payments under Stripe's privacy policy. [OWNER INPUT: retention period for deletion and purchase records.]

## Security

Data is transmitted over HTTPS. Generated and uploaded images are stored in a private bucket readable only by the owning account. Database access is protected by row-level security, and payment processing never passes through our servers. No system is perfectly secure; if we learn of a breach affecting you, we will tell you.

## Your rights

Depending on where you live, you may have the right to access, correct, export, or delete your personal data, or to object to certain processing. You can view most of your data in the product and delete all of it yourself from the Account page. For anything else, use the contact below.

[OWNER INPUT: a working privacy contact (an email address or form). Privacy laws generally require one; Depikt has no support inbox today, so this must exist before commercial launch.]

## Age

[OWNER INPUT: minimum age (13 or 18) and the wording to use. Our providers' terms require users to be at least 13, and under 18 only with a parent's permission.]

## Changes

We will update this page when our practices change and update the date at the top. Material changes will be announced in the product.
`;

export const TERMS_MD = `
_Last updated: ${LEGAL_LAST_UPDATED}_

These Terms govern your use of Depikt (depikt.app). By creating an account or using the service you agree to them. Where a term depends on a decision the operator has not yet made, it is marked and will be completed before that section applies.

## 1. Who we are

[OWNER INPUT: legal entity or individual name and address of the operator.]

## 2. Accounts

You need an account (Google, Apple, or Microsoft sign-in) to generate or edit images. You are responsible for activity under your account. One account per person; do not create accounts to obtain additional starter credits. [OWNER INPUT: minimum age.]

## 3. The service

Depikt is a prompt workspace and image tool. It helps you find, build, and critique prompts, and it generates and edits images through a third-party model provider (OpenAI). Depikt selects the model route for each request; there is no model selector and no promise that any particular model is used. Results vary and are not guaranteed to match your request.

## 4. Credits

- **1 credit = one successful image generation, edit, or regeneration.** The model used does not change the cost.
- **Failed operations are not charged.** A credit is reserved when a job starts and automatically returned if no image is produced.
- **Starter credits.** New accounts receive a one-time grant of starter credits. They do not refresh and do not expire while the account exists.
- **Plan credits.** Pro and Max include a fixed number of credits each month. Unused plan credits reset at the start of the next billing month and do not roll over.
- **Extra credits.** Credits you purchase as packs do not expire while your account exists. They are spent after plan credits and are not affected by monthly resets or cancellation.
- Credits have no cash value, cannot be transferred, and are forfeited when your account is deleted or terminated for breach. [OWNER INPUT: legal review of credit-expiration and forfeiture wording for the jurisdictions you sell in.]

## 5. Subscriptions and billing

Pro and Max are recurring subscriptions billed monthly or annually through Stripe at the prices shown on the Pricing page at the time of purchase. Subscriptions renew automatically until cancelled. **Annual plans are billed once a year; their credits are granted monthly, not upfront.** Price changes apply from your next renewal and we will tell you in advance. Taxes may be added where required. [OWNER INPUT: notice period for price changes.]

## 6. Credit packs

Credit packs are one-time purchases through Stripe at the prices shown at the time of purchase. Credits are added to your account once payment is confirmed.

## 7. Cancellation

You can cancel from Account → Manage billing at any time. Cancellation stops the next renewal; your plan and its monthly credits continue through the period you have paid for. After that period ends, unused plan credits are removed and your extra credits remain.

## 8. Refunds

Failed image operations are refunded automatically in credits (section 4). [OWNER INPUT: the operator's refund policy for subscription payments and for unused credit packs must be approved before commercial launch. Default wording if approved: "Subscription payments are non-refundable except where required by law. Unused credit packs may be refunded within 14 days of purchase if none of the pack's credits have been used."]

## 9. Your content

You keep whatever rights you have in prompts and reference images you submit. You grant Depikt and its processors a licence to use them only to provide the service to you. You must have the right to submit any reference image, including the consent of any identifiable person in it.

## 10. Generated images

Subject to your compliance with these Terms and our provider's terms, Depikt does not claim ownership of images you generate, and our provider assigns to you its rights in that output to the extent it has any. Outputs may not be unique: other users may receive similar or identical images, and AI-generated images may not be eligible for copyright protection in your jurisdiction. Depikt makes no promise about commercial or exclusive use beyond what the provider's terms allow.

## 11. Acceptable use

Do not use Depikt to create or share content that is illegal, that sexualises minors, that depicts real people in intimate or deceptive contexts without consent, that infringes others' intellectual property or likeness rights, that is intended to defraud or harass, or that violates OpenAI's usage policies. Requests the provider's safety systems refuse are not charged. We may remove content, refuse service, or terminate accounts that breach this section.

## 12. Third-party providers

Generation depends on OpenAI, hosting on Cloudflare, data on Supabase, sign-in on Lovable's OAuth broker, and payments on Stripe. Their availability and policies affect the service and are outside our control.

## 13. Availability and changes

Depikt is provided as-is and may change, pause, or end features, models, credits, or pricing. We will give reasonable notice of material changes that affect paid plans. We do not guarantee uninterrupted availability.

## 14. Termination

You can delete your account at any time from the Account page. We may suspend or terminate accounts that breach these Terms. Extra credits are forfeited on termination for breach. [OWNER INPUT: confirm this forfeiture stance.]

## 15. Disclaimers and liability

To the fullest extent permitted by law, Depikt is provided without warranties of any kind, and our total liability to you for any claim is limited to the amount you paid us in the twelve months before the claim. Nothing in these Terms limits liability that cannot be limited by law.

## 16. Governing law and disputes

[OWNER INPUT: governing law, venue, and whether disputes go to arbitration.]

## 17. Changes to these Terms

We may update these Terms. The date at the top shows the current version; continued use after a change means you accept it.
`;
