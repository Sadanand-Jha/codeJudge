"use client";

import { AnimatePresence } from "framer-motion";
import { ToastCard } from "./ToastCard";
import { useToastStore } from "@/store/toastStore";

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

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
              className="pointer-events-auto w-full sm:w-[400px] md:w-[420px] max-sm:w-[calc(100%-32px)] max-sm:mx-auto"
            >
              <ToastCard toast={toast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}