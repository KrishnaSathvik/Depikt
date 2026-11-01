import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";

/**
 * Full-page status screens (404, unexpected error) in the site's chrome, so a
 * dead end still looks like Depikt and keeps the header and footer in reach.
 * Header/Footer only need the default auth context, so this also renders
 * outside the root providers.
 */
export function StatusPage({
  eyebrow,
  title,
  accent,
  lede,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  lede: string;
  actions: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center px-4 py-24 sm:px-6 sm:py-32">
        <PageHero
          align="center"
          eyebrow={eyebrow}
          title={title}
          accent={accent}
          lede={lede}
          actions={actions}
        />
        {children}
      </main>
      <Footer />
    </div>
  );
}
