# Depikt Commercial Launch Audit

Date: 2026-09-10 · Branch: `phase5-image-generation-foundation` · Audit and research pass only. Nothing was implemented, migrated, or configured.

Sources: the repo at `a1fe494`, the production Supabase project's public REST/auth endpoints (read-only probes with the anon key; the Supabase MCP connector returned "permission denied", so row counts and ledger contents could not be inspected), and the official Stripe, Supabase, Lovable, and OpenAI documentation fetched today. Competitor prices come from third-party 2026 summaries because Midjourney, Ideogram, and Leonardo block automated fetches; they are marked "verify" below.

---

## 1. Existing Auth

### What is actually in the repo

| Piece | File | Behavior |
|---|---|---|
| Session context | `src/lib/auth-context.tsx` | `AuthProvider` subscribes to `supabase.auth.onAuthStateChange`, then `getSession()`. Exposes `user`, `session`, `loading`, `signOut`. No sign-in method is exposed here. |
| Supabase client | `src/integrations/supabase/client.ts` | Publishable key, `persistSession: true`, `autoRefreshToken: true`. Storage is `brokeredPreviewStorage()`: `localStorage` everywhere except inside a framed Lovable preview, where the session is brokered to the editor over `postMessage`. |
| OAuth | `src/integrations/lovable/index.ts` + `@lovable.dev/cloud-auth-js@1.1.2` | `lovable.auth.signInWithOAuth(provider)` for `google \| apple \| microsoft \| lovable`. Top-level window: hard-navigates to `/~oauth/initiate?provider=…&redirect_uri=…&state=…`. Inside an iframe: popup + `web_message`, then `supabase.auth.setSession(tokens)`. |
| The only sign-in trigger | `src/lib/generation/use-generation.ts:307` | Clicking Generate while signed out saves the pending submission to `sessionStorage` and calls `signInWithOAuth("google", { redirect_uri: window.location.href })`. Google is hard-coded. |
| Pending-intent resume | `src/lib/generation/pending-generation.ts` | Survives the OAuth hard navigation; resubmits with the original idempotency key. |
| Server auth | `src/lib/generation/auth.ts`, `src/integrations/supabase/auth-middleware.ts` | Bearer JWT → `supabase.auth.getClaims(token)` → request-scoped client bound to the user's JWT. RLS does ownership. |
| Service-role client | `src/integrations/supabase/client.server.ts` | Exists (generated) but `SUPABASE_SERVICE_ROLE_KEY` is not in `.env.local` or `.env.example`. Nothing uses it today. |
| Dev-only email/password | `src/lib/dev-auth.ts`, `src/components/DevAuthBanner.tsx` | Guarded by `import.meta.env.DEV && VITE_DEV_AUTH_ENABLED`. Uses `signInWithPassword` / `signUp` against the **production** Supabase project. |
| Auth attacher middleware | `src/integrations/supabase/auth-attacher.ts` | Generated for serverFn RPCs; not registered (no `src/start.ts`). The generation routes attach the bearer token themselves. |

### Production auth settings (from `GET /auth/v1/settings`)

| Setting | Value | Meaning |
|---|---|---|
| `external.google` | `true` | Google is the only social provider enabled. |
| `external.apple`, `external.azure` | `false` | Apple and Microsoft buttons would fail today even though the client library supports them. |
| `external.email` | `true` | Email/password is enabled at the API level with no UI. Anyone with the publishable key can call `signUp` (this is how dev-auth works). |
| `mailer_autoconfirm` | `false` | Email confirmation is required for email signups. |
| `disable_signup` | `false` | Open signups. |
| `passkeys_enabled`, `phone` | `false` | Not used. |

### Answers to Part A

1. **Public auth methods:** Google OAuth only, and only from a Generate click. No sign-in page exists anywhere. Email/password is reachable via the API but has no product surface.
2. **Login vs signup:** The same OAuth flow. Supabase creates the user on first Google sign-in.
3. **`/login`, `/signup`:** Neither route exists in `src/routes/`. CLAUDE.md's "redirect home" note refers to routes that were deleted; there is nothing to redirect. `/critique` and `/generate` are the only redirect routes.
4. **Email/password:** Enabled server-side, dev-only in the client.
5. **Email confirmation:** On. Supabase's default mailer applies (2 emails/hour, team-member recipients only), so confirmation emails would not reach real users. No custom SMTP configured.
6. **Password reset:** Not implemented.
7. **Account deletion:** Not implemented. No storage delete policy either (`20260910140000`).
8. **Session refresh:** supabase-js `autoRefreshToken` in the browser. Server routes validate each request's JWT with `getClaims`.
9. **Lovable ↔ Supabase:** Lovable's broker at `/~oauth/initiate` performs the provider handshake and returns Supabase access/refresh tokens. In the top-level redirect path the tokens must arrive back on `redirect_uri` and be picked up by supabase-js (`detectSessionInUrl` default); in the iframe path `setSession` is explicit. **Verify:** the exact return mechanism on depikt.app was not observed in this audit. The broker path only exists on Lovable-hosted surfaces; `vite dev` 404s (that is why dev-auth exists).
10. **Identity linking:** Supabase links identities automatically when the same verified email signs in through different providers (Google, Apple, Microsoft all count as verified). Linking adds an `auth.identities` row; it does not create a new `auth.users` row. An email/password signup against an existing OAuth email returns an obfuscated response with no email sent. Apple "Hide My Email" relay addresses will **not** link to a Google account with the real address; that user gets a second account.
11. **Production vs localhost:** Production: Google via Lovable broker. Localhost: OAuth broker 404s; dev email/password banner instead. Lovable preview iframe: popup flow with brokered session storage.
12. **Reuse:** Keep `AuthProvider`, the Lovable OAuth wrapper, `authenticateGenerationRequest`, the pending-generation resume, and `brokeredPreviewStorage`. Add a sign-in surface, an account menu, and a service-role path for webhooks and deletion. Do not rewrite.

### Gaps

- No sign-in page, no account page, no header auth state, no sign-out anywhere in product UI (only the dev banner).
- Apple and Microsoft are not enabled in Supabase/Lovable Cloud.
- Dev QA runs against the production Supabase project and creates a real user there.
- `profiles` table does not exist (REST returns 404). Legacy `prompts` and `favorites` tables from the Phase-2 auth work still exist in the DB and generated types but nothing writes to them (favorites and history are Dexie/IndexedDB).
- `SUPABASE_SERVICE_ROLE_KEY` is absent. Stripe webhooks and account deletion cannot run as a user JWT, so this becomes a required Worker secret (owner action).

---

## 2. Recommended Auth UX

### Options compared

| | A: Google + Apple + Microsoft | B: A + email/password | C: A + magic link / OTP |
|---|---|---|---|
| Friction | One click, no email loop | Password creation + confirmation email | One email round trip per sign-in |
| Implementation | Enable two providers in Lovable Cloud (managed mode: no Apple Developer or Azure account needed), one sign-in surface | Sign-up, sign-in, forgot, reset, confirm routes; password rules; leaked-password check | Send + verify routes, PKCE `/auth/confirm` handler |
| Email delivery | None needed | Custom SMTP required (Supabase default: 2/hour, team-only, no SLA; after custom SMTP an initial 30/hour cap) | Same custom SMTP requirement |
| Password reset | N/A | Required | N/A |
| Identity linking | Automatic on verified email | Blocked if the email already exists via OAuth (obfuscated response) | Automatic |
| Local dev | Needs dev-auth banner (broker 404s) | Works locally | Needs SMTP locally |
| User expectation | Fine for a creative tool; Apple covers iOS users, Microsoft covers work accounts | Some users expect it | Growing but still confuses some users |
| Support burden | Lowest | Highest (resets, "didn't get the email") | Medium |

### Recommendation: Option A for V1

Google, Apple, and Microsoft, all in Lovable "Managed by Lovable" mode. Rationale: the only auth that exists today is Google and it already works end to end with pending-generation resume; managed Apple and Microsoft are dashboard toggles with zero credential setup; Option A needs no email provider, no reset flow, and no confirmation emails; Supabase links the three providers automatically on a verified email. Known managed-mode limits: consent screens show Lovable's name (Microsoft, Apple) and scopes are fixed to email + basic profile. Switching to own credentials later does not affect existing users.

Keep the email provider enabled in Supabase only because dev-auth depends on it; do not surface it. Revisit Option C (magic link) once a transactional email provider is added for other reasons.

### Sign-in / sign-up surface

Recommend both `/sign-in` and `/sign-up` as routes, rendered by **one component** with copy swapped. With OAuth-only there is no functional difference; two URLs exist because users and search engines look for both, and the header CTA can point to `/sign-up`. Both accept `?next=/generate` (validated to be a same-origin path) and pass it through as `redirect_uri`.

```
/sign-in                          /sign-up
Sign in to Depikt                 Create your Depikt account
[Continue with Google]            [Continue with Google]
[Continue with Apple]             [Continue with Apple]
[Continue with Microsoft]         [Continue with Microsoft]
New to Depikt? Create an account  Already have an account? Sign in
                                  By continuing you agree to the Terms and Privacy Policy.
```

No email fields, no "or continue with email" divider, no `/forgot-password` route in V1. The Generate click keeps its current inline OAuth behavior (no detour through `/sign-in`) but should present the provider choice instead of hard-coding Google; simplest is a small dialog with the three buttons that reuses the same component.

---

## 3. Existing Credits

All three Phase-5 migrations are applied in production (REST returns 200 for `credit_accounts`, `credit_ledger`, `generation_sessions`, `generation_jobs`, `image_versions`; the `create_generation_job` RPC exists).

### Schema (`20260910120000`)

- `credit_accounts(user_id PK → auth.users cascade, available_credits ≥ 0, reserved_credits ≥ 0, created_at, updated_at)`. Owner SELECT only. No client write policy.
- `credit_ledger(id, user_id, entry_type, amount, job_id, idempotency_key, reason, created_at)`. Append-only, owner SELECT only. `UNIQUE (user_id, idempotency_key)`. `entry_type ∈ {starter_grant, subscription_grant, top_up, generation_reservation, generation_charge, refund, manual_adjustment}`.

### RPCs (SECURITY DEFINER, granted to `authenticated`)

| RPC | Semantics |
|---|---|
| `reserve_generation_credits(user, amount, key, reason)` | Locks the account row (`FOR UPDATE`), creates the account with 0 credits if missing, moves `amount` from available → reserved, writes `generation_reservation` with `amount = -1`. Replays by key return the existing ledger id. |
| `finalize_generation_credits(user, amount, key, outcome, job)` | `charged`: reserved −1, writes `generation_charge` with **amount 0** (the reservation row already carries the −1). `refunded`: reserved −1, available +1, writes `refund` +1. Idempotent by `key:outcome`. |
| `create_generation_job(...)` (`20260910130000`) | Reserves and inserts the job in one transaction; replay by key returns the existing job. |

### Answers to Part E

- **Available / reserved:** two integer columns; reservation is a 1-credit hold for the job's lifetime.
- **Ledger:** every balance change is a row; "used this period" = count of `generation_reservation` rows minus `refund` rows (charge rows are 0-amount markers).
- **Idempotency:** `(user_id, idempotency_key)` on both ledger and jobs; the client generates the key before auth so an OAuth round trip cannot double-charge.
- **Ownership:** all rows keyed by `auth.users.id`; RLS owner-read; writes only via RPCs.
- **Current grants:** there is **no grant path in code**. Accounts are created with 0 credits on first reservation. Any balance a QA user has today came from SQL run in the dashboard (no script or SQL file in the repo records it).
- **Failed generation refund:** implemented and locked (`finalize … 'refunded'`); the UI already says "Your credit was returned."

### Can the ledger support the commercial model?

Mostly yes. Entry types for `starter_grant`, `subscription_grant`, `top_up`, `refund`, `manual_adjustment` already exist. What is missing:

1. A way to expire subscription credits without expiring purchased ones (single `available_credits` bucket cannot tell them apart).
2. A grant path that is server-enforced and idempotent (none exists).
3. Stripe references on ledger rows (`stripe_ref`), a `bucket` column, and `subscription_reset` / `plan_change_adjustment` entry types.
4. Subscription state storage (no table today).

---

## 4. Credit Architecture Changes Needed (additive only)

### Balance model: one account row, two buckets

Keep `credit_accounts` and add `plan_credits` and `purchased_credits`. `available_credits` stays as the maintained total (`plan_credits + purchased_credits`) so the existing GET route and UI keep working unchanged.

- **Spend priority:** `plan_credits` first, then `purchased_credits`. Reservation records the split on the ledger row (`bucket = 'plan' | 'purchased' | 'plan+purchased'`, or two rows). Refund returns to the bucket it came from.
- **Monthly grant is a reset, not an add:** at each grant, write `subscription_reset` (negative, the unused plan credits) then `subscription_grant` (+allocation). Purchased credits untouched.
- **Cancellation:** on `customer.subscription.deleted`, `subscription_reset` to 0. Purchased credits remain.
- Reserved credits are unaffected by resets (a job in flight keeps its hold).

Two separate balance tables were considered and rejected: more joins, same information.

### New RPCs (all SECURITY DEFINER, idempotent by ledger key)

| RPC | Key | Notes |
|---|---|---|
| `grant_starter_credits(user)` | `starter:<user_id>` | Called by the auth trigger (below). |
| `grant_subscription_credits(user, allocation, period_key)` | `sub_grant:<subscription_id>:<period_key>` | Reset + grant. `period_key` = Stripe `current_period_start` for monthly, `current_period_start:<month_index>` for annual slices. |
| `apply_top_up(user, credits, checkout_session_id)` | `top_up:<session_id>` | Adds to `purchased_credits`. |
| `adjust_credits(user, bucket, delta, reason, ref)` | caller-supplied | Manual/refund adjustments; may go negative-guarded. |
| `reserve_generation_credits` (modify) | unchanged | Debit `plan_credits` first, then `purchased_credits`; store split. |

Grants are executed by the webhook route with the service-role client. Nothing in the browser can call a grant RPC (revoke from `authenticated`; grant to `service_role` only).

### Starter grant: database trigger

`AFTER INSERT ON auth.users` → `handle_new_user()` (SECURITY DEFINER, `search_path = public`) inserts `credit_accounts` (plan 0, purchased = starter amount, or a separate `starter` bucket treated as purchased/non-expiring) and a `starter_grant` ledger row keyed `starter:<user_id>`.

- Runs exactly once per `auth.users` row. Identity linking (Google then Apple with the same email) does not insert a second user, so no second grant.
- Server-enforced, ledger-backed, client-independent.
- Trade-off: Supabase warns a failing trigger blocks signups. Keep it to two inserts, test on a branch. Alternative (`before-user-created` auth hook, or a lazy first-request grant in `/api/generation/credits`) is more moving parts; the lazy path also races unless keyed, and the trigger is simpler.
- Abuse note: delete-and-recreate with the same email yields a new user id and a new grant. Accept for V1; optional later mitigation is a `starter_grants(email_hash)` table checked by the trigger.

### Subscription state: `billing_accounts` (new table)

```
billing_accounts
  user_id                 uuid PK → auth.users ON DELETE CASCADE
  stripe_customer_id      text UNIQUE
  plan_key                text NOT NULL DEFAULT 'free'   -- free | pro | max
  stripe_subscription_id  text UNIQUE
  stripe_price_id         text
  subscription_status     text        -- Stripe's exact status string
  billing_interval        text        -- month | year
  current_period_start    timestamptz
  current_period_end      timestamptz
  cancel_at_period_end    boolean NOT NULL DEFAULT false
  monthly_credit_allocation integer NOT NULL DEFAULT 0
  next_credit_grant_at    timestamptz -- annual plans only
  last_grant_period_key   text
  created_at / updated_at
```
Owner SELECT via RLS; writes only by service role. A separate `profiles` table is not needed for V1: email and provider come from the JWT/`auth.users`.

Plus:

```
stripe_events(id text PK, type text, created timestamptz, processed_at timestamptz, error text)
credit_purchases(checkout_session_id text PK, user_id uuid, pack_key text, credits int,
                 amount_cents int, currency text, status text, created_at timestamptz)
```
`credit_ledger` gains `bucket text`, `stripe_ref text`; entry-type check gains `subscription_reset`, `plan_change_adjustment`.

### Annual subscriptions with monthly grants

Stripe bills once a year and sends no monthly invoice. Recommended mechanism: **lazy grant on access** plus an optional sweep.

1. `invoice.paid` for an annual invoice grants month 1 and sets `next_credit_grant_at = current_period_start + 1 month`.
2. `GET /api/generation/credits` and `POST /api/generation/jobs` call `grant_due_subscription_credits(user)` (SECURITY DEFINER, callable by the user's JWT since it only affects the caller): if `next_credit_grant_at <= now()` and `subscription_status = 'active'`, reset+grant with key `sub_grant:<sub>:<period_start>:<n>`, advance `next_credit_grant_at` by one month, repeat until caught up. Idempotent, no scheduler, no service role.
3. Optional later: `pg_cron` (Supabase extension, owner enables) or a Cloudflare Cron Trigger to sweep daily so the Account page is current even for users who have not visited.

Monthly plans use `invoice.paid` (`billing_reason = subscription_cycle`) as the grant trigger; the lazy RPC is a no-op for them because `next_credit_grant_at` is null.

---

## 5. Competitor Pricing Research (verify before quoting publicly)

| Product | Free | Entry | Mid | High | Annual | Top-ups | Rollover |
|---|---|---|---|---|---|---|---|
| Midjourney | None (trial removed 2023) | Basic $10 (3.3 fast GPU-h) | Standard $30 (15 h) | Pro $60 (30 h), Mega $120 (60 h) | 20% off ($8/$24/$48/$96) | $4 per extra fast hour, does not expire | Fast hours reset monthly |
| Ideogram | ~10 slow credits/week | Basic $8 (400 priority credits) | Plus $20 / $15 annual (1,000 credits) | Pro $60 / $42 annual (3,000–3,500 credits) | ~25–30% off | $4 packs (150 on Plus, 250 on Pro); roll over; spent after subscription credits | Subscription credits expire monthly |
| Adobe Firefly (official page) | Daily free generations, resets daily | Standard $9.99 (2,000 credits) | Pro $19.99 (4,000) | Pro Plus $49.99 (10,000), Premium $199.99 (50,000) | Monthly and annual variants | Add-on packs from 2,000 credits | "Do not roll over" |
| Leonardo | 150 tokens/day | $12 / $10 annual (8,500 tokens) | $30 / $24 annual (25,000) | $60 / $48 annual (60,000) | ~20–30% off | Add-on tokens | Varies by plan |
| ChatGPT Plus | Free tier limited | $20 (roughly 50 image prompts / 3 h per community reports; no published cap) | | Pro $200 | | | |

Takeaways: entry tiers cluster at $8–12, mid tiers at $20–30, annual discounts at 20–30%, and every product sells non-expiring or rollover top-ups while expiring subscription credits monthly. Their per-image economics (diffusion models, own GPUs, slow queues) are not comparable to Depikt's $0.21–0.22 API cost per max-quality GPT Image 2.5 operation. Depikt cannot compete on volume; it competes on the workflow (library, Prompt engine, references, versions, editing). The pricing page copy must lean on that.

---

## 6. Depikt Economics

Inputs: COGS per credit $0.21 / $0.22 (planning baseline) / $0.24 (variance). Card fee 2.9% + $0.30 per charge (US). Stripe Billing 0.7% on subscription volume (Billing Starter; verify on Stripe's pricing page). Stripe Tax 0.5% of volume only in registered jurisdictions, if enabled. Refunds do not return Stripe fees. Disputes $15.

Per-credit price needed for a target pre-fee gross margin at $0.22 COGS:

| Target GM | Price per credit |
|---|---|
| 60% | $0.55 |
| 65% | $0.63 |
| 70% | $0.73 |
| 75% | $0.88 |

Which target: aim for **65–70% pre-fee at full utilization, 60–65% after processing fees**. Real utilization is below 100%, which lifts realized margin, but planning on breakage is how image products end up underwater when a power user shows up. 75% would push Pro above $18 for 20 credits and hurt conversion.

---

## 7. Proposed Plans

### Candidates (full utilization, $0.22 COGS, monthly billing)

| Candidate | Pro | Max | Pro GM pre / post fees | Max GM pre / post fees |
|---|---|---|---|---|
| A: Value | $12 · 20 credits ($0.60) | $30 · 60 credits ($0.50) | 63% / 57% | 56% / 51% |
| **B: Recommended** | **$15 · 20 credits ($0.75)** | **$40 · 60 credits ($0.67)** | **71% / 65%** | **67% / 63%** |
| C: Volume | $20 · 30 credits ($0.67) | $50 · 80 credits ($0.63) | 67% / 62% | 65% / 61% |

A misses the margin target on Max. C has the best absolute margin per subscriber but a $20 entry price in a market whose entry tiers are $8–12. B keeps entry at $15, stays inside the requested bands, and both tiers clear 60% after fees.

### Recommendation

| | Free | Pro | Max |
|---|---|---|---|
| Monthly price | $0 | $15 | $40 |
| Annual price (20% off) | – | $144 ($12/mo effective) | $384 ($32/mo effective) |
| Credits | 3 one-time starter credits | 20 / month | 60 / month |
| Price per credit | – | $0.75 monthly · $0.60 annual | $0.67 monthly · $0.53 annual |
| Full-utilization COGS @ $0.21 / 0.22 / 0.24 | $0.63 / 0.66 / 0.72 | $4.20 / 4.40 / 4.80 | $12.60 / 13.20 / 14.40 |
| GM pre-fee (monthly, @0.22) | – | 70.7% | 67.0% |
| GM post-fee (monthly, @0.22) | – | 65.1% ($9.76) | 62.7% ($25.06) |
| GM post-fee (monthly, @0.24) | – | 62.4% | 59.7% |
| GM post-fee (annual, @0.22) | – | 59.5% ($7.14/mo) | 55.1% ($17.62/mo) |
| Ideal customer | Trying generation | Regular creator, a few images a week | Daily producer, agencies, iterative editors |

Annual at 15% instead of 20% lifts post-fee GM to 61.7% (Pro) and 57.5% (Max). 20% is recommended for market parity and upfront cash; the owner can pick 15% if annual margin matters more than conversion (owner decision).

Everything else stays open to every user: Library, Prompt, Gallery, Templates, Blog, MCP. Do not invent gates. The only paid differentiator is generation capacity, and that is enough for V1. One additional entitlement worth considering later, not now: longer generation history retention for paid plans.

---

## 8. Credit Packs (one-time, `mode=payment`)

| Pack | Price | $/credit | COGS @0.22 | GM pre-fee | Card fee | GM post-fee |
|---|---|---|---|---|---|---|
| 10 credits | $9 | $0.90 | $2.20 | 75.6% | $0.56 | 69.3% ($6.24) |
| 25 credits | $20 | $0.80 | $5.50 | 72.5% | $0.88 | 68.1% ($13.62) |
| 50 credits | $36 | $0.72 | $11.00 | 69.4% | $1.34 | 65.7% ($23.66) |
| (later) 100 credits | $65 | $0.65 | $22.00 | 66.2% | $2.19 | 62.8% ($40.81) |

Ship three packs (10 / 25 / 50). Per-credit pack prices sit above the subscription per-credit price, so the subscription stays the better deal and packs are the convenience purchase. No Billing fee applies to one-time payments.

Policy recommendation:

- **Who can buy:** any signed-in user, including Free. It is the lowest-friction first revenue and there is no reason to force a subscription to buy 10 credits. Cap at 5 pack purchases per user per day to blunt card testing.
- **Expiry:** purchased credits do not expire while the account exists. They are forfeited on account deletion.
- **Rollover:** purchased credits are not touched by monthly resets.
- **Spend order:** subscription credits first, purchased second (the same rule Ideogram documents; it is what users expect because the expiring ones should go first).
- **Legal flag:** some jurisdictions regulate expiration and refundability of prepaid credits. The "do not expire" stance is the safe default; the forfeiture-on-deletion clause needs legal review.

---

## 9. Stripe Architecture

### Flows

```
Subscribe
  Account/Pricing → POST /api/billing/checkout {priceKey}
  → server: ensure Stripe customer (create once, store stripe_customer_id)
  → Checkout Session mode=subscription, customer=cus_…, client_reference_id=<user_id>,
    metadata.supabase_user_id, success_url=/account?checkout=success&session_id={CHECKOUT_SESSION_ID},
    cancel_url=/pricing, allow_promotion_codes optional, automatic_tax if enabled
  → Stripe-hosted Checkout
  → webhook checkout.session.completed + customer.subscription.* + invoice.paid → billing_accounts + grant
  → /account loader also calls fulfill(session_id) as the fast path (Stripe's recommended landing-page fulfillment);
    webhook remains authoritative

Top-up
  Purchase sheet → POST /api/billing/checkout {packKey}
  → Checkout Session mode=payment, customer=cus_…, metadata {supabase_user_id, pack_key, credits}
  → webhook checkout.session.completed (payment_status=paid) → credit_purchases upsert + apply_top_up

Manage billing
  Account → POST /api/billing/portal → billing_portal.sessions.create({customer, return_url: /account})
  → Stripe Customer Portal → return to /account (re-read billing_accounts; webhook already updated it)
```

Restrict Checkout payment methods to cards (and Link) in V1 so `checkout.session.async_payment_succeeded/failed` are not needed. Checkout sessions expire after 24 hours by default.

### Customer ↔ user mapping

- Canonical: `billing_accounts.stripe_customer_id` (unique) ↔ `auth.users.id`. Stripe customer `metadata.supabase_user_id` mirrors it for dashboard debugging.
- Created lazily at the first Checkout, never from email lookups. Email on the customer is a billing detail only; Stripe's own docs say not to treat the billing email as a login credential.
- Every Checkout Session is created with the stored `customer` id, so Stripe never creates a duplicate customer.

### Webhook endpoint: `POST /api/billing/webhook`

Not behind the generation feature flag, not behind the per-IP rate limiter, no CORS headers, raw body read once for signature verification. On Cloudflare Workers use the Stripe SDK's async verifier (`constructEventAsync` with the SubtleCrypto provider).

Processing order: verify signature → `INSERT INTO stripe_events (id, type) ON CONFLICT DO NOTHING`; if the insert did nothing, return 200 (duplicate) → handle → set `processed_at` → 200. Handlers must tolerate out-of-order delivery (Stripe does not guarantee order); each handler re-reads the Stripe object by id rather than trusting the event payload's snapshot for status.

| Event | Effect in Depikt |
|---|---|
| `checkout.session.completed` | `mode=payment` and `payment_status=paid`: upsert `credit_purchases`, `apply_top_up` (idempotent by session id). `mode=subscription`: store `stripe_customer_id`/`stripe_subscription_id` if missing; fetch the subscription and run the same sync as `customer.subscription.updated`. |
| `customer.subscription.created` / `updated` | Sync `subscription_status`, `stripe_price_id` → `plan_key` + `monthly_credit_allocation` + `billing_interval`, `current_period_*`, `cancel_at_period_end`. On an upgrade mid-period (price changed, same period), write `plan_change_adjustment` for the allocation delta keyed `plan_change:<sub>:<period_start>:<new_price>`. |
| `customer.subscription.deleted` | `plan_key = free`, allocation 0, `subscription_reset` plan credits to 0, clear `next_credit_grant_at`. Purchased credits untouched. |
| `invoice.paid` | If `billing_reason ∈ {subscription_create, subscription_cycle}` and status `active`: `grant_subscription_credits` keyed on the period. Annual: also set `next_credit_grant_at`. |
| `invoice.payment_failed` | Record `last_payment_failed_at`; status sync comes via `subscription.updated`. Used only for the in-app banner. Stripe Smart Retries and dunning emails do the rest (Dashboard setting). |
| `charge.refunded` | Log only in V1; credits are adjusted manually via `adjust_credits`. |

Not subscribed: `invoice.created`, `invoice.upcoming`, `payment_intent.*`, `customer.updated`, Entitlements events. Stripe Entitlements are unnecessary for two plans whose only feature is a credit allocation; plan state lives in `billing_accounts`.

### Billing states → entitlement

| Stripe status | Depikt plan | New grants | Existing plan credits | Purchased credits | UI |
|---|---|---|---|---|---|
| `active` | pro/max | yes | usable | usable | normal |
| `trialing` | not used (no trials) | – | – | – | – |
| `incomplete` | free until paid | no | none | usable | "Payment not completed" on Account |
| `incomplete_expired` | free | no | none | usable | treat as never subscribed |
| `past_due` | pro/max (grace) | no (next grant needs `invoice.paid`) | usable | usable | banner: "Payment failed. Update billing →" |
| `unpaid` | free | no | reset to 0 | usable | banner + Manage billing |
| `canceled` | free | no | reset to 0 | usable | "Plan ended" on Account |
| `paused` | not reachable without trials | treat as `unpaid` | | | |
| `active` + `cancel_at_period_end` | pro/max until period end | no further | usable until end | usable | "Ends Oct 10 · Reactivate" |

### Plan changes (Portal handles the money; Depikt handles credits)

| Change | Stripe behavior | Depikt |
|---|---|---|
| Pro → Max | Portal, immediate, prorated (`create_prorations`) | `plan_change_adjustment` +40 once per period |
| Max → Pro | Portal configured to schedule downgrades at period end | Nothing until the new period's `invoice.paid` |
| monthly → annual | Portal, immediate; Stripe resets the billing date to the switch date and prorates | Treat as a new period: grant keyed on the new `current_period_start` |
| annual → monthly | Schedule at period end | Nothing until then |
| Cancel at period end | Portal (`cancel_at_period_end=true`) → `subscription.updated` | Show end date; credits continue |
| Reactivate | Portal sets `cancel_at_period_end=false` before period end | Clear the end-date UI |

No custom proration logic in Depikt.

### Trials

No paid-plan trial. Starter credits already let a user test generation; a Stripe trial would add `trialing`/`paused` states, `trial_will_end` emails, and pause/cancel behavior for nothing.

---

## 10. Account Experience: `/account` (private, noindex)

```
ACCOUNT
  Signed in as name@example.com · Google

PLAN
  Pro · Renews Oct 10           (or: Free · [View plans])
  [Manage billing]              (portal session; hidden on Free with no customer id)

CREDITS
  18 credits remaining
  Included this month: 12 of 20 left · resets Oct 10
  Purchased: 6 (never expire)
  [Buy credits]

USAGE
  Last 10 image operations: date · Generate/Edit · 1 credit · status
  (from generation_jobs; link to /generate to reopen)

DANGER
  Delete account
```

That is the whole V1 page. No invoices (Portal), no payment methods (Portal), no charts.

---

## 11. Out-of-Credits UX

Pattern: an **inline panel** in place of the composer's error line, matching the existing inline error treatment in `GenerateWorkspace` and `InlineGenerationPanel`. Not a modal (interrupts the composer), not a full sheet (overkill for two buttons). The purchase sheet opens from the primary button.

```
You're out of image credits.
Generate, edit, and regenerate each use 1 credit.
[Get more credits]   [View plans]
```

Trigger: the 402 from `POST /api/generation/jobs` sets a `creditState = "exhausted"` in `useGeneration` instead of a generic `errorMessage`. Also pre-empt the request: when `credits === 0` and the user is signed in, the Generate button opens the same panel without calling the API.

| User | Copy variant | Primary | Secondary |
|---|---|---|---|
| Free | "Your 3 starter credits are used." | Get more credits (packs) | View plans |
| Pro | "You've used this month's 20 credits. They reset Oct 10." | Get more credits | Upgrade to Max |
| Max | "You've used this month's 60 credits. They reset Oct 10." | Get more credits | – |
| Canceled (plan ended) | "Your plan ended. Purchased credits still work." | View plans | Get more credits |
| Past due | "Your last payment failed, so this month's credits weren't added." | Update billing (portal) | Get more credits |

Purchase sheet (`components/ui/sheet.tsx`, one reusable `BuyCreditsSheet`): three pack cards, price, "never expire", Continue to checkout. Opened from the out-of-credits panel, the Account page, and the account menu. Nowhere else.

---

## 12. Pricing Page: `/pricing` (public, index)

Does not exist today. Structure:

```
eyebrow: Pricing
h1: Create more with Depikt.
sub: Every plan includes the Library, Prompt, Gallery, Templates, and Blog. Credits are for generating and editing images.

[Monthly | Yearly (save 20%)]

Free                Pro                          Max
$0                  $15/mo · $12/mo yearly       $40/mo · $32/mo yearly
3 starter credits   20 image credits / month     60 image credits / month
                    ≈ 20 generations or edits    ≈ 60 generations or edits
[Create account]    [Subscribe]                  [Subscribe]

Need more? Credit packs: 10 for $9 · 25 for $20 · 50 for $36. Never expire.

FAQ (4–6 items, shared with /help): What is one credit? Do credits roll over? Can I cancel? What happens when I run out?
```

Signed-out CTAs go to `/sign-up?next=/pricing`; signed-in CTAs start Checkout directly. JSON-LD: `Product`/`Offer` per plan is optional; at minimum update the root `WebApplication` offer (currently `price: "0"`) to the plan range. Dedicated OG card for `/pricing` is justified (it gets shared).

---

## 13. Privacy Audit

No `/privacy` route exists. Nothing in product UI links to a privacy policy. The policy must describe what Depikt actually does:

| Area | Actual behavior to disclose |
|---|---|
| Account data | Email, name, avatar from Google/Apple/Microsoft via Lovable-managed OAuth and Supabase Auth. Apple relay emails. |
| Prompts and inputs | Prompts sent to OpenAI for Build/Critique (`/api/public/*`, unauthenticated) and for generation. Stored server-side only for generation (`generation_jobs.prompt`, `image_versions.prompt`). |
| Reference uploads | Resized client-side, uploaded to a private Supabase Storage bucket under `users/<id>/`, sent to OpenAI for the job. Write-once; no delete policy today. |
| Generated images | Stored privately in Supabase Storage; immutable versions; visible only to the owner. |
| Generation records | Sessions, jobs, model alias, size, usage JSON, estimated API cost per job. |
| OpenAI | Processor. Per OpenAI's API data controls, inputs/outputs are retained up to 30 days for abuse monitoring and not used for training by default (verify current wording before publishing). |
| Supabase | Database and storage host; region unknown to this audit (owner input). |
| Cloudflare | Hosting/edge; IP addresses in logs. |
| Lovable | OAuth broker; sees the sign-in handshake. |
| Stripe | Billing. Depikt never sees card numbers. Stripe customer id, subscription state, and purchase records are stored. |
| Google Analytics | GA4 with pageviews and delegated click tracking (button labels, link URLs). Cookies. |
| Google Fonts | Loaded from `fonts.googleapis.com` (IP disclosure to Google). |
| Local storage | IndexedDB (Dexie): Build/Critique history including reference images (up to 50 entries) and favorites. `localStorage`: theme, library filters, Supabase session. `sessionStorage`: pending generation, handoff, template values. |
| Retention / deletion | No deletion today. Policy must reflect whatever Phase 6 ships (see §15). |
| Age | Owner decision (13+ or 18+; OpenAI's consumer terms require 13+ and parental consent under 18; API terms differ). |
| Rights, changes, security | Standard sections. No certifications claimed. |

Owner/legal inputs required: legal entity name, address, controller contact (a privacy contact channel is generally required by privacy laws even if no support email is published; a dedicated `privacy@` address or form is the minimum), Supabase region, governing law, effective date, age threshold.

---

## 14. Terms Audit

No `/terms` route exists. Required coverage and the decisions behind each:

| Clause | Content | Needs owner/legal |
|---|---|---|
| Acceptance, eligibility | Age threshold, one account per person, account responsibility | age |
| Service description | Prompt workspace + native generation routed between GPT Image 2.5 models; no model selection; results vary | – |
| Subscriptions | Pro/Max, recurring monthly or annual, auto-renew, price changes with notice | notice period |
| Annual billing | Charged upfront; credits granted monthly; cancellation stops renewal, no partial refund | refund stance |
| Credits | 1 credit = 1 successful generate/edit/regenerate; subscription credits reset monthly and do not roll over; purchased credits do not expire while the account exists; failed operations return the credit automatically | prepaid-credit law review |
| Refunds | See §17 | policy |
| Cancellation | Any time via Manage billing; effective at period end | – |
| Generated content | Depikt passes through OpenAI's assignment: user owns output to the extent permitted by law; outputs may not be unique; no warranty of copyrightability | legal review |
| User uploads | User warrants rights to reference images; license to Depikt/processors solely to provide the service | – |
| Acceptable use | Mirror OpenAI usage policies: no sexual content involving minors, no non-consensual intimate imagery, no deceptive impersonation of real people, no IP infringement, no illegal content; Depikt may refuse or remove | – |
| Third-party providers | OpenAI, Stripe, Supabase, Cloudflare, Lovable, Google | – |
| Availability, changes, termination | Best-effort, may change models/pricing/credits with notice, may terminate for abuse; purchased credits on termination for cause | policy |
| Disclaimers, liability cap | Standard | jurisdiction |
| Governing law, disputes | Placeholder | jurisdiction, arbitration? |

Do not publish until an owner has reviewed; mark the file with a review date.

### Image content / ownership policy language (Part AA)

- Uploads: user retains ownership; grants a limited license; must have rights (including likeness rights for identifiable people).
- Output: "Subject to your compliance with these terms, Depikt does not claim ownership of images you generate. Our provider assigns its rights in output to the user; outputs may be similar to other users' outputs and may not be protectable by copyright." Do not promise commercial-use guarantees beyond OpenAI's terms.
- Prohibited: the OpenAI usage-policy categories above, plus reference images of third parties without consent, and trademarks/characters the user has no right to reproduce.
- Provider policies: state that generation is subject to OpenAI's usage policies and content filters, and that filtered requests still refund the credit (they do: the job fails and `finalize … 'refunded'` runs).

---

## 15. Account Deletion

Nothing exists. Recommended flow, before commercial launch:

1. `/account` → "Delete account" → confirm dialog requiring the user to type `DELETE`.
2. `POST /api/account/delete` (user JWT auth, then service-role client):
   a. If `stripe_subscription_id` is active: cancel immediately (`DELETE /v1/subscriptions/:id`), no refund (owner decision: immediate vs at period end; immediate is simpler and matches "delete now").
   b. List and remove storage objects under `users/<uid>/` in `generation-assets` (no cascade for storage; requires service role or a scoped delete policy).
   c. Write `deleted_accounts(user_id, email_hash, stripe_customer_id, deleted_at)` so refund/chargeback questions can be answered later (owner/legal: retention period).
   d. `auth.admin.deleteUser(uid)` → cascades `credit_accounts`, `credit_ledger`, `generation_*`, `image_versions`, `billing_accounts`, legacy `favorites`.
   e. Sign out client, clear Dexie history and local storage, redirect home.
3. Stripe keeps the customer, invoices, and charges (financial records). Do not delete the Stripe customer.
4. `stripe_events` and `credit_purchases` are keyed by Stripe ids; decide whether `credit_purchases.user_id` should `SET NULL` rather than cascade (recommend `ON DELETE SET NULL` for the audit trail).

---

## 16. Header, Account Menu, Credit Indicator, Footer

### Header

Primary nav unchanged: Library · Prompt · Generate · Gallery · Blog. The header's right side is currently empty (logo left, nav centered), so there is room.

- **Signed out:** one text link, `Sign in` → `/sign-in`. Not "Sign in + Get started": the hero and Generate already carry the primary CTA, and two buttons crowd the 14px nav on tablet.
- **Signed in:** a 28px avatar/initial button → dropdown (`components/ui/dropdown-menu.tsx`):
  ```
  name@example.com
  18 credits
  ──────
  Account
  Buy credits
  Manage billing        (only when a Stripe customer exists)
  ──────
  Sign out
  ```
- Mobile: same avatar in the top bar; the scrollable tab row is untouched.

### Credit indicator

Two places only: the Generate composer line that already exists ("18 credits remaining") and the account menu. No persistent header pill. Build and Critique inline panels show the count only in the out-of-credits state.

### Footer

Replace the one-line footer with four short columns; still white, hairline, quiet.

```
PRODUCT        RESOURCES     ACCOUNT      LEGAL
Library        Blog          Pricing      Privacy
Prompt         Templates     Sign in      Terms
Generate       MCP
Gallery        Help
                                          © 2026 Depikt · A workspace for better image prompts.
```
No "Sign up" in the footer. Templates and MCP stay footer-only. When signed in, "Sign in" becomes "Account".

---

## 17. SEO, Analytics, Emails, Tax, Refunds, Expiration

### SEO

Conventions today: every route defines `head()` with title, description, canonical, OG image via `getOgImageForPath`, and JSON-LD; the sitemap is hand-listed; `robots.txt` disallows only `/api/`. There is no `noindex` anywhere yet, so introduce the convention `{ name: "robots", content: "noindex, nofollow" }` in `head()` and keep private routes out of the sitemap.

| Route | Index | Title | Description | Canonical | OG |
|---|---|---|---|---|---|
| `/pricing` | index | "Pricing \| Depikt" | "Free to start. Pro and Max plans with monthly image credits, plus credit packs that never expire." | yes | dedicated card |
| `/help` | index | "Help \| Depikt" | "How credits, generation, references, billing, and your account work in Depikt." | yes | default |
| `/privacy` | index | "Privacy Policy \| Depikt" | "How Depikt handles account data, prompts, reference images, generated images, billing, and analytics." | yes | default |
| `/terms` | index | "Terms of Service \| Depikt" | "Terms for using Depikt, subscriptions, credits, and generated images." | yes | default |
| `/sign-in`, `/sign-up` | noindex | "Sign in \| Depikt" / "Create account \| Depikt" | – | yes | default |
| `/account` | noindex + `Disallow: /account` in robots | "Account \| Depikt" | – | none | none |

Add `/pricing`, `/help`, `/privacy`, `/terms` to the sitemap. Strings live in `SEO` in `src/lib/product.ts`; `product-phase3.test.ts` style tests should cover the new keys.

### Analytics (GA4, `trackEvent`)

Existing: pageviews, delegated `ui_click`, `generate_auth_requested`, `generate_submitted`. Add, using GA4 recommended names where one exists:

| Event | GA4 name | Params | Where |
|---|---|---|---|
| signup_started | `sign_up` (method) | provider | auth surface click |
| signup_completed / signin_completed | `login` (method) | provider, `is_new_user` | `onAuthStateChange` SIGNED_IN (new user detected by `created_at` within 60 s) |
| pricing_viewed | `view_item_list` | interval | `/pricing` mount |
| plan_selected | `select_item` | plan, interval | plan CTA |
| checkout_started | `begin_checkout` | plan or pack, value, currency | before redirect |
| checkout_completed | `purchase` | transaction_id = session id, value, currency, items | `/account?checkout=success` after server verification |
| credits_purchase_started / completed | same two events with `item_category = credit_pack` | | |
| credits_exhausted | custom | plan | out-of-credits panel shown |
| upgrade_prompt_viewed | custom | context | same panel |
| billing_portal_opened | custom | | Manage billing |
| subscription_cancelled | custom | plan | webhook cannot reach GA; fire client-side on Account when `cancel_at_period_end` flips to true, or skip |

Never send card data, prompt text, image data, or full Stripe payloads. Mark `purchase` and `sign_up` as conversions in GA4 (owner action).

### Emails

No provider exists. V1 minimum with OAuth-only auth: **zero custom emails**. Turn on in Stripe: successful-payment receipts, failed-payment and dunning emails (Smart Retries), upcoming-renewal reminder for annual plans (recommended for annual since it is a larger charge). A "credits low" email is a later feature that would require Resend or similar plus custom SMTP in Supabase if auth emails are ever needed.

### Tax

Not tax advice. Selling subscriptions and credit packs to consumers can create sales-tax/VAT/GST obligations by jurisdiction (many US states tax SaaS/digital goods; EU/UK VAT applies to B2C digital services from the first sale). Stripe Tax pay-as-you-go is 0.5% of volume in jurisdictions where you are registered, with free threshold monitoring. Recommendation: enable Stripe Tax threshold monitoring from day one, and enable `automatic_tax` on Checkout only after the owner decides where to register. Owner decision.

### Refunds (owner approval required before Terms/checkout)

| Case | Technical | Commercial recommendation |
|---|---|---|
| Failed generation | Locked: credit auto-returned | State it plainly in Help and Terms |
| Subscription payment | Stripe refund via Dashboard; fees not returned; canceling does not refund | "Non-refundable except where required by law; cancel anytime, access continues to period end" |
| Unused credit pack | Manual: Stripe refund + `adjust_credits` | "Refundable within 14 days if no credits from the pack were used" (or non-refundable; owner choice) |
| Partially used pack | Manual | Non-refundable |
| Chargeback | $15 fee; consider zeroing purchased credits on dispute | Policy note in Terms |

### Expiration

- Subscription credits: reset at each grant; unused amount is written off (`subscription_reset`). No rollover.
- Purchased credits: never expire while the account exists; forfeited on deletion or termination for abuse.
- Both are stated on the pricing page, in the purchase sheet, and in Terms. Legal review on prepaid-credit expiration rules.

---

## 18. Help / FAQ

Route: `/help` (not `/faq`, not `/support`). "Help" is honest without a human channel and can grow. Structure: one page, anchored sections, plain markdown rendered by the existing blog renderer, no accordion.

```
HELP
Getting started
  What is one credit?
  How does generation work?
  Why don't I choose a model?
  How are image sizes chosen?
  Can I use reference images?
  What happens if a generation fails?
Plans and credits
  When do credits renew?
  Can I buy more credits?
  Do purchased credits expire?
  What happens if I cancel?
  How do I manage billing?
Your data
  Where are my generated images stored?
  Is my prompt history stored on the server?
  How do I delete my account and data?
```
No "Contact support", no email, no chat, no "24/7". Optionally one line at the end: "More ways to get help are coming." Only if it does not read as a broken promise; safe to omit.

---

## 19. Final Information Architecture

```
PUBLIC   /  /library  /prompt  /generate  /gallery  /templates  /blog  /blog/:slug
         /integrations/mcp  /mcp (endpoint)  /pricing  /help  /privacy  /terms
AUTH     /sign-in  /sign-up            (one component; noindex)
PRIVATE  /account                      (noindex; robots Disallow)
API      /api/billing/checkout  /api/billing/portal  /api/billing/webhook  /api/account/delete
         (existing /api/generation/*, /api/public/*)
REDIRECTS /critique → /prompt?mode=critique (existing)
```
No `/forgot-password` in V1 (no passwords).

---

## 20. External Dashboard Actions (owner)

| System | Action |
|---|---|
| Lovable Cloud → Users → Auth settings | Enable Apple (managed) and Microsoft (managed); confirm depikt.app redirect URLs; confirm Google managed mode consent branding is acceptable |
| Lovable / hosting | Confirm depikt.app is served by Lovable publishing (the `/~oauth/initiate` broker must exist on that origin). A bare `wrangler deploy` would break OAuth |
| Supabase | Run Phase 6 migrations via SQL Editor; enable `pg_cron` only if the sweep is wanted; decide on a separate dev branch so QA stops creating users in production; provide `SUPABASE_SERVICE_ROLE_KEY` as a Worker secret (never in `.env` committed files) |
| Stripe | Create account; Products: Pro, Max (monthly + yearly prices), packs 10/25/50 (one-time prices); Customer Portal config (payment method update, invoice history, cancel at period end, plan switch between Pro/Max, downgrades at period end); webhook endpoint `https://depikt.app/api/billing/webhook` with the six events; signing secret; branding; receipts and dunning emails; Smart Retries; payment-failure behavior after retries = mark `unpaid`; optional Stripe Tax monitoring |
| Cloudflare Worker env | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` ids, `SUPABASE_SERVICE_ROLE_KEY`, `GENERATION_ENABLED` |
| GA4 | Mark `purchase`, `sign_up` as conversions |
| Legal | Entity, address, privacy contact, governing law, age, refund stance, credit-expiration review |

---

## 21. Implementation Phases (after approval)

Each phase ends with `npm test`, `npm run typecheck`, `npm run lint`, and a live check; stop if the stop condition trips.

### 6A · Auth surface and account chrome
Goal: users can sign in and out from the product without touching Generate.
Files: `src/routes/sign-in.tsx`, `src/routes/sign-up.tsx`, `src/components/auth/AuthSurface.tsx`, `src/components/Header.tsx` (Sign in link, account menu), `src/lib/product.ts` (labels, SEO keys, `ROUTES.signIn/signUp/account`), `src/lib/auth-context.tsx` (expose `signInWithProvider`), `use-generation.ts` (provider chooser instead of hard-coded Google), tests in `tests/unit/`.
Dependencies: Apple/Microsoft enabled in Lovable Cloud.
Production actions: none.
Tests: route heads (noindex), `next` param validation, pending-generation resume still passes.
Stop: OAuth return on depikt.app does not restore the session for any of the three providers.

### 6B · Credit entitlement architecture
Goal: buckets, grants, starter trigger, `billing_accounts`, `stripe_events`, `credit_purchases`.
Files: `supabase/migrations/20260911xxxxxx_add_billing_and_credit_buckets.sql`, `src/integrations/supabase/types.ts` regen, `src/lib/billing/plans.ts` (plan/pack catalog: keys, credits, price ids from env), `src/routes/api/generation/credits.ts` (return buckets + plan + period), `supabase-data-access.ts` untouched.
Dependencies: none on Stripe.
Production actions: owner runs the migration; verify a fresh signup gets 3 credits.
Tests: RPC behavior via a Postgres test if available, else SQL-level checks on a branch; unit tests for the catalog.
Stop: the auth trigger fails on a test signup on a branch.

### 6C · Stripe backend and webhooks
Goal: authoritative subscription and purchase state.
Files: `src/lib/billing/stripe.ts` (client, customer ensure), `src/routes/api/billing/webhook.ts`, `src/routes/api/billing/checkout.ts`, `src/routes/api/billing/portal.ts`, `src/lib/billing/sync.ts` (event → billing_accounts + grants), `src/integrations/supabase/client.server.ts` (first real use).
Dependencies: 6B; Stripe products, prices, webhook secret; service-role secret in Worker env.
Production actions: register the endpoint; `stripe listen` locally for QA.
Tests: handler unit tests with fixture events (duplicate id, out-of-order `invoice.paid` before `subscription.created`, annual month-2 lazy grant, upgrade delta once).
Stop: signature verification cannot run on Workers (SubtleCrypto path), or any grant is not idempotent under replay.

### 6D · Pricing, Checkout, top-ups
Goal: money in.
Files: `src/routes/pricing.tsx`, `src/components/billing/PlanCards.tsx`, `src/components/billing/BuyCreditsSheet.tsx`, `src/lib/og-routes.ts` (pricing card), sitemap, `product.ts` SEO, analytics events.
Dependencies: 6A, 6C.
Production actions: live-mode prices; a $9 pack test purchase and refund.
Tests: pricing strings, interval toggle math, checkout route auth (401 when signed out).
Stop: Checkout success does not land back on `/account` with the purchase reflected within one webhook retry.

### 6E · Account, billing, usage
Goal: `/account` with plan, credits, usage, Manage billing.
Files: `src/routes/account.tsx`, `src/components/account/*`, loader that verifies `?session_id` and calls fulfillment.
Dependencies: 6C.
Tests: noindex head, redirect to `/sign-in?next=/account` when signed out.
Stop: portal session creation fails for a customer created via Checkout.

### 6F · Insufficient-credit flows
Goal: no dead ends.
Files: `use-generation.ts` (`creditState`), `GenerateWorkspace.tsx`, `InlineGenerationPanel.tsx`, `BuildMode.tsx`, `CritiqueMode.tsx` (panel), shared `OutOfCreditsPanel.tsx`.
Dependencies: 6D.
Tests: 402 → panel; 0-credit pre-check; variants per plan/state.
Stop: none beyond tests.

### 6G · Privacy, Terms, Help, Footer
Goal: legal and self-service surfaces.
Files: `src/routes/privacy.tsx`, `terms.tsx`, `help.tsx`, `src/data/legal/*.md` (rendered by the markdown renderer), `Footer.tsx`, sitemap.
Dependencies: owner/legal inputs; 6D/6E copy finalized.
Stop: any placeholder (`[OWNER INPUT]`) remains in the rendered page.

### 6H · Account deletion and commercial launch QA
Goal: deletion works; end-to-end run in live mode with a real card; rollback plan.
Files: `src/routes/api/account/delete.ts`, Account danger zone, `deleted_accounts` migration.
QA checklist: three providers sign in; starter grant once; subscribe monthly and annual; month-2 lazy grant with a Stripe test clock; upgrade/downgrade; cancel/reactivate; past_due via a failing test card; pack purchase; refund + adjust; delete account with active subscription; noindex/sitemap; GA events.
Stop: any credit double-grant or double-charge in the test-clock run.

---

## 22. Files / Tables / Routes Likely Affected

Routes: `sign-in`, `sign-up`, `account`, `pricing`, `help`, `privacy`, `terms`, `api/billing/{checkout,portal,webhook}`, `api/account/delete`, `api/generation/credits` (extended), `robots[.]txt`, `sitemap[.]xml`.
Components: `Header`, `Footer`, `auth/AuthSurface`, `billing/PlanCards`, `billing/BuyCreditsSheet`, `generate/OutOfCreditsPanel`, `account/*`, edits in `GenerateWorkspace`, `InlineGenerationPanel`, `BuildMode`, `CritiqueMode`.
Lib: `product.ts`, `og-routes.ts`, `analytics.ts` (event helpers), `auth-context.tsx`, `generation/use-generation.ts`, new `billing/*`.
Tables: `credit_accounts` (+2 columns), `credit_ledger` (+2 columns, +2 entry types), new `billing_accounts`, `stripe_events`, `credit_purchases`, `deleted_accounts`; new trigger on `auth.users`; new RPCs; storage delete path via service role.
Env/secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, `SUPABASE_SERVICE_ROLE_KEY`.
Docs: CLAUDE.md product table and RLS section (service role now exists server-side for two routes only).

---

## 23. Decisions Needed From Owner

1. Approve Option A auth (Google + Apple + Microsoft, no email) for V1.
2. Approve plan structure B: Pro $15/20, Max $40/60, Free 3 starter credits, packs 10/$9, 25/$20, 50/$36.
3. Annual discount: 20% (recommended) or 15%.
4. Free users may buy packs (recommended yes).
5. Refund stance for subscriptions and unused packs.
6. Immediate cancellation on account deletion (recommended) vs at period end.
7. Stripe Tax: monitoring only, or enable automatic tax now, and where to register.
8. Legal inputs: entity, address, privacy contact channel, governing law, age threshold.
9. Confirm depikt.app hosting is Lovable-published (OAuth broker dependency) and provide the service-role key as a Worker secret.
10. Whether to move dev QA off the production Supabase project (branch) before 6B's trigger lands.

DEPIKT COMMERCIAL LAUNCH AUDIT COMPLETE
