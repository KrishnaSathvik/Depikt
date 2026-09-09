import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { initAnalytics, initClickTracking, trackPageview } from "@/lib/analytics";

/**
 * Boots Google Analytics, tracks SPA route changes, and records
 * every button/link click through delegated tracking.
 */
export function Analytics() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });

  useEffect(() => {
    initAnalytics();
    return initClickTracking();
  }, []);

  useEffect(() => {
    // Let the route's head() apply before reading document.title.
    const id = window.setTimeout(() => {
      trackPageview(`${pathname}${search ? `?${search.replace(/^\?/, "")}` : ""}`);
    }, 50);
    return () => window.clearTimeout(id);
  }, [pathname, search]);

  return null;
}
