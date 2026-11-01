import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { BillingAuthDialog } from "@/components/auth/BillingAuthDialog";
import { startCheckout, checkoutErrorMessage } from "@/lib/billing/client";
import { PRICING_COPY } from "@/lib/billing/copy";
import { planGateHeadline, PACK_GATE_HEADLINE } from "@/lib/auth/gate-copy";
import {
  CREDIT_PACKS,
  PLAN_CREDITS,
  STARTER_CREDITS,
  formatUsd,
  monthlyEquivalent,
  planProduct,
  yearlySavingsLabel,
  type BillingInterval,
  type PaidPlanKey,
  type PlanKey,
  type ProductKey,
} from "@/lib/billing/plans";
import { ROUTES } from "@/lib/product";
import { cn } from "@/lib/utils";

export interface PlanCardsProps {
  interval: BillingInterval;
  onIntervalChange: (interval: BillingInterval) => void;
  /** The signed-in user's current plan, when known. */
  currentPlan?: PlanKey | null;
  /** A plan carried through sign-up (?plan=) to highlight. */
  resumeKey?: string | null;
  /**
   * Drop the $0 Free card -- for the account/Plan tab's inline "View plans"
   * (the viewer already has an account, so there is nothing to sign up
   * for) and the credit packs, which belong on the marketing /pricing page,
   * not inline in the account upgrade view.
   */
  hideFree?: boolean;
  hidePacks?: boolean;
}

function IntervalToggle({
  interval,
  onChange,
}: {
  interval: BillingInterval;
  onChange: (i: BillingInterval) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Billing interval"
      className="inline-flex rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] p-1"
    >
      {(["month", "year"] as const).map((i) => (
        <button
          key={i}
          role="tab"
          type="button"
          aria-selected={interval === i}
          onClick={() => onChange(i)}
          className={cn(
            "inline-flex h-10 items-center rounded-full px-5 text-[14px] font-medium transition-[background-color,color,box-shadow] duration-150",
            interval === i
              ? "bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] shadow-[0_1px_2px_rgba(17,17,17,0.08),0_4px_12px_-6px_rgba(17,17,17,0.18)]"
              : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
          )}
        >
          {i === "month" ? PRICING_COPY.toggleMonthly : PRICING_COPY.toggleYearly}
        </button>
      ))}
    </div>
  );
}

function Includes({ items }: { items: ReadonlyArray<string> }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-3 text-[14px] leading-snug text-[color:var(--text-secondary)]"
        >
          <span
            aria-hidden
            className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--bg-subtle)] text-[color:var(--text-primary)]"
          >
            <Check className="h-3 w-3" strokeWidth={2.5} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Plan name + optional highlight pill, the first row of every plan card. */
function PlanName({ name, popular }: { name: string; popular?: boolean }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-3">
      <p className="text-[17px] font-semibold tracking-[-0.01em] text-[color:var(--text-primary)]">
        {name}
      </p>
      {popular && (
        <span className="inline-flex items-center rounded-full bg-[image:var(--brand-gradient)] px-3 py-1 text-[12px] font-semibold text-white shadow-[var(--brand-glow)]">
          Most popular
        </span>
      )}
    </div>
  );
}

/** Large price with a quiet unit. */
function Price({ amount, unit }: { amount: string; unit?: string }) {
  return (
    <p className="mt-5 flex items-baseline gap-1">
      <span className="text-[44px] font-semibold leading-none tracking-[-0.035em] tabular-nums text-[color:var(--text-primary)]">
        {amount}
      </span>
      {unit && <span className="text-[15px] text-[color:var(--text-tertiary)]">{unit}</span>}
    </p>
  );
}

/** The credits line -- the real differentiator between plans. */
function CreditsLine({ children, note }: { children: ReactNode; note: string }) {
  return (
    <div className="mt-6 rounded-[14px] border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] px-4 py-3">
      <p className="flex items-center gap-2 text-[15px] font-semibold text-[color:var(--text-primary)]">
        <Sparkles aria-hidden className="h-4 w-4 shrink-0 text-[#ff6a3d]" />
        {children}
      </p>
      <p className="mt-1 text-[13px] leading-snug text-[color:var(--text-secondary)]">{note}</p>
    </div>
  );
}

export function PlanCards({
  interval,
  onIntervalChange,
  currentPlan,
  resumeKey,
  hideFree,
  hidePacks,
}: PlanCardsProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState<ProductKey | null>(null);
  const [authGate, setAuthGate] = useState<ProductKey | null>(null);

  async function choose(productKey: ProductKey) {
    if (!user) {
      // Don't lose the plan or pack to a navigation: the auth gate remembers it
      // (savePendingCheckout) and sends the user straight to Checkout once
      // they're signed in — no re-selecting.
      setAuthGate(productKey);
      return;
    }
    setBusy(productKey);
    try {
      await startCheckout(productKey);
    } catch (err) {
      setBusy(null);
      toast.error(checkoutErrorMessage(err));
    }
  }

  function authGateHeadline(key: ProductKey | null): string {
    if (!key) return "";
    if (key.startsWith("pro_")) return planGateHeadline("pro");
    if (key.startsWith("max_")) return planGateHeadline("max");
    return PACK_GATE_HEADLINE;
  }

  // The one warm (brand) action per view: the plan carried through sign-up
  // when it is on screen, otherwise the recommended Pro plan.
  const resumeVisible =
    resumeKey === planProduct("pro", interval).key ||
    resumeKey === planProduct("max", interval).key;

  function paidCard(plan: PaidPlanKey) {
    const product = planProduct(plan, interval);
    const copy = PRICING_COPY[plan];
    const isCurrent = currentPlan === plan;
    const isResume = resumeKey === product.key;
    const isPro = plan === "pro";
    const isPrimary = resumeVisible ? isResume : isPro;
    const card = (
      <div
        className={cn(
          "surface-card flex h-full flex-col p-6 sm:p-7",
          isPro && "rounded-[19px] border-transparent",
          isResume && !isPro && "border-[color:var(--text-primary)]",
        )}
      >
        <PlanName name={copy.name} popular={isPro} />
        {interval === "month" ? (
          <Price amount={formatUsd(product.priceCents)} unit="/month" />
        ) : (
          <>
            <Price amount={formatUsd(product.priceCents)} unit="/year" />
            <p className="mt-2 text-[13px] text-[color:var(--text-secondary)]">
              ~{monthlyEquivalent(product.priceCents)}/month effective ·{" "}
              <span className="font-medium text-[color:var(--text-primary)]">
                {yearlySavingsLabel(plan)}
              </span>
            </p>
          </>
        )}
        <CreditsLine note={interval === "year" ? PRICING_COPY.yearlyNote : copy.note}>
          {PLAN_CREDITS[plan]} image credits every month
        </CreditsLine>
        <Includes items={copy.includes} />
        <div className="mt-auto pt-8">
          <Button
            className="w-full"
            size="lg"
            variant={isPrimary && !isCurrent ? "brand" : isResume ? "default" : "outline"}
            disabled={busy !== null || isCurrent}
            onClick={() => void choose(product.key)}
            data-analytics-id={`pricing-${product.key}`}
          >
            {isCurrent
              ? PRICING_COPY.current
              : busy === product.key
                ? "Redirecting…"
                : isResume
                  ? `${PRICING_COPY.continueCheckout} →`
                  : `${PRICING_COPY.cta[plan]} →`}
          </Button>
        </div>
      </div>
    );
    // Recommended plan: a 1.5px brand-gradient ring around the card plus a
    // soft warm glow, so it reads as the default choice at a glance.
    return isPro ? (
      <div
        key={plan}
        className="relative rounded-[20px] bg-[image:var(--brand-gradient)] p-[1.5px] shadow-[0_24px_60px_-28px_rgba(255,106,61,0.55)]"
      >
        {card}
      </div>
    ) : (
      <div key={plan}>{card}</div>
    );
  }

  return (
    <div>
      <div className="flex">
        <IntervalToggle interval={interval} onChange={onIntervalChange} />
      </div>

      <div
        className={cn(
          "mt-10 grid items-stretch gap-5",
          hideFree ? "md:grid-cols-2" : "md:grid-cols-3",
        )}
      >
        {!hideFree && (
          <div className="surface-card flex flex-col p-6 sm:p-7">
            <PlanName name={PRICING_COPY.free.name} />
            <Price amount="$0" />
            <CreditsLine note={PRICING_COPY.free.note}>{STARTER_CREDITS} image credits</CreditsLine>
            <Includes items={PRICING_COPY.free.includes} />
            <div className="mt-auto pt-8">
              {user ? (
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link to={ROUTES.legacyBuilder}>{PRICING_COPY.cta.freeSignedIn} →</Link>
                </Button>
              ) : (
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link to={ROUTES.signUp}>{PRICING_COPY.cta.free} →</Link>
                </Button>
              )}
            </div>
          </div>
        )}
        {paidCard("pro")}
        {paidCard("max")}
      </div>

      {/* PACKS */}
      {!hidePacks && (
        <section className="mt-20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-[26px] font-semibold tracking-[-0.025em] text-[color:var(--text-primary)] sm:text-[30px]">
              {PRICING_COPY.packsHeading}
            </h2>
            <p className="text-[14px] text-[color:var(--text-secondary)]">
              {PRICING_COPY.packsNote}
            </p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.key}
                className="surface-card surface-card-interactive flex flex-col p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-medium text-[color:var(--text-primary)]">
                    {pack.credits} credits
                  </span>
                  {pack.badge && (
                    <span className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] px-2.5 py-0.5 text-[12px] font-medium text-[color:var(--text-secondary)]">
                      {pack.badge}
                    </span>
                  )}
                </div>
                <span className="mt-3 text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-[color:var(--text-primary)]">
                  {formatUsd(pack.priceCents)}
                </span>
                <div className="mt-auto pt-5">
                  <Button
                    variant="outline"
                    className="h-11 w-full"
                    disabled={busy !== null}
                    onClick={() => void choose(pack.key)}
                    data-analytics-id={`pricing-${pack.key}`}
                  >
                    {busy === pack.key ? "Redirecting…" : "Buy credits"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <BillingAuthDialog
        open={authGate !== null}
        onOpenChange={(open) => !open && setAuthGate(null)}
        headline={authGateHeadline(authGate)}
        productKey={authGate}
      />
    </div>
  );
}
