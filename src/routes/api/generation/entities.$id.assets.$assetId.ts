import { createFileRoute } from "@tanstack/react-router";
import { handleEntityRequest } from "@/lib/generation/entity-api";
import { corsHeaders } from "@/lib/api/public-route";
export const Route = createFileRoute("/api/generation/entities/$id/assets/$assetId")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      DELETE: async ({ request, params }) =>
        handleEntityRequest(request, params.id, params.assetId, true),
    },
  },
});
