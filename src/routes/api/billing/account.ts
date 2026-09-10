import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, jsonError } from "@/lib/api/public-route";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import {
  asBillingClient,
  type BillingAccountRow,
  type CreditAccountRow,
} from "@/lib/billing/db-types";
import { PLAN_CREDITS } from "@/lib/billing/plans";

export interface AccountSummaryResponse {
  email: string | null;
  provider: string | null;
  plan: "free" | "pro" | "max";
  subscriptionStatus: string | null;
  billingInterval: "month" | "year" | null;
  currentPeriodEnd: string | null;
  nextCreditGrantAt: string | null;
  cancelAtPeriodEnd: boolean;
  lastPaymentFailedAt: string | null;
  hasStripeCustomer: boolean;
  credits: {
    available: number;
    plan: number;
    extra: number;
    reserved: number;
    allocation: number;
  };
  usage: Array<{
    id: string;
    createdAt: string;
    operation: "generate" | "edit";
    status: string;
    creditCost: number;
  }>;
}

/**
 * GET /api/billing/account — everything the Account page and menu show.
 * Runs grant_due_subscription_credits() first so an annual subscriber who
 * has been away is caught up before the numbers are read. All reads go
 * through the caller's own JWT (RLS), never the service role.
 */
export const Route = createFileRoute("/api/billing/account")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const authResult = await authenticateGenerationRequest(request);
        if (!authResult.ok) return jsonError(authResult.error, authResult.status);
        const { userId } = authResult.auth;
        const db = asBillingClient(authResult.auth.supabase);

        // Never fatal: a missing RPC (migration not applied) must not hide the balance.
        await db.rpc("grant_due_subscription_credits").then(
          () => undefined,
          () => undefined,
        );

        const [{ data: credit }, { data: billing }, { data: jobs }, { data: userData }] =
          await Promise.all([
            db
              .from("credit_accounts")
              .select("available_credits, reserved_credits, plan_credits, extra_credits")
              .eq("user_id", userId)
              .maybeSingle(),
            db.from("billing_accounts").select("*").eq("user_id", userId).maybeSingle(),
            db
              .from("generation_jobs")
              .select("id, created_at, operation, status, credit_cost")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(10),
            authResult.auth.supabase.auth.getUser(),
          ]);

        const c = (credit ?? null) as Partial<CreditAccountRow> | null;
        const b = (billing ?? null) as BillingAccountRow | null;
        const plan = b?.plan_key ?? "free";
        const body: AccountSummaryResponse = {
          email: userData.user?.email ?? null,
          provider: (userData.user?.app_metadata?.provider as string | undefined) ?? null,
          plan,
          subscriptionStatus: b?.subscription_status ?? null,
          billingInterval: b?.billing_interval ?? null,
          currentPeriodEnd: b?.current_period_end ?? null,
          nextCreditGrantAt: b?.next_credit_grant_at ?? null,
          cancelAtPeriodEnd: Boolean(b?.cancel_at_period_end),
          lastPaymentFailedAt: b?.last_payment_failed_at ?? null,
          hasStripeCustomer: Boolean(b?.stripe_customer_id),
          credits: {
            available: c?.available_credits ?? 0,
            plan: c?.plan_credits ?? 0,
            extra: c?.extra_credits ?? 0,
            reserved: c?.reserved_credits ?? 0,
            allocation: b?.monthly_credit_allocation ?? (plan === "free" ? 0 : PLAN_CREDITS[plan]),
          },
          usage: ((jobs ?? []) as Array<Record<string, unknown>>).map((j) => ({
            id: String(j.id),
            createdAt: String(j.created_at),
            operation: j.operation as "generate" | "edit",
            status: String(j.status),
            creditCost: Number(j.credit_cost ?? 1),
          })),
        };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      },
    },
  },
});
