"use client";

import { useState, useEffect } from "react";

/**
 * Subscribe to a CSS media query and return its current boolean state.
 *
 * During SSR (or before the effect runs) the `defaultValue` is returned so
 * that server and first-client renders stay in sync — this prevents
 * hydration mismatches for components that depend on the result.
 *
 * @param query        A CSS media query string, e.g. "(max-width: 768px)".
 * @param defaultValue The value to use before the first `useEffect` fires.
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState<boolean>(defaultValue);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(query);

    const update = () => setMatches(mediaQueryList.matches);
    update();

    // Modern browsers support addEventListener/removeEventListener on
    // MediaQueryList. Fall back to the deprecated addListener/removeListener
    // for older browsers (e.g. Safari < 14).
    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", update);
      return () => mediaQueryList.removeEventListener("change", update);
    }

    mediaQueryList.addListener(update);
    return () => mediaQueryList.removeListener(update);
  }, [query]);

  return matches;
}

export default useMediaQuery;
