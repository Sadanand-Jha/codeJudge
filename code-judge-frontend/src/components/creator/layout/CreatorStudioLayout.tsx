"use client";

import { useState, useEffect, Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CreatorSidebar } from "./CreatorSidebar";
import CreatorNavbar from "./CreatorNavbar";
import CreatorRoomsNavbar from "@/components/rooms/CreatorRoomsNavbar";
import AppLayout from "@/components/layout/AppLayout";
import { SecureLogo, LOADING_LOGO_SIZE } from "@/components/common/SecureLogo";
import { useAuthStore } from "@/store/authStore";
import { useAICreditsStore } from "@/store/aiCreditsStore";
import { useTheme } from "@/context/ThemeContext";

export default function CreatorStudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refreshCredits = useAICreditsStore((s) => s.refresh);
  const { theme, setTheme } = useTheme();

  // Studio is light-theme only (no toggle in the Studio navbar). Dark-mode
  // styling across Studio components is intentionally left untouched.
  useEffect(() => {
    if (theme === "dark") setTheme("light");
  }, [theme, setTheme]);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, router]);

  // Load the credit balance as soon as the creator enters the Studio so the
  // navbar credit pill is accurate without visiting a billing page first.
  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      void refreshCredits();
    }
  }, [hasHydrated, isAuthenticated, refreshCredits]);

  if (!hasHydrated) {
    return (
      <AppLayout>
        <div className="qs-ui flex min-h-screen items-center justify-center bg-[var(--qs-bg)]">
          <SecureLogo variant="mark" size={LOADING_LOGO_SIZE} className="animate-pulse motion-reduce:animate-none" />
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="qs-ui flex min-h-screen items-center justify-center bg-[var(--qs-bg)]">
          <SecureLogo variant="mark" size={LOADING_LOGO_SIZE} className="animate-pulse motion-reduce:animate-none" />
        </div>
      </AppLayout>
    );
  }

  const isPreview = pathname.includes("/preview");
  const isRoomsWorkspace = pathname === "/creator/rooms" || pathname.startsWith("/creator/rooms/");

  // Quiz Studio create/edit routes render their own full-bleed StudioHeader +
  // StudioStepper, so the shared content padding (py-4) would leave an empty
  // blank strip above the header — render those routes edge-to-edge instead.
  const isFullBleedStudio =
    pathname === "/creator/quizzes/create" ||
    /^\/creator\/quizzes\/[^/]+\/edit$/.test(pathname);

  if (isPreview) {
    return (
      <div className="flex flex-1 min-h-0 bg-background h-full">
        <main className="flex-1 min-h-0 h-full">
          {children}
        </main>
      </div>
    );
  }

  return (
    <AppLayout header={<CreatorNavbar onMobileMenuToggle={() => setDrawerOpen(true)} />}>
      <div className="qs-ui creator-mobile-calm flex min-h-0 flex-1 bg-[var(--qs-bg)]">
        {/* Mobile drawer overlay */}
        <AnimatePresence>
          {drawerOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/60 lg:hidden"
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
              className="fixed inset-y-0 left-0 z-[80] w-[min(280px,calc(100vw-2rem))] border-r-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] lg:hidden"
            >
              <CreatorSidebar pathname={pathname} mobile onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          )}
        </AnimatePresence>

        <aside data-sidebar="true" className="hidden w-60 shrink-0 border-r-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] lg:block">
          <CreatorSidebar pathname={pathname} />
        </aside>

        {/* Main content */}
        <div data-studio="true" className="flex min-h-0 min-w-0 flex-1 flex-col">
          {isRoomsWorkspace ? (
            <Suspense fallback={null}>
              <CreatorRoomsNavbar />
            </Suspense>
          ) : null}
          <main
            className={
              isFullBleedStudio
                ? "flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden"
                : "px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6 flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden"
            }
          >
            {children}
          </main>
        </div>
      </div>
    </AppLayout>
  );
}
