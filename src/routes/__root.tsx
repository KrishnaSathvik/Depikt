import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";


import appCss from "../styles.css?url";

const DEFAULT_TITLE = "Image prompt generator — turn rough ideas into production-grade AI prompts";
const DEFAULT_DESCRIPTION =
  "Turn any rough idea into a production-grade AI image prompt in seconds. Browse 500 curated prompts for posters, infographics, UI mockups, cinematic scenes, and more.";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="eyebrow">Error · 404</p>
        <h1 className="mt-4 text-display-md">Page not found</h1>
        <p className="mt-3 text-body-md text-[color:var(--text-secondary)]">
          The page you’re looking for doesn’t exist.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-[color:var(--accent)] px-5 py-3 text-sm font-medium text-[color:var(--accent-text)] transition-colors hover:bg-[color:var(--accent-hover)]"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

const STRUCTURED_DATA = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Depikt",
    url: "https://depikt.app",
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: "https://depikt.app/?page=1&view=browse",
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Depikt",
    url: "https://depikt.app/generate",
    applicationCategory: "DesignApplication",
    operatingSystem: "Any",
    description:
      "AI image prompt generator that turns rough ideas into production-grade prompts for OpenAI's GPT Image 2.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
];

export const Route = createRootRoute({
  head: () => { const ROOT_OG_IMAGE = getOgImageForPath(); return ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { name: "color-scheme", content: "light" },
      { name: "theme-color", content: "#FAFAF7" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Depikt" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "application-name", content: "Depikt" },
      { title: DEFAULT_TITLE },
      { name: "description", content: DEFAULT_DESCRIPTION },
      { property: "og:title", content: DEFAULT_TITLE },
      { property: "og:description", content: DEFAULT_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:image", content: ROOT_OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: ROOT_OG_IMAGE },
      { name: "twitter:title", content: DEFAULT_TITLE },
      { name: "twitter:description", content: DEFAULT_DESCRIPTION },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500;600&display=swap",
      },
    ],
    scripts: STRUCTURED_DATA.map((d) => ({
      type: "application/ld+json",
      children: JSON.stringify(d),
    })),
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Outlet />
        <Toaster
          theme="light"
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-md)",
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
