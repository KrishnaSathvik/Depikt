import { createFileRoute } from "@tanstack/react-router";
import { CATEGORIES, MODES } from "@/lib/depikt";
import { runBuilder } from "@/lib/prompt-engine/builder";
import { runCritic } from "@/lib/prompt-engine/critic";
import { clientMessageFor } from "@/lib/openai/errors";
import { encodeSseEvent } from "@/lib/openai/sse";
import {
  corsHeaders,
  getClientIp,
  jsonError,
  rateLimitExceeded,
  sseHeaders,
  validateImage,
  validateReferenceIntent,
  validateRemixRef,
  validateText,
} from "@/lib/api/public-route";

// Allowlists derived from the same source the UI uses.
const ALLOWED_CATEGORIES = new Set<string>(CATEGORIES.map((c) => c.value));
const ALLOWED_MODES = new Set<string>(MODES.map((m) => m.value));

interface RequestBody {
  userInput: string;
  referenceImageUrl?: string;
  referenceIntent?: string;
  remixRef?: string;
  category?: string;
  mode?: string;
}

/**
 * Prompt Builder endpoint (Images 2.5 engine v3).
 * SSE contract (unchanged): status → delta {args} → done {result} | error {error}.
 * `mode: CRITIQUE` is still accepted for backward compatibility and is served
 * by the separate Critic pipeline; new clients should use /api/public/critique-prompt.
 */
export const Route = createFileRoute("/api/public/generate-prompt")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const ip = getClientIp(request);
          if (rateLimitExceeded(ip))
            return jsonError("Too many requests. Please wait a moment and try again.", 429);

          const body = (await request.json()) as RequestBody;
          const { mode = "default" } = body;

          const userInput = validateText(body.userInput, "userInput");
          if (userInput instanceof Response) return userInput;
          if (typeof mode !== "string" || mode.length > 50 || !ALLOWED_MODES.has(mode))
            return jsonError("Invalid mode", 400);
          const image = validateImage(body.referenceImageUrl);
          if (image instanceof Response) return image;
          const referenceIntent = validateReferenceIntent(body.referenceIntent);
          if (referenceIntent instanceof Response) return referenceIntent;
          const category = body.category;
          if (category !== undefined && category !== null) {
            if (
              typeof category !== "string" ||
              category.length > 100 ||
              !ALLOWED_CATEGORIES.has(category)
            )
              return jsonError("Invalid category", 400);
          }
          const remixRef = validateRemixRef(body.remixRef);

          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) return jsonError("AI service not configured", 500);

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
                  closed = true;
                  abort.abort();
                }
              };

              send("status", { message: "starting" });
              try {
                if (mode === "CRITIQUE") {
                  for await (const evt of runCritic({
                    apiKey,
                    prompt: userInput,
                    referenceImageUrl: image,
                    referenceIntent,
                    signal: abort.signal,
                  })) {
                    if (closed) break;
                    if (evt.type === "delta") send("delta", { args: evt.accumulated });
                    else if (evt.type === "done") send("done", evt.result);
                    else {
                      console.error(
                        "critique (legacy mode) upstream error:",
                        evt.kind,
                        evt.message,
                      );
                      send("error", { error: clientMessageFor(evt.kind) });
                    }
                  }
                } else {
                  for await (const evt of runBuilder({
                    apiKey,
                    userInput,
                    mode,
                    referenceImageUrl: image,
                    referenceIntent,
                    category: category ?? null,
                    remixRef,
                    signal: abort.signal,
                  })) {
                    if (closed) break;
                    if (evt.type === "intent")
                      send("status", { message: "intent", intent: evt.intent, ms: evt.latencyMs });
                    else if (evt.type === "delta") send("delta", { args: evt.accumulated });
                    else if (evt.type === "done") send("done", evt.result);
                    else {
                      console.error(`generate-prompt ${evt.stage} error:`, evt.kind, evt.message);
                      send("error", { error: clientMessageFor(evt.kind) });
                    }
                  }
                }
                safeClose();
              } catch (err) {
                console.error("stream error:", err);
                send("error", { error: "An internal error occurred. Please try again." });
                safeClose();
              }
            },
            cancel() {
              abort.abort();
            },
          });

          return new Response(stream, { status: 200, headers: sseHeaders });
        } catch (err) {
          console.error("generate-prompt error:", err);
          return jsonError("An internal error occurred. Please try again.", 500);
        }
      },
    },
  },
});
