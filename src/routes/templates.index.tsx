import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/templates/")({
  validateSearch: (search: Record<string, unknown>) => search,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/library",
      search: { ...search, tab: "templates" },
      replace: true,
      statusCode: 301,
    });
  },
});
