import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth-context";
import { ROUTES, SEO } from "@/lib/product";

export interface AccountSearch {
  buy?: string;
  checkout?: string;
  session_id?: string;
}

export const Route = createFileRoute("/account")({
  validateSearch: (search: Record<string, unknown>): AccountSearch => ({
    ...(typeof search.buy === "string" ? { buy: search.buy } : {}),
    ...(typeof search.checkout === "string" ? { checkout: search.checkout } : {}),
    ...(typeof search.session_id === "string" ? { session_id: search.session_id } : {}),
  }),
  head: () => ({
    meta: [
      { title: SEO.account.title },
      { name: "description", content: SEO.account.description },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: ROUTES.signIn, search: { next: ROUTES.account }, replace: true });
    }
  }, [loading, user, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-[720px] flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <p className="eyebrow mb-2">Account</p>
        {user && (
          <p className="text-body-md text-[color:var(--text-secondary)]">
            Signed in as {user.email}
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
