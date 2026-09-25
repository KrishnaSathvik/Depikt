import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/templates/")({
  beforeLoad: () => {
    throw redirect({
      to: "/library",
      search: { tab: "templates" },
      replace: true,
      statusCode: 301,
    });
  },
});
