import { createFileRoute } from "@tanstack/react-router";
import { jsonError } from "@/lib/api/public-route";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { GENERATION_BUCKET } from "@/lib/generation/storage-paths";
import { getBillingContext } from "@/lib/billing/server";
import { createServiceClient } from "@/lib/billing/service-client";
import { hashEmail, removeUserStorage } from "@/lib/billing/deletion";
import type { BillingAccountRow } from "@/lib/billing/db-types";

/**
 * POST /api/account/delete { confirm: "DELETE" }
 *
 * 1. authenticate the caller (their own JWT)
 * 2. cancel any live Stripe subscription immediately (no proration refund;
 *    the Stripe customer and invoices are retained as financial records)
 * 3. remove every private storage object under users/<uid>/
 * 4. write a minimal deleted_accounts record (email hash + customer id)
 * 5. delete the auth user; product rows cascade, credit_purchases keep
 *    their rows with user_id set to NULL
 */
export const Route = createFileRoute("/api/account/delete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authResult = await authenticateGenerationRequest(request);
        if (!authResult.ok) return jsonError(authResult.error, authResult.status);
        const { userId } = authResult.auth;

        let body: { confirm?: unknown } = {};
        try {
          body = (await request.json()) as { confirm?: unknown };
        } catch {
          return jsonError("Invalid JSON body", 400);
        }
        if (body.confirm !== "DELETE") return jsonError("Confirmation required", 400);

        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceKey)
          return jsonError("Account deletion is not available.", 503);
        const admin = createServiceClient(supabaseUrl, serviceKey);

        const { data: userData } = await authResult.auth.supabase.auth.getUser();
        const email = userData.user?.email ?? null;

        const { data: billingRow } = await admin
          .from("billing_accounts")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        const billing = (billingRow ?? null) as BillingAccountRow | null;

        // 2. Stripe subscription
        let hadSubscription = false;
        if (billing?.stripe_subscription_id) {
          const live = ["active", "trialing", "past_due", "unpaid", "incomplete"];
          if (billing.subscription_status && live.includes(billing.subscription_status)) {
            const ctx = getBillingContext();
            if (!ctx.ok) return jsonError("Billing is unavailable; try again later.", 503);
            try {
              await ctx.ctx.stripe.subscriptions.cancel(billing.stripe_subscription_id);
              hadSubscription = true;
            } catch (err) {
              const code = (err as { code?: string }).code;
              if (code !== "resource_missing") {
                console.error("account delete: subscription cancel failed", err);
                return jsonError("Could not cancel the subscription; nothing was deleted.", 502);
              }
            }
          }
        }

        // 3. storage
        try {
          await removeUserStorage(admin, GENERATION_BUCKET, `users/${userId}`);
        } catch (err) {
          console.error("account delete: storage cleanup failed", err);
          return jsonError("Could not remove stored images; nothing was deleted.", 502);
        }

        // 4. deletion record
        const { error: recordError } = await admin.from("deleted_accounts").upsert({
          user_id: userId,
          email_hash: await hashEmail(email),
          stripe_customer_id: billing?.stripe_customer_id ?? null,
          had_subscription: hadSubscription,
        });
        if (recordError) {
          console.error("account delete: deletion record failed", recordError);
          return jsonError("Could not record the deletion; nothing was deleted.", 500);
        }

        // 5. auth user (cascades product data)
        const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
        if (deleteError) {
          console.error("account delete: auth delete failed", deleteError);
          return jsonError("Could not delete the account.", 500);
        }

        return Response.json({ deleted: true });
      },
    },
  },
});
