"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { ToastCard } from "./ToastCard";
import { useToastStore } from "@/store/toastStore";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const isMobile = useMediaQuery("(max-width: 639px)");
  const mobileStackRef = useRef<HTMLDivElement>(null);

  // Keep the page content pushed down by the height of the mobile banner
  // stack, so notifications feel attached to the top of the screen instead
  // of covering what the student is reading.
  useEffect(() => {
    const root = document.documentElement;
    const el = mobileStackRef.current;

    if (!el) {
      root.classList.remove("mobile-toast-open");
      root.style.removeProperty("--mobile-toast-offset");
      return;
    }

    const syncOffset = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      root.style.setProperty("--mobile-toast-offset", `${height}px`);
      root.classList.toggle("mobile-toast-open", height > 0);
    };

    syncOffset();
    const observer = new ResizeObserver(syncOffset);
    observer.observe(el);

    return () => {
      observer.disconnect();
      root.classList.remove("mobile-toast-open");
      root.style.removeProperty("--mobile-toast-offset");
    };
  }, [isMobile]);

  if (isMobile) {
    return (
      <div
        ref={mobileStackRef}
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 top-0 z-[9999] flex w-full flex-col"
      >
        <AnimatePresence mode="sync" initial={false}>
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto w-full">
              <ToastCard toast={toast} mobile />
            </div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] flex flex-col items-center gap-3 p-4 sm:items-end"
    >
      <div className="flex w-full flex-col gap-3 sm:w-auto">
        <AnimatePresence mode="popLayout" initial={false}>
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto w-full sm:w-[400px] md:w-[420px]"
            >
              <ToastCard toast={toast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
