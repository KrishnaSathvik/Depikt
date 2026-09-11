import { createFileRoute, redirect } from "@tanstack/react-router";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";

/**
 * /generate. Generate is now a mode of the unified /prompt workspace (see
 * src/routes/prompt.tsx) rather than its own page — same merge that already
 * happened for /critique. Behind the native-generation feature flag: on,
 * this redirects to /prompt?mode=generate; off, to /prompt?mode=build (the
 * Generate tab doesn't exist yet, so falling back to Build keeps this link
 * useful instead of landing on a mode that isn't offered).
 */
export const Route = createFileRoute("/generate")({
  validateSearch: (search: Record<string, unknown>) => search,
  beforeLoad: ({ search }) => {
    const mode: "generate" | "build" = isNativeGenerationEnabled() ? "generate" : "build";
    throw redirect({
      to: "/prompt",
      search: { ...(search as Record<string, unknown>), mode },
      replace: true,
      statusCode: 301,
    });
  },
});
