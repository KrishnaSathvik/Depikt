import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { useAuth } from "@/lib/auth-context";
import { safeNextPath } from "@/lib/auth/next-param";
import { SEO } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";

const PAGE_URL = absoluteUrl("/sign-in");

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): { next?: string } =>
    typeof search.next === "string" ? { next: safeNextPath(search.next) } : {},
  head: () => ({
    meta: [
      { title: SEO.signIn.title },
      { name: "description", content: SEO.signIn.description },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: SEO.signIn.title },
      { property: "og:description", content: SEO.signIn.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
  component: Page,
});

function Page() {
  const { next } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const nextPath = safeNextPath(next);

  // Already signed in: there is nothing to do here.
  useEffect(() => {
    if (!loading && user) void navigate({ to: nextPath, replace: true });
  }, [loading, user, nextPath, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 items-start justify-center px-4 py-16 sm:px-6 sm:py-24 lg:px-12">
        <AuthSurface mode="sign-in" next={nextPath} />
      </main>
      <Footer />
    </div>
  );
}
