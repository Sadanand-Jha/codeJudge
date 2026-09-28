"use client";

import { useMediaQuery } from "./useMediaQuery";

/**
 * True on phones and coarse-pointer (touch) devices where heavy
 * canvas / blur / infinite-loop animations jank.
 * SSR-safe: returns `defaultValue` until the first client effect runs,
 * so server and first-client renders stay in sync (no hydration mismatch).
 */
export function useIsMobile(defaultValue = false): boolean {
  return useMediaQuery("(max-width: 640px), (pointer: coarse)", defaultValue);
}

export default useIsMobile;
