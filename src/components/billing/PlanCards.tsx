import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { startCheckout } from "@/lib/billing/client";
import { PRICING_COPY } from "@/lib/billing/copy";
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
      className="inline-flex rounded-full border border-[color:var(--border-default)] p-0.5"
    >
      {(["month", "year"] as const).map((i) => (
        <button
          key={i}
          role="tab"
          type="button"
          aria-selected={interval === i}
          onClick={() => onChange(i)}
          className={cn(
            "rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
            interval === i
              ? "bg-[color:var(--accent)] text-[color:var(--accent-text)]"
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
    <ul className="mt-6 space-y-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2 text-body-sm text-[color:var(--text-secondary)]"
        >
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--text-primary)]" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function PlanCards({ interval, onIntervalChange, currentPlan, resumeKey }: PlanCardsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<ProductKey | null>(null);

  async function choose(plan: PaidPlanKey) {
    const product = planProduct(plan, interval);
    if (!user) {
      void navigate({
        to: ROUTES.signUp,
        search: { next: `${ROUTES.pricing}?plan=${product.key}` },
      });
      return;
    }
    setBusy(product.key);
    try {
      await startCheckout(product.key);
    } catch {
      setBusy(null);
      toast.error("Could not start checkout. Please try again.");
    }
  }

  function paidCard(plan: PaidPlanKey) {
    const product = planProduct(plan, interval);
    const copy = PRICING_COPY[plan];
    const isCurrent = currentPlan === plan;
    const isResume = resumeKey === product.key;
    return (
      <div
        key={plan}
        className={cn(
          "flex flex-col rounded-lg border p-6",
          isResume || plan === "pro"
            ? "border-[color:var(--text-primary)]"
            : "border-[color:var(--border-subtle)]",
        )}
      >
        <p className="eyebrow">{copy.name}</p>
        {interval === "month" ? (
          <p className="mt-3">
            <span className="text-display-md tabular-nums">{formatUsd(product.priceCents)}</span>
            <span className="text-body-sm text-[color:var(--text-secondary)]">/month</span>
          </p>
        ) : (
          <p className="mt-3">
            <span className="text-display-md tabular-nums">{formatUsd(product.priceCents)}</span>
            <span className="text-body-sm text-[color:var(--text-secondary)]">/year</span>
            <span className="mt-1 block text-body-sm text-[color:var(--text-secondary)]">
              ~{monthlyEquivalent(product.priceCents)}/month · {yearlySavingsLabel(plan)}
            </span>
          </p>
        )}
        <p className="mt-4 text-body-md font-medium text-[color:var(--text-primary)]">
          {PLAN_CREDITS[plan]} image credits every month
        </p>
        <p className="mt-1 text-body-sm text-[color:var(--text-secondary)]">
          {interval === "year" ? PRICING_COPY.yearlyNote : copy.note}
        </p>
        <Includes items={copy.includes} />
        <div className="mt-auto pt-8">
          <Button
            className="w-full"
            size="lg"
            variant={plan === "pro" || isResume ? "default" : "outline"}
            disabled={busy !== null || isCurrent}
            onClick={() => void choose(plan)}
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
  }

  return (
    <div>
      <div className="flex justify-center">
        <IntervalToggle interval={interval} onChange={onIntervalChange} />
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {/* FREE */}
        <div className="flex flex-col rounded-lg border border-[color:var(--border-subtle)] p-6">
          <p className="eyebrow">{PRICING_COPY.free.name}</p>
          <p className="mt-3">
            <span className="text-display-md tabular-nums">$0</span>
          </p>
          <p className="mt-4 text-body-md font-medium text-[color:var(--text-primary)]">
            {STARTER_CREDITS} image credits
          </p>
          <p className="mt-1 text-body-sm text-[color:var(--text-secondary)]">
            {PRICING_COPY.free.note}
          </p>
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
        {paidCard("pro")}
        {paidCard("max")}
      </div>

      {/* PACKS */}
      <div className="mt-16 border-t border-[color:var(--border-subtle)] pt-10">
        <h2 className="text-heading-md">{PRICING_COPY.packsHeading}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.key}
              className="flex items-baseline justify-between rounded-md border border-[color:var(--border-subtle)] px-5 py-4"
            >
              <span className="text-body-md font-medium">{pack.credits} credits</span>
              <span className="text-body-md tabular-nums">{formatUsd(pack.priceCents)}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-body-sm text-[color:var(--text-secondary)]">
          {PRICING_COPY.packsNote} {PRICING_COPY.creditRule}
        </p>
      </div>
    </div>
  );
}
