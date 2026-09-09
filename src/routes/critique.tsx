import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy Prompt Critic URL. Critique is now a mode of the unified /prompt
 * workspace; existing links and restore params keep working.
 */
export const Route = createFileRoute("/critique")({
  validateSearch: (search: Record<string, unknown>) => search,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/prompt",
      search: { ...(search as Record<string, unknown>), mode: "critique" as const },
      replace: true,
      statusCode: 301,
    });
  },
});
