// Exact replica of the pre-migration route's OpenAI call: Chat Completions,
// one loose `deliver_prompt` tool with a mode-dependent required list, forced
// tool_choice, temperature 0.7. Non-streaming so `usage` is reported.
// Used ONLY by the benchmark harness to measure the true v2.9 baseline.

import type { ModelConfig, TokenUsage } from "../../src/lib/openai/models.ts";
import { estimateCostUsd } from "../../src/lib/openai/models.ts";

export function legacyTools(mode: string) {
  const requiredByMode: Record<string, string[]> = {
    default: ["prompt", "category", "why_it_works"],
    BATCH: ["prompts", "category", "why_it_works"],
    JSON: ["prompt", "category", "size", "quality", "aspect_ratio", "why_it_works"],
    CRITIQUE: ["score", "weaknesses", "improvements", "rewritten_prompt", "category"],
  };
  return [
    {
      type: "function" as const,
      function: {
        name: "deliver_prompt",
        description: "Deliver the polished prompt result.",
        parameters: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "Single polished prompt (default/JSON modes)" },
            prompts: { type: "array", items: { type: "string" }, description: "Three variants for BATCH mode: safe, stylized, experimental" },
            category: { type: "string" },
            why_it_works: { type: "string" },
            size: { type: "string", description: "JSON mode only" },
            quality: { type: "string", description: "JSON mode only" },
            aspect_ratio: { type: "string", description: "JSON mode only" },
            score: { type: "number", description: "CRITIQUE mode only, 1-10" },
            weaknesses: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
            rewritten_prompt: { type: "string", description: "CRITIQUE mode only — full rewritten prompt with all improvements applied" },
          },
          required: requiredByMode[mode] || requiredByMode.default,
        },
      },
    },
  ];
}

export interface LegacyOutcome {
  rawText: string;
  usage: TokenUsage;
  estimatedCostUsd: number;
  latencyMs: number;
  requestId?: string;
}

export async function legacyChatCompletion(opts: {
  apiKey: string;
  config: ModelConfig;
  systemPrompt: string;
  userMessage: string;
  mode: string;
}): Promise<LegacyOutcome> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.config.timeoutMs);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: opts.config.model,
        messages: [
          { role: "system", content: opts.systemPrompt },
          { role: "user", content: opts.userMessage },
        ],
        tools: legacyTools(opts.mode),
        tool_choice: { type: "function", function: { name: "deliver_prompt" } },
        ...(opts.config.temperature !== undefined ? { temperature: opts.config.temperature } : {}),
        stream: false,
      }),
      signal: controller.signal,
    });
    const requestId = res.headers.get("x-request-id") ?? undefined;
    if (!res.ok) throw new Error(`chat http ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = (await res.json()) as {
      choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number }; completion_tokens_details?: { reasoning_tokens?: number } };
    };
    const rawText = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "";
    const usage: TokenUsage = {
      inputTokens: json.usage?.prompt_tokens ?? 0,
      cachedInputTokens: json.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
      reasoningTokens: json.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
    };
    return { rawText, usage, estimatedCostUsd: estimateCostUsd(opts.config.model, usage), latencyMs: Date.now() - started, requestId };
  } finally {
    clearTimeout(timer);
  }
}
