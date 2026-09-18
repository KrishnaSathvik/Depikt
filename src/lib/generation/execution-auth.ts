import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { ExecutionPlanJson } from "./execution-plan.ts";
export interface ExecutionAuthorization {
  version: 1;
  operation: "generate" | "edit";
  width: number;
  height: number;
  children: Array<{ key: string; promptHash: string }>;
  seal: string;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
function mac(
  plan: unknown,
  authorization: Omit<ExecutionAuthorization, "seal">,
  userId: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(canonical(["execution-v1", userId, plan, authorization]))
    .digest("hex");
}
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
export function authorizeExecution(
  plan: ExecutionPlanJson,
  args: {
    operation: "generate" | "edit";
    width: number;
    height: number;
    children: Array<{ key: string; prompt: string }>;
    userId: string;
    secret: string;
  },
): ExecutionAuthorization {
  const authorization = {
    version: 1 as const,
    operation: args.operation,
    width: args.width,
    height: args.height,
    children: args.children.map((c) => ({ key: c.key, promptHash: hash(c.prompt) })),
  };
  return { ...authorization, seal: mac(plan, authorization, args.userId, args.secret) };
}
/** Covers the entire stored plan and binds it to the immutable job input, not just its owner. */
export function verifyExecutionAuthorization(
  stored: unknown,
  job: {
    userId: string;
    idempotencyKey: string;
    prompt: string;
    operation: string;
    width: number;
    height: number;
    sourceVersionId: string | null;
  },
  secret: string,
  required: boolean,
): void {
  if (!stored || typeof stored !== "object") {
    if (required) throw new Error("Missing execution authorization");
    return;
  }
  const { executionAuthorization, ...plan } = stored as Record<string, unknown>;
  if (!executionAuthorization) {
    if (required || plan.grounding || plan.validation)
      throw new Error("Missing execution authorization");
    return;
  }
  if (!secret) throw new Error("Execution signing is unavailable");
  const { seal, ...authorization } = executionAuthorization as ExecutionAuthorization;
  if (
    typeof seal !== "string" ||
    authorization.version !== 1 ||
    !Array.isArray(authorization.children)
  )
    throw new Error("Invalid execution authorization");
  const a = Buffer.from(seal),
    b = Buffer.from(mac(plan, authorization, job.userId, secret));
  if (
    a.length !== b.length ||
    !timingSafeEqual(a, b) ||
    authorization.operation !== job.operation ||
    authorization.width !== job.width ||
    authorization.height !== job.height ||
    (plan.sourceVersionId ?? null) !== job.sourceVersionId ||
    !authorization.children.some(
      (c) => c.key === job.idempotencyKey && c.promptHash === hash(job.prompt),
    )
  )
    throw new Error("Execution authorization mismatch");
}
