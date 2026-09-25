import { createFileRoute, redirect } from "@tanstack/react-router";
import { validateCreatorSearch } from "@/lib/creator-search";

export const Route = createFileRoute("/generate")({
  validateSearch: validateCreatorSearch,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/",
      search: { ...search, mode: "generate" },
      hash: "create",
      replace: true,
      statusCode: 301,
    });
  },
});
