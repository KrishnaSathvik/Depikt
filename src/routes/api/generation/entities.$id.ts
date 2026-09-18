import { createFileRoute } from "@tanstack/react-router";
import { handleEntityRequest } from "@/lib/generation/entity-api";
import { corsHeaders } from "@/lib/api/public-route";
export const Route = createFileRoute("/api/generation/entities/$id")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      PATCH: async ({ request, params }) => handleEntityRequest(request, params.id),
      DELETE: async ({ request, params }) => handleEntityRequest(request, params.id),
    },
  },
});
