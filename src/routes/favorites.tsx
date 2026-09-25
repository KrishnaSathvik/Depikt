import { createFileRoute, redirect } from "@tanstack/react-router";

/** Existing bookmarks open the same local favorites in the unified Library. */
export const Route = createFileRoute("/favorites")({
  beforeLoad: () => {
    throw redirect({
      to: "/library",
      search: { tab: "prompts", favorites: true },
      replace: true,
      statusCode: 301,
    });
  },
});
