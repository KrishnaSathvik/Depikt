// Out-of-credits copy per plan and billing state. Pure, so the exact wording
// and the action pairing are unit-tested.

import { PLAN_CREDITS, STARTER_CREDITS, type PlanKey } from "./plans.ts";

export type OutOfCreditsAction =
  | "buy"
  | "upgrade_pro"
  | "upgrade_max"
  | "update_billing"
  | "view_plans";

export interface OutOfCreditsInput {
  plan: PlanKey;
  subscriptionStatus: string | null;
  /** ISO date of the next plan-credit reset (monthly renewal or the annual monthly slice). */
  nextResetAt: string | null;
}

export interface OutOfCreditsCopy {
  title: string;
  body: string;
  primary: OutOfCreditsAction;
  secondary: OutOfCreditsAction | null;
}

export function formatShortDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatLongDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function outOfCreditsCopy(input: OutOfCreditsInput): OutOfCreditsCopy {
  const status = input.subscriptionStatus;
  if (input.plan !== "free" && (status === "past_due" || status === "unpaid")) {
    return {
      title: "Your latest payment needs attention.",
      body: "Update your payment method to keep this month's credits coming. Extra credits still work.",
      primary: "update_billing",
      secondary: "buy",
    };
  }
  if (input.plan === "free") {
    return {
      title: "You're out of image credits.",
      body: `Your ${STARTER_CREDITS} starter credits have been used.`,
      primary: "buy",
      secondary: "upgrade_pro",
    };
  }
  const allocation = PLAN_CREDITS[input.plan];
  const when = formatShortDate(input.nextResetAt);
  return {
    title: `You've used this month's ${allocation} image credits.`,
    body: when
      ? `They refresh on ${when}.`
      : "They refresh at the start of your next billing month.",
    primary: "buy",
    secondary: input.plan === "pro" ? "upgrade_max" : null,
  };
}

export const OUT_OF_CREDITS_ACTION_LABEL: Record<OutOfCreditsAction, string> = {
  buy: "Buy credits",
  upgrade_pro: "Upgrade to Pro",
  upgrade_max: "Upgrade to Max",
  update_billing: "Update billing",
  view_plans: "View plans",
};
