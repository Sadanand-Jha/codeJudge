"use client";

import { useEffect } from "react";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";

/** Locks page scrolling while `active` is true. Safe to nest. */
export function useBodyScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [active]);
}
