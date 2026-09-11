import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, jsonError } from "@/lib/api/public-route";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { asProfileClient } from "@/lib/profile/db-types";
import { validateUsername } from "@/lib/profile/username";

/**
 * POST /api/account/username-availability { username } -> { available }
 *
 * Returns ONLY a boolean, never account/email information — this endpoint
 * is reachable by any signed-in user probing arbitrary usernames, so it
 * must never leak who owns one. Authenticated (not anon) purely to keep it
 * off the public, unauthenticated attack surface; it doesn't check
 * ownership of the username being probed.
 */
export const Route = createFileRoute("/api/account/username-availability")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const authResult = await authenticateGenerationRequest(request);
        if (!authResult.ok) return jsonError(authResult.error, authResult.status);
        const { userId, supabase } = authResult.auth;
        const db = asProfileClient(supabase);

        let body: { username?: unknown };
        try {
          body = (await request.json()) as { username?: unknown };
        } catch {
          return jsonError("Invalid JSON body", 400);
        }
        if (typeof body.username !== "string") return jsonError("username is required", 400);

        const validation = validateUsername(body.username);
        if (!validation.ok) {
          return new Response(JSON.stringify({ available: false }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const { data, error } = await db
          .from("profiles")
          .select("user_id")
          .ilike("username", validation.username)
          .maybeSingle();
        if (error) return jsonError("Could not check that username right now.", 500);

        // Your own current username counts as "available" (Save with no change).
        const takenByAnother = Boolean(data) && (data as { user_id: string }).user_id !== userId;

        return new Response(JSON.stringify({ available: !takenByAnother }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      },
    },
  },
});
