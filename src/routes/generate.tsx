import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy Prompt Builder URL. Build is now a mode of the unified /prompt
 * workspace; every existing link, bookmark, and query param keeps working.
 */
export const Route = createFileRoute("/generate")({
  validateSearch: (search: Record<string, unknown>) => search,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/prompt",
      search: { ...(search as Record<string, unknown>), mode: "build" as const },
      replace: true,
      statusCode: 301,
    });
  },
});
