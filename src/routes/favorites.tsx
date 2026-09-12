import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { FavoritesTab } from "@/components/account/FavoritesTab";
import { useAuth } from "@/lib/auth-context";
import { ROUTES, SEO, TOOL } from "@/lib/product";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: SEO.favorites.title },
      { name: "description", content: SEO.favorites.description },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FavoritesPage,
});

/**
 * Public: favorites are local (Dexie/IndexedDB, src/lib/favorites.ts) and
 * were never tied to a signed-in account, so this page never gates on
 * auth -- unlike /account's Favorites tab, which only signed-in visitors
 * could reach. Signed-in users see the same list here as in Account;
 * Account's rail links out to this page instead of re-rendering it.
 */
function FavoritesPage() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Link
          to={ROUTES.library}
          className="mb-6 inline-flex items-center gap-1.5 text-mono-sm text-[color:var(--text-tertiary)] transition-colors hover:text-[color:var(--text-primary)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {TOOL.library}
        </Link>
        <FavoritesTab />
        {!user && (
          <p className="mt-10 border-t border-[color:var(--border-subtle)] pt-6 text-body-sm text-[color:var(--text-tertiary)]">
            This list lives on this device only.{" "}
            <Link
              to={ROUTES.signUp}
              className="underline underline-offset-4 hover:text-[color:var(--text-primary)]"
            >
              Create an account
            </Link>{" "}
            to keep it safe if you clear your browser or switch devices.
          </p>
        )}
      </main>
    </div>
  );
}
