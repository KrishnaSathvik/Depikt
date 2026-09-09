import { createFileRoute } from "@tanstack/react-router";
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
  validateText,
} from "@/lib/api/public-route";

interface RequestBody {
  prompt: string;
  referenceImageUrl?: string;
  referenceIntent?: string;
}

/**
 * Prompt Critic endpoint (Images 2.5 engine v3). Separate pipeline from the
 * Builder: its own instructions, schema, and model role (Terra, reasoning medium).
 * SSE contract: status → delta {args} → done {result} | error {error}.
 */
export const Route = createFileRoute("/api/public/critique-prompt")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const ip = getClientIp(request);
          if (rateLimitExceeded(ip))
            return jsonError("Too many requests. Please wait a moment and try again.", 429);

          const body = (await request.json()) as RequestBody;
          const prompt = validateText(body.prompt, "prompt");
          if (prompt instanceof Response) return prompt;
          const image = validateImage(body.referenceImageUrl);
          if (image instanceof Response) return image;
          const referenceIntent = validateReferenceIntent(body.referenceIntent);
          if (referenceIntent instanceof Response) return referenceIntent;

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
                for await (const evt of runCritic({
                  apiKey,
                  prompt,
                  referenceImageUrl: image,
                  referenceIntent,
                  signal: abort.signal,
                })) {
                  if (closed) break;
                  if (evt.type === "delta") send("delta", { args: evt.accumulated });
                  else if (evt.type === "done") send("done", evt.result);
                  else {
                    console.error("critique-prompt upstream error:", evt.kind, evt.message);
                    send("error", { error: clientMessageFor(evt.kind) });
                  }
                }
                safeClose();
              } catch (err) {
                console.error("critique stream error:", err);
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
          console.error("critique-prompt error:", err);
          return jsonError("An internal error occurred. Please try again.", 500);
        }
      },
    },
  },
});
