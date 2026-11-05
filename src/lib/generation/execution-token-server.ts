// Step 4D — trusted server-only execution-token boundary.
//
// Execution tokens never leave the database for signed-in or anonymous
// clients: the job-creation RPCs no longer return them, the column is not
// selectable, and the only reader is get_generation_execution_token, which
// is granted to service_role alone. The server calls it here, after the
// request is authenticated, with the caller's own user id — so the token
// belongs to a job the caller owns and is used only inside this request.
//
// Never log, return or persist the value.

function isMissingFunction(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "PGRST202" || code === "42883";
}

/**
 * Returns the job's execution token, or null when the Step 4D function is
 * not installed yet (pre-migration: the legacy token-less path applies).
 * Throws on any other failure so execution fails closed.
 */
export async function fetchExecutionToken(userId: string, jobId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (
    supabaseAdmin as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>;
    }
  ).rpc("get_generation_execution_token", { p_job_id: jobId, p_user_id: userId });
  if (error) {
    if (isMissingFunction(error)) return null;
    throw new Error("Could not authorize execution");
  }
  return typeof data === "string" && data.length > 0 ? data : null;
}
