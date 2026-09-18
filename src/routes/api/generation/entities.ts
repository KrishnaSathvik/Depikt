import { createFileRoute } from "@tanstack/react-router";
import { handleEntityRequest } from "@/lib/generation/entity-api";
import { corsHeaders } from "@/lib/api/public-route";
export const Route = createFileRoute("/api/generation/entities")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => handleEntityRequest(request),
      POST: async ({ request }) => handleEntityRequest(request),
    },
  },
});
