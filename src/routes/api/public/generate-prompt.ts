import { createFileRoute } from "@tanstack/react-router";
import { SYSTEM_PROMPT, CATEGORIES, MODES, PROMPT_VERSION } from "@/lib/depikt";
import { buildPromptRequest, type PromptMode } from "@/lib/prompt-request";
import { sanitizeResultFields } from "@/lib/sanitize";
import { MODEL_ROLES } from "@/lib/openai/models";
import { selectContract } from "@/lib/openai/schemas";
import { streamStructuredResponse, type InputMessage } from "@/lib/openai/client";
import { clientMessageFor } from "@/lib/openai/errors";
import { encodeSseEvent } from "@/lib/openai/sse";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Allowlists derived from the same source the UI uses — keeps server validation
// in lockstep with frontend options without duplication.
const ALLOWED_CATEGORIES = new Set<string>(CATEGORIES.map((c) => c.value));
const ALLOWED_MODES = new Set<string>(MODES.map((m) => m.value));

// In-memory IP rate limiter (best-effort; per-instance). For production abuse
// resistance, pair this with Cloudflare WAF/Rate Limiting, Turnstile, or a
// Durable Object/KV-backed limiter so counts survive cold starts and regions.
// Limits: 10 requests / minute and 60 requests / hour per IP.
const RATE_WINDOW_MIN_MS = 60_000;
const RATE_WINDOW_HOUR_MS = 3_600_000;
const RATE_LIMIT_MIN = 10;
const RATE_LIMIT_HOUR = 60;
const ipHits = new Map<string, number[]>();

function getClientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

function rateLimitExceeded(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_HOUR_MS);
  const recentMin = hits.filter((t) => now - t < RATE_WINDOW_MIN_MS).length;
  if (recentMin >= RATE_LIMIT_MIN || hits.length >= RATE_LIMIT_HOUR) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  // Opportunistic cleanup
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) {
      const fresh = v.filter((t) => now - t < RATE_WINDOW_HOUR_MS);
      if (fresh.length === 0) ipHits.delete(k);
      else ipHits.set(k, fresh);
    }
  }
  return false;
}

interface RequestBody {
  userInput: string;
  referenceImageUrl?: string;
  remixRef?: string;
  category?: string;
  mode?: string;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export const Route = createFileRoute("/api/public/generate-prompt")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          // Rate limit BEFORE doing any work
          const ip = getClientIp(request);
          if (rateLimitExceeded(ip)) {
            return jsonError("Too many requests. Please wait a moment and try again.", 429);
          }

          const body = (await request.json()) as RequestBody;
          const { userInput, referenceImageUrl, remixRef, category, mode = "default" } = body;

          if (!userInput || typeof userInput !== "string" || userInput.trim().length === 0) {
            return jsonError("userInput is required", 400);
          }
          if (userInput.length > 4000) {
            return jsonError("Input too long (max 4000 chars)", 400);
          }

          // Validate mode against allowlist (prevents prompt injection via mode field)
          if (typeof mode !== "string" || mode.length > 50 || !ALLOWED_MODES.has(mode)) {
            return jsonError("Invalid mode", 400);
          }

          // Validate reference image (optional base64 data URL, max 2MB)
          if (referenceImageUrl !== undefined && referenceImageUrl !== null) {
            if (
              typeof referenceImageUrl !== "string" ||
              !referenceImageUrl.startsWith("data:image/") ||
              referenceImageUrl.length > 2 * 1024 * 1024
            ) {
              return jsonError("Invalid reference image (must be a data:image/ URL under 2MB)", 400);
            }
          }

          // Validate category against allowlist (prevents prompt injection via category field).
          // Unknown values are rejected; absence is fine (auto-detect).
          if (category !== undefined && category !== null) {
            if (typeof category !== "string" || category.length > 100 || !ALLOWED_CATEGORIES.has(category)) {
              return jsonError("Invalid category", 400);
            }
          }

          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) {
            return jsonError("AI service not configured", 500);
          }

          // Deterministic request construction (v2.9 semantics: cinematic lock,
          // aspect lock, curated examples, remix block). See src/lib/prompt-request.ts.
          const req = buildPromptRequest({
            userInput,
            referenceImageUrl,
            remixRef,
            category,
            mode: mode as PromptMode,
          });

          // Pipeline selection: CRITIQUE → Critic contract + CRITIC role;
          // everything else → Builder contract family + BUILDER_DEFAULT role.
          const contract = selectContract(mode);
          const roleConfig = contract.pipeline === "critic" ? MODEL_ROLES.CRITIC : MODEL_ROLES.BUILDER_DEFAULT;

          // Multimodal input when an image is present, plain text otherwise.
          const input: InputMessage[] = [
            {
              role: "user",
              content: referenceImageUrl
                ? [
                    { type: "input_image", image_url: referenceImageUrl, detail: "low" },
                    { type: "input_text", text: req.userMessage },
                  ]
                : req.userMessage,
            },
          ];

          // Return SSE immediately, then start the AI request inside the stream.
          // This prevents the public route from timing out before the model sends headers.
          const encoder = new TextEncoder();
          const abort = new AbortController();

          const stream = new ReadableStream({
            async start(controller) {
              let closed = false;
              const safeClose = () => {
                if (closed) return;
                closed = true;
                try {
                  controller.close();
                } catch {
                  /* already closed */
                }
              };
              const send = (event: string, data: unknown) => {
                if (closed) return;
                try {
                  controller.enqueue(encoder.encode(encodeSseEvent(event, data)));
                } catch {
                  // Client disconnected mid-stream — stop trying.
                  closed = true;
                  abort.abort();
                }
              };

              send("status", { message: "starting" });

              try {
                const events = streamStructuredResponse({
                  apiKey,
                  config: roleConfig,
                  instructions: SYSTEM_PROMPT,
                  input,
                  contract,
                  signal: abort.signal,
                });
                for await (const evt of events) {
                  if (closed) break;
                  if (evt.type === "delta") {
                    // Same client contract as before: the accumulated JSON so far.
                    send("delta", { args: evt.accumulated });
                  } else if (evt.type === "done") {
                    const final = sanitizeResultFields({ ...(evt.outcome.parsed as Record<string, unknown>) });
                    final.prompt_version = PROMPT_VERSION;
                    send("done", final);
                    safeClose();
                  } else {
                    console.error("generate-prompt upstream error:", evt.kind, evt.message);
                    send("error", { error: clientMessageFor(evt.kind) });
                    safeClose();
                  }
                }
                safeClose();
              } catch (err) {
                console.error("stream error:", err);
                // Generic client message — full error is logged server-side only.
                send("error", { error: "An internal error occurred. Please try again." });
                safeClose();
              }
            },
            cancel() {
              // Client disconnected — stop the upstream request.
              abort.abort();
            },
          });

          return new Response(stream, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
              "X-Accel-Buffering": "no",
              ...corsHeaders,
            },
          });
        } catch (err) {
          console.error("generate-prompt error:", err);
          // Generic client message — full error is logged server-side only.
          return jsonError("An internal error occurred. Please try again.", 500);
        }
      },
    },
  },
});
