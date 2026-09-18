import type { ResolvedEntity } from "./entities.ts";
import { extractStoredEntities } from "./stored-entities.ts";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Intent } from "../prompt-engine/intent.ts";
import type { GenerationPlan } from "./plan.ts";

export const PLAN_TOKEN_TTL_MS = 10 * 60 * 1000;

export interface PlanTokenPayload {
  entities?: ResolvedEntity[];
  userId: string;
  prompt: string;
  userInput: string;
  referenceAssetIds: string[];
  sourceVersionId: string | null;
  maskAssetId: string | null;
  maskPath: string | null;
  intent: Intent;
  plan: GenerationPlan;
  exp: number;
}

export function signPlanToken(payload: PlanTokenPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifyPlanToken(token: string, secret: string, userId: string): PlanTokenPayload {
  const dot = token.lastIndexOf(".");
  if (dot < 1) throw new Error("invalid plan token");
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("invalid plan token");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PlanTokenPayload;
  if (payload.userId !== userId) throw new Error("invalid plan token");
  if (payload.exp < Date.now()) throw new Error("plan expired");
  extractStoredEntities(payload, userId);
  return payload;
}
