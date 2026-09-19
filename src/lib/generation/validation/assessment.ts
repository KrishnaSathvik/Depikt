import { TemporalSupportSchema } from "../grounding/temporal.ts";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { CheckSpecSchema, type ValidationResult } from "./contract.ts";
const schema = z.object({
  verdict: z.enum(["pass", "pass_with_limitation", "repairable", "fail"]),
  temporalSupport: TemporalSupportSchema.optional(),
  checks: z
    .array(
      CheckSpecSchema.extend({
        status: z.enum(["pass", "fail", "unavailable"]),
        confidence: z.number().min(0).max(1).optional(),
        evidence: z.string().max(400),
        method: z.enum(["deterministic", "ocr", "visual_judge"]),
      }),
    )
    .max(30),
});
export function signAssessment(
  result: ValidationResult,
  userId: string,
  sessionId: string,
  jobId: string,
  secret: string,
): string {
  if (!secret) throw new Error("Missing assessment secret");
  const body = Buffer.from(
    JSON.stringify([userId, sessionId, jobId, schema.parse(result)]),
  ).toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(body).digest("hex")}`;
}
export function verifyAssessment(
  token: unknown,
  userId: string,
  sessionId: string,
  jobId: string,
  secret: string,
): ValidationResult {
  if (!secret || typeof token !== "string" || token.length > 60000)
    throw new Error("Invalid assessment");
  const [body, mac, ...extra] = token.split(".");
  if (!body || !mac || extra.length) throw new Error("Invalid assessment");
  const a = Buffer.from(mac),
    b = Buffer.from(createHmac("sha256", secret).update(body).digest("hex"));
  if (a.length !== b.length || !timingSafeEqual(a, b))
    throw new Error("Invalid assessment signature");
  const [owner, session, job, result] = JSON.parse(Buffer.from(body, "base64url").toString());
  if (owner !== userId || session !== sessionId || job !== jobId)
    throw new Error("Assessment identity mismatch");
  return schema.parse(result);
}
