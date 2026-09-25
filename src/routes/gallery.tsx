import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/gallery")({
  validateSearch: (search: Record<string, unknown>) => ({
    page:
      typeof search.page === "number" && Number.isInteger(search.page) && search.page > 0
        ? search.page
        : 1,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/library",
      search: { ...search, tab: "gallery" },
      replace: true,
      statusCode: 301,
    });
  },
});
