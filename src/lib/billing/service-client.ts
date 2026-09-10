// Service-role Supabase client for the billing/admin paths ONLY:
// Stripe webhooks, billing sync, account deletion, server credit grants.
// Never imported by client code; the key comes from the Worker environment.

import { createClient } from "@supabase/supabase-js";
import type { UntypedSupabaseClient } from "./db-types.ts";

export function createServiceClient(
  supabaseUrl: string,
  serviceRoleKey: string,
): UntypedSupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  }) as unknown as UntypedSupabaseClient;
}
