import type { StoredImage } from "../openai-images.ts";
import { parsePngHeader } from "../png-mask.ts";
import { decodePng, outsideMaskDifference } from "./pixels.ts";
import type { CheckSpec, ValidationCheck, ValidationPlan, ValidationResult } from "./contract.ts";
import { planRepair } from "./repair.ts";

export interface OcrProvider {
  read(image: StoredImage): Promise<{ text: string; confidence: number }>;
}
export interface ReferenceBinding {
  entityId: string;
  name: string;
  type: string;
  imageIndices: number[];
}
export interface VisualJudge {
  judge(input: {
    image: StoredImage;
    references: StoredImage[];
    checks: CheckSpec[];
    referenceBindings?: ReferenceBinding[];
  }): Promise<Array<{ id: string; passed: boolean; confidence: number; evidence: string }>>;
}
export interface ValidationContext {
  image: StoredImage;
  width: number;
  height: number;
  seriesCount: number;
  references: StoredImage[];
  source?: StoredImage;
  mask?: StoredImage | null;
  entityIds: string[];
  referenceBindings?: ReferenceBinding[];
  ocr?: OcrProvider;
  judge?: VisualJudge;
}
export async function validateResult(
  plan: ValidationPlan,
  context: ValidationContext,
): Promise<ValidationResult> {
  const checks: ValidationCheck[] = [];
  const subjective: CheckSpec[] = [];
  let ocr: Awaited<ReturnType<OcrProvider["read"]>> | undefined;
  const add = (
    spec: CheckSpec,
    passed: boolean,
    evidence: string,
    method: ValidationCheck["method"] = "deterministic",
  ) => checks.push({ ...spec, status: passed ? "pass" : "fail", evidence, method });
  const unavailable = (spec: CheckSpec, method: ValidationCheck["method"]) =>
    checks.push({
      ...spec,
      status: "unavailable",
      evidence: "Required evidence could not be measured",
      method,
    });
  for (const spec of plan.checks) {
    switch (spec.kind) {
      case "dimensions": {
        const png = parsePngHeader(context.image.bytes);
        add(
          spec,
          png.ok && png.header.width === context.width && png.header.height === context.height,
          png.ok ? `${png.header.width}x${png.header.height}` : "Invalid PNG",
        );
        break;
      }
      case "series_count":
        add(spec, context.seriesCount === plan.expectedSeriesCount, `${context.seriesCount} jobs`);
        break;
      case "missing_entity":
        add(
          spec,
          context.entityIds.includes(spec.target),
          "Required entity reference availability",
        );
        break;
      case "exact_text":
      case "unwanted_text": {
        try {
          if (!context.ocr) throw new Error("No OCR provider");
          ocr ??= await context.ocr.read(context.image);
          if (!Number.isFinite(ocr.confidence) || ocr.confidence < 0.9 || ocr.confidence > 1)
            throw new Error("Uncertain OCR");
          const normalize = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();
          const actual = normalize(ocr.text);
          // Count occurrences so duplicate requested labels are not satisfied by one occurrence.
          const expected = spec.expectedText ?? [];
          const counts = new Map<string, number>();
          for (const text of expected) {
            const t = normalize(text);
            counts.set(t, (counts.get(t) ?? 0) + 1);
          }
          const passed =
            spec.kind === "unwanted_text"
              ? actual.length === 0
              : expected.length > 0 &&
                [...counts].every(
                  ([text, n]) =>
                    text.length > 0 &&
                    [
                      ...actual.matchAll(
                        new RegExp(
                          `(?<![\\p{L}\\p{N}])${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`,
                          "gu",
                        ),
                      ),
                    ].length >= n,
                );
          add(
            spec,
            passed,
            passed ? "OCR text requirements satisfied" : "OCR text requirements differ",
            "ocr",
          );
        } catch {
          unavailable(spec, "ocr");
        }
        break;
      }
      case "edit_preservation": {
        if (context.mask && context.source) {
          try {
            const difference = outsideMaskDifference(
              decodePng(context.source.bytes),
              decodePng(context.image.bytes),
              decodePng(context.mask.bytes),
            );
            add(
              spec,
              difference <= 0.015,
              `Outside-mask normalized pixel difference ${difference.toFixed(6)}`,
            );
          } catch {
            unavailable(spec, "deterministic");
          }
        } else subjective.push(spec);
        break;
      }
      default:
        subjective.push(spec);
    }
  }
  if (subjective.length) {
    try {
      if (!context.judge) throw new Error("No visual judge");
      const decisions = await context.judge.judge({
        image: context.image,
        references: context.references,
        checks: subjective,
        referenceBindings: context.referenceBindings,
      });
      for (const spec of subjective) {
        const matching = decisions.filter((d) => d.id === spec.id);
        const d = matching[0];
        if (
          matching.length !== 1 ||
          !d ||
          typeof d.passed !== "boolean" ||
          !Number.isFinite(d.confidence) ||
          d.confidence < 0.8 ||
          d.confidence > 1 ||
          typeof d.evidence !== "string"
        )
          unavailable(spec, "visual_judge");
        else add(spec, d.passed, d.evidence.slice(0, 400), "visual_judge");
      }
    } catch {
      for (const spec of subjective) unavailable(spec, "visual_judge");
    }
  }
  const result: ValidationResult = {
    checks,
    verdict: checks.every((c) => c.status === "pass") ? "pass" : "fail",
  };
  if (
    result.verdict !== "pass" &&
    planRepair(result, { hasMask: !!context.mask, hasReferences: !!context.references.length })
  )
    result.verdict = "repairable";
  return result;
}
