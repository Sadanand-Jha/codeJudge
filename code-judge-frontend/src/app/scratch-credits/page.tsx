"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { CreatorSidebar } from "@/components/creator/layout/CreatorSidebar";
import { BillingSubnav } from "@/components/creator/billing/BillingSubnav";
import { AICreditsPage } from "@/components/creator/billing/AICreditsPage";
import { CreditPackCheckout } from "@/components/creator/billing/CreditPackCheckout";

function ScratchContent() {
  const params = useSearchParams();
  const view = params.get("view") ?? "packs";
  const pathname = "/creator/billing/credits";
  const [drawerOpen, setDrawerOpen] = useState(params.get("drawer") === "1");

  return (
    <div className="min-h-dvh w-full min-w-0 bg-ai-bg flex" data-ai-scope>
      <div className="flex-1 w-0 min-w-0 flex flex-col h-dvh overflow-hidden">
        <header className="flex h-14 shrink-0 items-center border-b border-ai-border bg-ai-bg px-3">
          <button
            type="button"
            aria-label="Open Studio navigation"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-[var(--qs-muted)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>
        <main className="min-w-0 w-full flex-1 min-h-0 flex flex-col">
          <div className="qs-ui creator-mobile-calm flex min-h-0 flex-1 bg-[var(--qs-bg)]">
            <AnimatePresence>
              {drawerOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[70] bg-[#1a1240]/50 backdrop-blur-sm"
                  onClick={() => setDrawerOpen(false)}
                />
              )}
            </AnimatePresence>
            <AnimatePresence>
              {drawerOpen && (
                <motion.aside
                  initial={{ x: -320 }}
                  animate={{ x: 0 }}
                  exit={{ x: -320 }}
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  className="fixed inset-y-0 left-0 z-[80] w-[min(264px,calc(100vw-2rem))] border-r-2 border-[var(--qs-line)] bg-[var(--qs-surface)] shadow-2xl"
                >
                  <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setDrawerOpen(false)}
                    className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--qs-muted)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <CreatorSidebar pathname={pathname} mobile onNavigate={() => setDrawerOpen(false)} />
                </motion.aside>
              )}
            </AnimatePresence>
            <div data-studio="true" className="flex-1 flex min-h-0 min-w-0">
              <main className="px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6 flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
                <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-20 sm:px-6">
                  <BillingSubnav />
                  <div className="space-y-6 pt-4">
                    {view === "checkout" ? (
                      <CreditPackCheckout initialPackId="teacher" processing={false} onPay={() => {}} />
                    ) : (
                      <AICreditsPage />
                    )}
                  </div>
                </div>
              </main>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ScratchCreditsPage() {
  return (
    <Suspense>
      <ScratchContent />
    </Suspense>
  );
}
