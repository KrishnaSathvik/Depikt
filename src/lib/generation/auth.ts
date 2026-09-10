// Native image generation — request authentication for the /api/generation
// file routes. Mirrors src/integrations/supabase/auth-middleware.ts (the
// generated serverFn middleware), adapted for a file-route server handler:
// same Bearer-token check, same request-scoped client bound to the caller's
// JWT (publishable key + Authorization header, never a service role).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface AuthenticatedRequest {
  supabase: SupabaseClient<Database>;
  userId: string;
}

export type AuthResult =
  | { ok: true; auth: AuthenticatedRequest }
  | { ok: false; status: number; error: string };

export interface AuthenticateOptions {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  /** Injectable for tests: given a bound client + token, resolve the user id. Defaults to supabase.auth.getClaims. */
  resolveUserId?: (supabase: SupabaseClient<Database>, token: string) => Promise<string | null>;
}

async function defaultResolveUserId(
  supabase: SupabaseClient<Database>,
  token: string,
): Promise<string | null> {
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub as string;
}

export async function authenticateGenerationRequest(
  request: Request,
  opts: AuthenticateOptions = {},
): Promise<AuthResult> {
  const supabaseUrl = opts.supabaseUrl ?? process.env.SUPABASE_URL;
  const supabasePublishableKey =
    opts.supabasePublishableKey ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabasePublishableKey) {
    return { ok: false, status: 500, error: "Server misconfigured" };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Authentication required" };
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const resolveUserId = opts.resolveUserId ?? defaultResolveUserId;
  const userId = await resolveUserId(supabase, token);
  if (!userId) {
    return { ok: false, status: 401, error: "Invalid or expired session" };
  }

  return { ok: true, auth: { supabase, userId } };
}
