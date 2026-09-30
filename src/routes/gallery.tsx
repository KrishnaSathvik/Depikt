import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/gallery")({
  validateSearch: (search: Record<string, unknown>) => search,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/library",
      search: { ...search, tab: "gallery" },
      replace: true,
      statusCode: 301,
    });
  },
});
