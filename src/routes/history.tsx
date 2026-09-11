import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HistoryTab } from "@/components/account/HistoryTab";
import { useAuth } from "@/lib/auth-context";
import { ROUTES, SEO } from "@/lib/product";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: SEO.history.title },
      { name: "description", content: SEO.history.description },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: HistoryPage,
});

/**
 * Public: history is local (Dexie/IndexedDB, src/lib/history-db.ts) and was
 * never tied to a signed-in account, so this page never gates on auth --
 * unlike /account's History tab, which only signed-in visitors could
 * reach. Signed-in users see the same list here as in Account; Account's
 * rail links out to this page instead of re-rendering it.
 */
function HistoryPage() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <HistoryTab />
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
      <Footer />
    </div>
  );
}
