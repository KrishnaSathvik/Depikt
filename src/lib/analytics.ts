/**
 * Google Analytics (GA4) via gtag.js.
 *
 * The gtag loader and base config are rendered into the document head by
 * src/routes/__root.tsx (so the tag is present in server HTML and detected by
 * Google), while page views and events are sent from the browser here so SPA
 * navigation is tracked correctly.
 *
 * Measurement ID: the Depikt GA4 property (G-9TN685P8FF). The Lovable Google
 * Analytics connector variable overrides it when set.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export const GA_MEASUREMENT_ID: string =
  (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY as string | undefined) ||
  "G-9TN685P8FF";

const MEASUREMENT_ID: string | undefined = GA_MEASUREMENT_ID;

export const GA_LOADER_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;

/** Inline bootstrap rendered in <head>; route changes are sent manually. */
export const GA_INLINE_SCRIPT = [
  "window.dataLayer = window.dataLayer || [];",
  "function gtag(){dataLayer.push(arguments);}",
  "gtag('js', new Date());",
  `gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });`,
].join("\n");

let initialized = false;

export function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

export function isAnalyticsEnabled() {
  return typeof window !== "undefined" && Boolean(MEASUREMENT_ID);
}

export function initAnalytics() {
  if (initialized || !isAnalyticsEnabled()) return;
  initialized = true;

  // The root route renders the loader and config in <head>; only fall back to
  // injecting them here if that markup is missing (e.g. a custom shell).
  if (document.querySelector(`script[src="${GA_LOADER_SRC}"]`)) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = GA_LOADER_SRC;
  document.head.appendChild(script);

  gtag("js", new Date());
  // Route changes are sent manually so SPA navigation is tracked correctly.
  gtag("config", MEASUREMENT_ID, { send_page_view: false });
}

export function trackPageview(path: string, title?: string) {
  if (!isAnalyticsEnabled()) return;
  gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: title ?? document.title,
  });
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (!isAnalyticsEnabled()) return;
  gtag("event", name, params);
}

function labelFor(el: HTMLElement): string {
  const explicit = el.getAttribute("data-analytics-label");
  if (explicit) return explicit;
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.trim();
  const text = (el.textContent || "").replace(/\s+/g, " ").trim();
  if (text) return text.slice(0, 80);
  const title = el.getAttribute("title");
  if (title) return title.trim();
  return "unlabeled";
}

/**
 * Delegated click tracking: every button, link, or [data-analytics-id]
 * element in the app reports a click without per-component wiring.
 */
export function initClickTracking() {
  if (typeof document === "undefined" || !isAnalyticsEnabled()) return () => {};

  const handler = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target || typeof target.closest !== "function") return;

    const el = target.closest<HTMLElement>(
      "button, a, [role='button'], [role='tab'], [data-analytics-id]",
    );
    if (!el) return;

    const id = el.getAttribute("data-analytics-id") || undefined;
    const label = labelFor(el);
    const tag = el.tagName.toLowerCase();
    const href = el.getAttribute("href") || undefined;
    const isExternal = Boolean(href && /^https?:\/\//i.test(href) && !href.includes(location.host));

    if (isExternal) {
      trackEvent("click_outbound", {
        link_url: href,
        link_text: label,
        page_path: location.pathname,
      });
      return;
    }

    trackEvent("ui_click", {
      element_id: id,
      element_label: label,
      element_type: tag,
      link_url: href,
      page_path: location.pathname,
    });
  };

  document.addEventListener("click", handler, { capture: true });
  return () => document.removeEventListener("click", handler, { capture: true });
}
