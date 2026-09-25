import { createFileRoute, redirect } from "@tanstack/react-router";
import { validateCreatorSearch } from "@/lib/creator-search";

export const Route = createFileRoute("/prompt")({
  validateSearch: validateCreatorSearch,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/", search, hash: "create", replace: true, statusCode: 301 });
  },
});
