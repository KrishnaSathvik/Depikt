// Help, Privacy, and Terms content. Rendered through src/lib/markdown.tsx.
//
// Privacy and Terms describe only what Depikt actually does today. A few
// facts only the operator can decide (legal entity/address,  governing law/venue, a day-by-day refund policy) are not
// yet resolved -- rather than publish an invented company name or
// jurisdiction, those clauses are omitted entirely until they're real. See
// docs/internal/legal-launch-todos.md for the private checklist (never
// linked from the product) and tests/unit/commercial-ux.test.ts, which
// fails the build if a "[OWNER INPUT" marker (or any of these omitted
// clauses' old wording) ever reappears in rendered public copy.

/** ISO date the policies below took effect. Bump only when the policy text actually changes. */
export const LEGAL_LAST_UPDATED = "2026-09-30";

/** "2026-09-24" -> "September 24, 2026". Used in the page header, never in the markdown body. */
export function formatEffectiveDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

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
        a: 'Depikt reads the ratio and orientation you ask for ("a tall poster", "16:9", "square icon") from your prompt or from the description prepared by Improve prompt, and from a reference image\'s shape when one is attached. If nothing is specified, it falls back to a sensible default for the task.',
      },
      {
        q: "What happens after I press Generate?",
        a: "Depikt reserves one credit per image in your confirmed request, sends your prompt and references to the routed model, and shows progress. A series reserves one credit for each selected image. Successful images settle their credit; failed images return their reserved credit automatically.",
      },
      {
        q: "What happens if generation fails?",
        a: "A credit is reserved when a job starts and settled only when an image is produced. If the job fails for any reason (including a content-policy refusal from the model), the reserved credit is returned automatically to the bucket it came from. You are never charged for a failed operation.",
      },
      {
        q: "Does research or checking the result use a credit?",
        a: "No. When Depikt researches context for a request, validates requested details, or applies one included automatic refinement, those stages do not use an image credit. You still spend one credit only for each successful generate, edit, or regenerate.",
      },
    ],
  },
  {
    id: "images-and-references",
    title: "Images and references",
    items: [
      {
        q: "Can I use reference images?",
        a: "Yes. Attach references in the composer and Depikt uses them to guide the result. References are resized in your browser, stored privately under your account, and sent to the image model only for that job.",
      },
      {
        q: "How many references can I add?",
        a: "Attach up to 4 individual reference images or up to 4 saved Reference Packs. Each pack can store up to 8 views; Depikt selects views within an 8-image input budget when packs are attached.",
      },
      {
        q: "What is grounded generation?",
        a: "When your request needs current, factual, or visual context that your prompt and references do not already provide, Depikt can research before generating. Sources may appear with the result when research ran. Research does not use an image credit.",
      },
      {
        q: "What does validation and automatic refinement do?",
        a: "After an image is created, Depikt can check requested details such as exact text or counts. If something is repairable, it may refine once automatically at no extra credit and keep the best usable result. Manual generate, edit, and regenerate still cost one credit each.",
      },
      {
        q: "Can I edit an existing generated image?",
        a: "Yes. Describe the change you want and Depikt applies it to your last generated image as a new job. You can also select an area for a precision edit. Edits use one credit, the same as any successful generation.",
      },
      {
        q: "What does Regenerate do?",
        a: "Regenerate image reruns the same prompt and references to produce a new version of the image -- useful when the idea is right but you want a different take. It costs one credit, like any other successful generation. In Improve prompt, Rebuild prompt rewrites the text prompt and does not use a credit.",
      },
      {
        q: "Where can I find my generated images?",
        a: "In Account → Creations, and in private storage attached to your account. Only you can view or download them.",
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
        q: "Do purchased credits expire?",
        a: "No. Credit packs do not expire while your account exists.",
      },
      {
        q: "What happens when I run out?",
        a: "You'll be prompted to buy a credit pack or upgrade your plan before your next generation, edit, or regeneration goes through. Nothing is charged automatically.",
      },
      {
        q: "What happens if I cancel?",
        a: "Cancelling stops the next renewal. Your plan and its monthly credits continue through the period you have already paid for (for annual plans, every remaining month of that year). When the paid period ends, unused plan credits are removed; your extra credits stay.",
      },
      {
        q: "How do annual plans work?",
        a: "You're billed once a year, but credits are still granted monthly rather than all at once -- the same 40 (Pro) or 100 (Max) credits land in your account each billing month.",
      },
      {
        q: "How do I manage billing?",
        a: "Open Account and choose Manage billing. Stripe's billing portal handles payment methods, invoices, plan changes, cancelling, and reactivating.",
      },
    ],
  },
  {
    id: "account-and-data",
    title: "Account and data",
    items: [
      {
        q: "How do I sign in?",
        a: "Choose an available sign-in option on the sign-in screen: supported providers or a passwordless email link. Availability is shown there. Depikt does not use passwords.",
      },
      {
        q: "How do I change my profile or avatar?",
        a: "Open Account and use the edit button beside your identity to update your display name or username. Select your avatar to choose a new one.",
      },
      {
        q: "How do I contact support?",
        a: "Email [depiktapp@gmail.com](mailto:depiktapp@gmail.com) for help with your account, billing, or privacy requests.",
      },
      {
        q: "How do I delete my account?",
        a: "Open Account and use Delete account at the bottom of the page. This cancels any active subscription immediately, removes your reference uploads and generated images, deletes your credits and account record, and signs you out.",
      },
      {
        q: "What happens to my data when I delete my account?",
        a: "Your reference uploads, generated images, and account and credit records are removed. Purchase records that must be kept for accounting are retained without your name or email.",
      },
    ],
  },
];

export const PRIVACY_INTRO =
  "Depikt stores the information needed to operate your account and generation history. Reference images and generated images tied to your account are stored privately. Prompt and image processing may be handled by service providers such as OpenAI. When research is needed, short search queries may be sent to a web search provider. Payment card details are handled by Stripe, not stored directly by Depikt.";

export const PRIVACY_MD = `
## Overview

This Privacy Policy describes what Depikt collects, why, and what happens to it. It is written to match how the product actually works today.

## Information we collect

**Account information.** When you sign in with a supported identity provider, we receive the identity your provider shares with us: an identifier, your email address (Apple may provide a private relay address instead), and, where offered, your name and profile picture. Passwordless email sign-in uses your email address to send an authentication link. We do not receive or store passwords. Sign-in is brokered by Lovable's managed OAuth service and sessions are issued by Supabase Auth.

**Prompts.** Text you enter in Improve prompt and Critique is sent to OpenAI to produce or review a prompt. Text you use to generate or edit an image is stored with that generation job so that you can see, regenerate, and edit your work.

**Reference images.** Images you attach are resized in your browser and uploaded to private storage under your account. They are sent to OpenAI only to run the job you requested.

**Generated images.** Every successful generation or edit is stored privately under your account, together with its prompt and size. When research or validation ran for a job, related status and source metadata may be stored with that result.

**Research queries.** When grounded generation needs current or visual context, Depikt may send short search queries derived from your request to a web search provider. Returned snippets and image thumbnails are used only to support that job; they are not used for advertising.

**Credits and billing.** We keep a ledger of every credit change (starter grant, plan grants, purchases, reservations, refunds) and a billing record with your plan, subscription status, and billing period.

## How we use information

We use this information to run your account: authenticate you, process the generation or edit you asked for (including research and validation when those stages run), show you your credit balance and history, keep your Creations and drafts available across sessions, process payments, and understand how the product is used so we can improve it. We do not use your prompts, reference images, or generated images for advertising.

## AI and image processing

Prompt and image requests are sent to OpenAI to produce the result. Per OpenAI's API data controls, inputs and outputs may be retained for a limited period for abuse monitoring and are not used to train OpenAI's models by default. Validation checks that need OCR or visual judgment also use OpenAI.

## Service providers

- **OpenAI** — generates prompts and images, and supports validation checks.
- **Brave Search** — web and image search when grounded generation needs external context.
- **Supabase** — database, authentication, and private file storage.
- **Cloudflare** — hosting and edge network.
- **Lovable** — managed OAuth broker for Google, Apple, and Microsoft sign-in.
- **Stripe** — subscriptions, one-time purchases, invoices, and the billing portal. We never see or store your card number; payment details are entered on Stripe's hosted pages.
- **Google** — Google Analytics 4 and Google Fonts.

We do not sell your data and do not share it with anyone else.

## Storage and retention

Your account data, generated images, reference images, and credit ledger are kept while your account exists. When you delete your account (Account → Delete account), we cancel any active subscription, remove your reference uploads and generated images from storage, and delete your account and credit records. We keep a minimal deletion record and purchase records without your name or email, because payment records may need to be retained for accounting, refund, and dispute purposes. Stripe retains its own records of your payments under Stripe's privacy policy.

## Analytics and browser storage

We use Google Analytics 4 to understand how the site is used: page views and clicks on buttons and links. We do not send prompt text, images, email addresses, or payment details to analytics.

Depikt also keeps some data only on your device: your Improve prompt and Critique history (including any reference image you attached, up to a size limit) in IndexedDB; favorites, theme, and library filters in localStorage; and short-lived hand-offs (for example, a generation you started before signing in) in sessionStorage. You can clear these through your browser at any time; deleting your account also clears them on the device you delete from.

## Payments

Subscriptions and credit-pack purchases are processed by Stripe. Depikt keeps your plan, subscription status, billing period, and your Stripe customer and subscription identifiers -- never your card details.

## Your choices and account deletion

You can update your profile, manage billing, and delete your account at any time from the Account page. Signing out ends your session on that device. You can clear or manage Depikt's browser-stored data (history, favorites, preferences) through your browser's own settings.

## Contact

For support or privacy requests, email [depiktapp@gmail.com](mailto:depiktapp@gmail.com).

## Security

Data is transmitted over HTTPS. Generated and uploaded images are stored in a private bucket readable only by the owning account. Database access is protected by row-level security, and payment processing never passes through our servers. No system is perfectly secure; if we learn of a breach affecting you, we will tell you.

## Age

Users must be at least 13 years old, or the minimum age required in their country to use online services. Users under 18 must have permission from a parent or legal guardian.

## Changes to this policy

We will update this page when our practices change and update the effective date above. Material changes will be announced in the product.
`;

export const TERMS_MD = `
## 1. Using Depikt

By creating an account or using Depikt (depikt.app) you agree to these Terms.

## 2. Accounts

You need an account (using an available identity provider or passwordless email sign-in) to generate or edit images. You are responsible for activity under your account. One account per person; do not create accounts to obtain additional starter credits. You must be at least 13 years old, or the minimum age required in your country to use online services, and if you are under 18 you need permission from a parent or legal guardian.

## 3. The service

Depikt is an image creation workspace. Create images on Home, discover prompts, templates, and references in Library, and manage private creations and Reference Packs in Account. Improve prompt and Critique are optional tools. Images are generated and edited through a third-party model provider (OpenAI). Depikt selects the model route for each request; there is no model selector and no promise that any particular model is used. Results vary and are not guaranteed to match your request.

## 4. Image credits

- **1 credit = one successful image generation, edit, or regeneration.** The model used does not change the cost.
- **Failed operations are not charged.** A credit is reserved when a job starts and automatically returned if no image is produced.
- **Research, validation, and one included automatic refinement do not use an image credit.** They may run as part of a request when needed; only the successful image operations above spend credits.
- **Starter credits.** New accounts receive a one-time grant of starter credits. They do not refresh and do not expire while the account exists.
- **Plan credits.** Pro and Max include a fixed number of credits each month. Unused plan credits reset at the start of the next billing month and do not roll over.
- **Extra credits.** Credits you purchase as packs do not expire while your account exists. They are spent after plan credits and are not affected by monthly resets.
- Credits have no cash value and cannot be transferred between accounts.

## 5. Plans, payments, and cancellation

Pro and Max are recurring subscriptions billed monthly or annually through Stripe at the prices shown on the Pricing page at the time of purchase. Subscriptions renew automatically until cancelled. **Annual plans are billed once a year; their credits are granted monthly, not upfront.** Taxes may be added where required.

You can cancel any time from Account → Manage billing. Cancellation stops the next renewal; your plan and its monthly credits continue through the period you have already paid for. After that period ends, unused plan credits are removed and your extra credits remain.

**Refunds.** Failed image operations are refunded automatically in credits (section 4). Refunds for subscription or credit-pack purchases are handled according to applicable law and any refund terms shown at the time of purchase.

## 6. Credit packs

Credit packs are one-time purchases through Stripe at the prices shown at the time of purchase. Credits are added to your account once payment is confirmed.

## 7. Your content

You keep whatever rights you have in prompts and reference images you submit. You grant Depikt and its processors a licence to use them only to provide the service to you. You must have the right to submit any reference image, including the consent of any identifiable person in it.

## 8. Generated images

Depikt does not claim ownership of images you generate beyond what's needed to operate the service. Outputs may not be unique: other users may receive similar or identical images, and AI-generated images may not be eligible for copyright protection in your jurisdiction. You are responsible for how you use generated images.

## 9. Acceptable use

Do not use Depikt to create or share content that is illegal, that sexualises minors, that depicts real people in intimate or deceptive contexts without consent, that infringes others' intellectual property or likeness rights, that is intended to defraud or harass, or that violates OpenAI's usage policies. Requests the provider's safety systems refuse are not charged. We may remove content, refuse service, or terminate accounts that breach this section.

## 10. Service availability and changes

Depikt is provided as-is and may change, pause, or end features, models, credits, or pricing. We will give reasonable notice of material changes that affect paid plans. We do not guarantee uninterrupted availability.

## 11. Account suspension or termination

You can delete your account at any time from the Account page. We may suspend or terminate accounts that breach these Terms.

## 12. Disclaimer

To the fullest extent permitted by law, Depikt is provided without warranties of any kind, and our total liability to you for any claim is limited to the amount you paid us in the twelve months before the claim. Nothing in these Terms limits liability that cannot be limited by law.

For account, billing, or other support, email [depiktapp@gmail.com](mailto:depiktapp@gmail.com).

## 13. Changes to these Terms

We may update these Terms. The effective date above shows the current version; continued use after a change means you accept it.
`;
