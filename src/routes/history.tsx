import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { HistoryTab } from "@/components/account/HistoryTab";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/db";
import { migrateLocalStorageHistory } from "@/lib/migrate-history";
import { ROUTES, SEO } from "@/lib/product";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: SEO.history.title },
      { name: "description", content: SEO.history.description },
      { property: "og:title", content: SEO.history.title },
      { property: "og:description", content: SEO.history.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: SEO.history.robots },
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
 *
 * The page owns the hero and the empty state; HistoryTab owns the list and
 * its actions. Its own small heading is hidden here (the hero replaces it)
 * and its hairline grid is restyled into separate cards from this wrapper.
 */
const LIST_STYLES = [
  "[&>div>h1]:hidden [&>div>h1+p]:hidden [&>div>div]:mt-0",
  "[&_.grid]:gap-4 [&_.grid]:border-0 [&_.grid]:bg-transparent",
  "[&_article]:rounded-[20px] [&_article]:border [&_article]:border-[color:var(--border-subtle)] [&_article]:p-5 [&_article]:shadow-[0_1px_2px_rgba(17,17,17,0.04)] [&_article]:transition-[transform,box-shadow,border-color] [&_article]:duration-200",
  "[&_article:hover]:-translate-y-0.5 [&_article:hover]:border-[color:var(--border-default)] [&_article:hover]:bg-[color:var(--bg-elevated)] [&_article:hover]:shadow-[0_18px_40px_-22px_rgba(17,17,17,0.28)]",
  "[&_article_button]:h-9 [&_article_button]:w-9 [&_article_button]:rounded-full max-sm:[&_article_button]:opacity-100",
].join(" ");

function HistoryPage() {
  const { user } = useAuth();
  // undefined while IndexedDB is still answering (and during SSR), so the
  // empty state never flashes before the list arrives.
  const count = useLiveQuery(() => db.history.count(), []);

  useEffect(() => {
    void migrateLocalStorageHistory();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-20 pt-12 sm:px-6 lg:pb-28 lg:pt-20">
        <PageHero
          eyebrow="History"
          title="Your recent"
          accent="drafts."
          lede="Improve prompt and Critique runs from this browser. Open one to pick up where you left off."
        />

        <div className="mt-10 lg:mt-12">
          {count === undefined ? (
            <div aria-hidden className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((n) => (
                <div
                  key={n}
                  className="h-[148px] animate-pulse rounded-[20px] bg-[color:var(--bg-subtle)]"
                />
              ))}
            </div>
          ) : count === 0 ? (
            <div className="surface-card relative overflow-hidden px-6 py-16 text-center sm:py-20">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ backgroundImage: "var(--page-glow)" }}
              />
              <div className="relative">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[image:var(--brand-gradient)] text-white shadow-[var(--brand-glow)]">
                  <Clock aria-hidden className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <h2 className="mt-6 text-[24px] font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
                  No history yet
                </h2>
                <p className="mx-auto mt-2 max-w-[42ch] text-body-md text-[color:var(--text-secondary)]">
                  Improve or critique a prompt and it will wait for you here.
                </p>
                <Button asChild size="lg" variant="brand" className="mt-8">
                  <Link to="/" hash="create">
                    Start creating <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className={LIST_STYLES}>
              <HistoryTab />
            </div>
          )}
        </div>

        {!user && (
          <p className="mt-10 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] px-5 py-4 text-body-sm text-[color:var(--text-secondary)]">
            This list lives on this device only.{" "}
            <Link
              to={ROUTES.signUp}
              className="font-medium text-[color:var(--text-primary)] underline underline-offset-4"
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
