import {
  TemporalSupportSchema,
  temporalSupport,
  visualRequirement,
  type TemporalSupport,
} from "../grounding/temporal.ts";
import { classifyLocalEdit, ATTRIBUTE_GEOMETRY_REQUIREMENT } from "../local-edit-intent.ts";
import {
  compileGroundedValidationClaims,
  groundedValidationRequirements,
} from "../grounding/claims.ts";
import type { GroundingBundle } from "../grounding/contract.ts";
import { z } from "zod";
import { HARD_SERIES_CAP } from "../plan.ts";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Intent } from "../../prompt-engine/intent.ts";
import type { ResolvedEntity } from "../entities.ts";

export const CheckKindSchema = z.enum([
  "dimensions",
  "series_count",
  "missing_entity",
  "exact_text",
  "object_count",
  "character_identity",
  "product_identity",
  "brand_identity",
  "composition",
  "edit_preservation",
  "unwanted_text",
  "entity_distinction",
  "grounding_consistency",
  "strict_preservation",
  "requested_edit",
  "inside_mask_structure",
]);
export type CheckKind = z.infer<typeof CheckKindSchema>;
export const CheckSpecSchema = z.strictObject({
  id: z.string().max(100),
  kind: CheckKindSchema,
  target: z.string().max(600),
  expectedText: z.array(z.string().max(1000)).max(20).optional(),
  expectedCount: z.number().int().min(0).max(100).optional(),
});
export type CheckSpec = z.infer<typeof CheckSpecSchema>;
export const ValidationPlanSchema = z.strictObject({
  temporalSupport: TemporalSupportSchema.optional(),
  checks: z.array(CheckSpecSchema).max(30),
  expectedSeriesCount: z.number().int().min(1).max(HARD_SERIES_CAP),
});
export type ValidationPlan = z.infer<typeof ValidationPlanSchema>;
export interface ValidationSnapshot {
  plan: ValidationPlan;
  seal: string;
}
export interface ValidationCheck extends CheckSpec {
  confidence?: number;
  status: "pass" | "fail" | "unavailable";
  evidence: string;
  method: "deterministic" | "ocr" | "visual_judge";
}
export interface ValidationResult {
  checks: ValidationCheck[];
  verdict: "pass" | "pass_with_limitation" | "repairable" | "fail";
  temporalSupport?: TemporalSupport;
}
export { MAX_AUTO_REPAIR_ATTEMPTS_PER_REQUEST } from "../economic-policy.ts";

export function buildValidationPlan(args: {
  intent: Intent;
  entities: ResolvedEntity[];
  selectedCount: number;
  prompt: string;
  hasMask: boolean;
  groundingBundle?: GroundingBundle;
}): ValidationPlan {
  const checks: CheckSpec[] = [
    { id: "dimensions", kind: "dimensions", target: "output canvas" },
    { id: "series_count", kind: "series_count", target: "session jobs" },
  ];
  const add = (kind: CheckKind, target: string, extra: Partial<CheckSpec> = {}) =>
    checks.push({ id: `${kind}-${checks.length}`, kind, target, ...extra });
  if (args.intent.exact_text.length)
    add("exact_text", "requested text", {
      expectedText: args.intent.exact_text.map((t) => t.text),
    });
  if (/\b(no text|without text|no lettering|text.free)\b/i.test(args.prompt))
    add("unwanted_text", "all visible text");
  for (const entity of args.entities) {
    add("missing_entity", entity.id);
    add(
      entity.type === "character"
        ? "character_identity"
        : entity.type === "product"
          ? "product_identity"
          : "brand_identity",
      entity.id,
    );
  }
  if (args.entities.length > 1) add("entity_distinction", "attached entities");
  if (args.hasMask || (args.intent.task === "edit" && args.intent.must_preserve.length))
    add(
      "edit_preservation",
      args.intent.must_preserve.join("; ").slice(0, 600) || "outside selected area",
    );
  if (args.hasMask)
    add(
      "requested_edit",
      args.intent.requested_changes.join("; ").slice(0, 600) || args.prompt.slice(0, 600),
    );
  if (args.hasMask && classifyLocalEdit(args.prompt) === "attribute_change")
    add("inside_mask_structure", ATTRIBUTE_GEOMETRY_REQUIREMENT);
  for (const requirement of groundedValidationRequirements(
    args.groundingBundle,
    args.prompt,
    args.intent,
  ))
    add("grounding_consistency", requirement.slice(0, 600));
  if (
    /\b(keep|preserve|exact|same|recreate|reproduce)\b/i.test(args.prompt) &&
    !args.hasMask &&
    !args.entities.length &&
    !args.intent.exact_text.length
  )
    add("strict_preservation", visualRequirement(args.prompt).slice(0, 600));
  if (args.intent.reference_intent === "composition") add("composition", "reference composition");
  const count = args.prompt.match(
    /\b(?:exactly\s+)(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s+([\p{L} -]{1,60})(?:[,.!;]|$)/iu,
  );
  if (count) {
    const words = [
      "zero",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
    ];
    const n = /^\d+$/.test(count[1]) ? Number(count[1]) : words.indexOf(count[1].toLowerCase());
    if (n >= 0) add("object_count", count[2].trim(), { expectedCount: n });
  }
  const boundBundle = args.groundingBundle
    ? {
        ...args.groundingBundle,
        ...compileGroundedValidationClaims({
          prompt: args.prompt,
          bundle: args.groundingBundle,
          intent: args.intent,
        }),
      }
    : undefined;
  const temporal = temporalSupport(args.prompt, boundBundle, args.intent);
  return ValidationPlanSchema.parse({
    checks,
    expectedSeriesCount: args.selectedCount,
    ...(temporal ? { temporalSupport: temporal } : {}),
  });
}
function signature(plan: ValidationPlan, userId: string, secret: string): string {
  // Parse into the schema's stable property order after JSONB has reordered keys.
  return createHmac("sha256", secret)
    .update(JSON.stringify(["validation-v1", userId, ValidationPlanSchema.parse(plan)]))
    .digest("hex");
}
export function signValidationPlan(
  plan: ValidationPlan,
  userId: string,
  secret: string,
): ValidationSnapshot {
  return { plan: ValidationPlanSchema.parse(plan), seal: signature(plan, userId, secret) };
}
export function verifyValidationPlan(
  value: unknown,
  userId: string,
  secret: string,
): ValidationPlan {
  if (!secret) throw new Error("Validation signing is unavailable");
  if (!value || typeof value !== "object") throw new Error("Invalid validation snapshot");
  const s = value as ValidationSnapshot;
  const plan = ValidationPlanSchema.parse(s.plan);
  if (typeof s.seal !== "string") throw new Error("Invalid validation signature");
  const a = Buffer.from(s.seal),
    b = Buffer.from(signature(plan, userId, secret));
  if (a.length !== b.length || !timingSafeEqual(a, b))
    throw new Error("Invalid validation signature");
  return plan;
}

export function buildJobValidationPlans(args: {
  intent: Intent;
  entities: ResolvedEntity[];
  selectedCount: number;
  prompt: string;
  hasMask: boolean;
  groundingBundle?: GroundingBundle;
  children: Array<{ key: string; prompt: string }>;
  userId: string;
  secret: string;
}): Record<string, ValidationSnapshot> {
  if (
    args.selectedCount > 1 &&
    args.intent.exact_text.some((t) => !args.children.some((c) => c.prompt.includes(t.text)))
  )
    throw new Error("Series decomposition omitted required text");
  return Object.fromEntries(
    args.children.map((child) => {
      const intent =
        args.selectedCount > 1
          ? {
              ...args.intent,
              exact_text: args.intent.exact_text.filter((t) => child.prompt.includes(t.text)),
            }
          : args.intent;
      return [
        child.key,
        signValidationPlan(buildValidationPlan({ ...args, intent }), args.userId, args.secret),
      ];
    }),
  );
}
