import { createRouter, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { StatusPage } from "@/components/StatusPage";

function DefaultErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <>
      <title>Something went wrong — Depikt</title>
      <meta name="robots" content="noindex, nofollow" />
      <StatusPage
        eyebrow="Unexpected error"
        title="Something"
        accent="went wrong."
        lede="An unexpected error occurred. Please try again."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="inline-flex h-12 items-center rounded-full bg-[color:var(--text-primary)] px-7 text-[15px] font-medium text-[color:var(--bg)] transition-colors hover:bg-[color:var(--accent-hover)]"
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex h-12 items-center rounded-full border border-[color:var(--border-default)] bg-white px-7 text-[15px] font-medium text-[color:var(--text-primary)] transition-colors hover:border-[color:var(--border-strong)]"
            >
              Go home
            </a>
          </>
        }
      >
        {import.meta.env.DEV && error instanceof Error && error.message && (
          <pre className="mx-auto mt-8 max-h-40 w-full max-w-[640px] overflow-auto rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] p-4 text-left font-mono text-xs text-[color:var(--error)]">
            {error.message}
          </pre>
        )}
      </StatusPage>
    </>
  );
}

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    trailingSlash: "preserve",
    context: {},
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
  });

  return router;
};
