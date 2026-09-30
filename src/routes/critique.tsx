import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy Prompt Critic URL. Critique is now a mode of the Home creator
 * workspace; existing links and restore params keep working.
 */
export const Route = createFileRoute("/critique")({
  validateSearch: (search: Record<string, unknown>) => search,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/",
      search: { ...(search as Record<string, unknown>), mode: "critique" as const },
      hash: "create",
      replace: true,
      statusCode: 301,
    });
  },
});
