import { sanitizeSeriesIntent, childExactText } from "./series-exact-text.ts";
import type { ResolvedEntity } from "./entities.ts";
import { z } from "zod";
import { createStructuredResponse } from "../openai/client.ts";
import { MODEL_ROLES } from "../openai/models.ts";
import type { ResultContract } from "../openai/schemas.ts";
import type { Intent } from "../prompt-engine/intent.ts";
import { toStrictJsonSchema } from "../prompt-engine/schemas.ts";

const SeriesDecompositionSchema = z.strictObject({
  title: z.string(),
  children: z.array(
    z.strictObject({
      label: z.string(),
      prompt: z.string(),
    }),
  ),
});

export type SeriesDecomposition = z.infer<typeof SeriesDecompositionSchema>;

const SERIES_DECOMPOSITION_CONTRACT: ResultContract<SeriesDecomposition> = {
  pipeline: "builder",
  name: "depikt_series_decomposition_v1",
  zod: SeriesDecompositionSchema,
  jsonSchema: toStrictJsonSchema(SeriesDecompositionSchema),
};

const DECOMPOSER_INSTRUCTIONS = `Split a request for a coordinated image series into separate image briefs.
Return exactly the requested number of children when possible. Each child must describe one standalone image.
Keep shared visual and factual requirements consistent, while making each child's distinct subject or role clear.
Scene names and child labels are metadata, never text to render. Include exact copy only when explicitly requested in ORIGINAL REQUEST, and only in the child it belongs to. Shared campaign copy belongs in every child. Do not invent headlines or captions.
Do not make collages, contact sheets, grids, panels, or PAGE blocks. Do not decide the number of images.`;

export interface DecomposeSeriesOptions {
  entities?: ResolvedEntity[];
  userInput: string;
  intent: Intent;
  selectedCount: number;
  apiKey?: string;
  signal?: AbortSignal;
  complete?: () => Promise<SeriesDecomposition>;
}

export function selectDecomposerInput(opts: {
  userInput: string | null | undefined;
  writerPrompt: string;
}): string {
  const original = opts.userInput?.trim();
  if (original) return original;
  return opts.writerPrompt.trim();
}

export async function decomposeSeries(opts: DecomposeSeriesOptions): Promise<SeriesDecomposition> {
  opts = { ...opts, intent: sanitizeSeriesIntent(opts.intent, opts.userInput) };
  const count = normalizeCount(opts.selectedCount);
  let decomposition: SeriesDecomposition | null = null;

  try {
    decomposition = opts.complete ? await opts.complete() : await completeWithLuna(opts, count);
  } catch {
    // A decomposer outage must not change the selected count or prevent the
    // already-confirmed series from being enqueued.
  }

  return sanitizeDecomposition(decomposition, opts.userInput.trim(), opts.intent, count);
}

async function completeWithLuna(
  opts: DecomposeSeriesOptions,
  count: number,
): Promise<SeriesDecomposition> {
  if (!opts.apiKey) throw new Error("OPENAI_API_KEY is required for series decomposition");
  const outcome = await createStructuredResponse({
    apiKey: opts.apiKey,
    config: MODEL_ROLES.INTENT,
    instructions: DECOMPOSER_INSTRUCTIONS,
    input: [
      {
        role: "user",
        content: `ORIGINAL REQUEST:\n${opts.userInput.trim()}\n\nNUMBER OF IMAGES: ${count}\n\nINTENT:\n${JSON.stringify(opts.intent)}${opts.entities?.length ? `\n\nENTITIES (identity context only; reference selection is already fixed):\n${opts.entities.map((e) => `${e.name} (${e.type}): ${e.description}`).join("\n")}` : ""}`,
      },
    ],
    contract: SERIES_DECOMPOSITION_CONTRACT,
    signal: opts.signal,
  });
  return outcome.parsed;
}

function normalizeCount(selectedCount: number): number {
  if (!Number.isSafeInteger(selectedCount) || selectedCount < 1) {
    throw new Error("selectedCount must be a positive integer");
  }
  return selectedCount;
}

function sanitizeDecomposition(
  decomposition: SeriesDecomposition | null,
  userInput: string,
  intent: Intent,
  count: number,
): SeriesDecomposition {
  const supplied = decomposition?.children.slice(0, count) ?? [];
  const children = Array.from({ length: count }, (_, index) => {
    const child = supplied[index];
    const fallback = `Image ${index + 1} of ${count} — ${userInput}.`;
    const basePrompt = stripCollage(child?.prompt.trim() || fallback);
    const exactText = childExactText(intent, userInput, basePrompt, index);
    // A model response (or outage fallback) may repeat another child's copy.
    // Remove those literals before attaching this child's authoritative text.
    const scopedPrompt = intent.exact_text
      .filter((item) => !exactText.includes(item))
      .reduce((prompt, item) => prompt.replaceAll(item.text, ""), basePrompt);
    return {
      label: child?.label.trim() || `Image ${index + 1}`,
      prompt: appendSharedConstraints(scopedPrompt, { ...intent, exact_text: exactText }),
    };
  });

  return {
    title: decomposition?.title.trim() || "Image series",
    children,
  };
}

function stripCollage(prompt: string): string {
  return prompt
    .replace(/\bcollages?\b/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function appendSharedConstraints(prompt: string, intent: Intent): string {
  const constraints: string[] = [];
  if (intent.aspect_ratio.value) {
    constraints.push(`Use aspect ratio ${intent.aspect_ratio.value}.`);
  }
  constraints.push("This is a single standalone image, not a collage.");
  if (intent.exact_text.length > 0) {
    const exactText = intent.exact_text
      .map(({ role, text }) => `${role}: ${JSON.stringify(text)}`)
      .join("; ");
    constraints.push(`Render this exact text verbatim: ${exactText}.`);
  }
  constraints.push(
    "Do not add scene-name labels, headlines, or captions beyond the exact copy specified for this image. Preserve text already present on referenced products and logos.",
  );
  if (intent.series.consistency_requirements.length > 0) {
    constraints.push(
      `Keep these series consistency requirements: ${intent.series.consistency_requirements.join("; ")}.`,
    );
  }
  return [prompt, ...constraints].join(" ");
}
