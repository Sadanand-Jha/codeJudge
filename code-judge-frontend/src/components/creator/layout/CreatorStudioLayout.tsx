"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { CreatorSidebar } from "./CreatorSidebar";
import AppLayout from "@/components/layout/AppLayout";
import { useAuthStore } from "@/store/authStore";

export default function CreatorStudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  if (!hasHydrated) {
    return (
      <AppLayout>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex min-h-screen bg-background">
        {/* Mobile drawer overlay */}
        <AnimatePresence>
          {drawerOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Mobile drawer sidebar */}
        <AnimatePresence>
          {drawerOpen && (
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 w-[264px] border-r border-border bg-card shadow-2xl lg:hidden"
            >
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-white/[0.06]"
              >
                <X className="h-4 w-4" />
              </button>
              <CreatorSidebar pathname={pathname} mobile onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Creator Studio Sidebar (second sidebar — sticky) */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-border bg-card lg:block">
          <CreatorSidebar pathname={pathname} />
        </aside>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <main
            className={
              pathname.startsWith("/creator/quizzes/create") || pathname.startsWith("/creator/quizzes/ai-generate")
                ? "px-4 pt-0 pb-6 sm:px-6 lg:px-8"
                : "px-4 py-6 sm:px-6 lg:px-8"
            }
          >
            {children}
          </main>
        </div>
      </div>
    </AppLayout>
  );
}
