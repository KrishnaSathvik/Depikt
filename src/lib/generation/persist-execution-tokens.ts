import type { UntypedSupabaseClient } from "./db-types.ts";
import { encryptExecutionTokenMap, extractExecutionToken } from "./execution-token.ts";

/** Repair an interrupted post-create write through the same idempotent creation RPC. */
export async function recoverSessionExecutionTokens(
  db: UntypedSupabaseClient,
  userId: string,
  sessionId: string,
  secret: string,
): Promise<void> {
  const { data: session, error } = await db
    .from("generation_sessions")
    .select("plan_json")
    .eq("user_id", userId)
    .eq("id", sessionId)
    .single();
  if (error || !session) throw new Error("Could not read execution authorization");
  const { data: jobs, error: jobsError } = await db
    .from("generation_jobs")
    .select("id, operation, model, prompt, width, height, source_version_id, idempotency_key")
    .eq("user_id", userId)
    .eq("session_id", sessionId);
  if (jobsError) throw new Error("Could not recover execution authorization");
  const tokens: Record<string, string> = {};
  for (const job of jobs ?? []) {
    if (extractExecutionToken(session.plan_json, job.idempotency_key, secret)) continue;
    const { data: created, error: createError } = await db.rpc("create_generation_job", {
      p_user_id: userId,
      p_session_id: sessionId,
      p_operation: job.operation,
      p_model: job.model,
      p_prompt: job.prompt,
      p_width: job.width,
      p_height: job.height,
      p_source_version_id: job.source_version_id,
      p_idempotency_key: job.idempotency_key,
    });
    if (createError) throw new Error("Could not recover execution authorization");
    const row = Array.isArray(created) ? created[0] : created;
    if (typeof row?.execution_token === "string") tokens[job.idempotency_key] = row.execution_token;
  }
  if (!Object.keys(tokens).length) return;
  const { error: writeError } = await db.rpc("merge_generation_execution_tokens", {
    p_session_id: sessionId,
    p_tokens: encryptExecutionTokenMap(tokens, secret),
  });
  // Before the Step 4 migration: all tokens for this session were collected
  // together; preserve the existing signed document and other token entries.
  if (writeError?.code === "PGRST202" || writeError?.code === "42883") {
    const { error: fallbackError } = await db
      .from("generation_sessions")
      .update({
        plan_json: {
          ...session.plan_json,
          executionTokensEnc: {
            ...session.plan_json.executionTokensEnc,
            ...encryptExecutionTokenMap(tokens, secret),
          },
        },
      })
      .eq("user_id", userId)
      .eq("id", sessionId);
    if (fallbackError) throw new Error("Could not save execution authorization");
  } else if (writeError) throw new Error("Could not save execution authorization");
}
