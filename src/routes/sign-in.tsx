import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { useAuth } from "@/lib/auth-context";
import { safeNextPath } from "@/lib/auth/next-param";
import { SEO } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import { pageSeoHead } from "@/lib/seo";

const PAGE_URL = absoluteUrl("/sign-in");

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): { next?: string } =>
    typeof search.next === "string" ? { next: safeNextPath(search.next) } : {},
  head: () => {
    const { meta, links } = pageSeoHead(SEO.signIn, {
      url: PAGE_URL,
      image: getOgImageForPath("signIn"),
    });
    return { meta, links };
  },
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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="relative isolate flex w-full flex-1 items-start justify-center overflow-hidden px-4 py-12 sm:px-6 sm:py-20">
        {/* Soft warm halo behind the card -- decoration only. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-10 -z-10 h-[420px] w-[min(720px,140vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,138,92,0.16),rgba(139,92,246,0.08)_55%,transparent)] blur-2xl"
        />
        <AuthSurface mode="sign-in" next={nextPath} />
      </main>
      <Footer />
    </div>
  );
}
