import { createFileRoute, redirect } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GenerateWorkspace } from "@/components/generate/GenerateWorkspace";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";

/**
 * /generate. Behind the native-generation feature flag: while off, this
 * keeps its historical behavior — a permanent redirect to the unified
 * Prompt workspace in Build mode — so nothing about the shipped product
 * changes until GENERATION_ENABLED/VITE_GENERATION_ENABLED is flipped.
 * When on, this is the real generation page (see
 * src/components/generate/GenerateWorkspace.tsx).
 */
export const Route = createFileRoute("/generate")({
  validateSearch: (search: Record<string, unknown>) => search,
  beforeLoad: ({ search }) => {
    if (isNativeGenerationEnabled()) return;
    throw redirect({
      to: "/prompt",
      search: { ...(search as Record<string, unknown>), mode: "build" as const },
      replace: true,
      statusCode: 301,
    });
  },
  component: GeneratePage,
});

function GeneratePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="flex-1">
        <GenerateWorkspace />
      </main>
      <Footer />
    </div>
  );
}
