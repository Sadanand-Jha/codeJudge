"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useAICreditsStore, checkLowCreditWarning } from "@/store/aiCreditsStore";
import { usePricingCatalog } from "@/hooks/usePricingCatalog";
import { formatPricingAmount } from "@/services/pricing";
import { CreditCoin } from "@/components/creator/billing/CreditCoin";

export default function LowCreditNotification() {
  const pathname = usePathname();
  const inCreatorStudio = pathname?.startsWith("/creator") ?? false;
  const { balance } = useAICreditsStore();
  const { catalog } = usePricingCatalog();
  const [dismissed, setDismissed] = useState(false);

  const isLow = checkLowCreditWarning(balance.remaining, balance.monthlyAllowance);
  const usageRatio =
    balance.monthlyAllowance > 0 ? 1 - balance.remaining / balance.monthlyAllowance : 0;
  const recommended = catalog.creditPacks.length > 0
    ? [...catalog.creditPacks].sort((a, b) => {
        const aRate = a.credits > 0 ? a.price / a.credits : Number.POSITIVE_INFINITY;
        const bRate = b.credits > 0 ? b.price / b.credits : Number.POSITIVE_INFINITY;
        return usageRatio > 0.8 ? bRate - aRate : aRate - bRate;
      })[0]
    : null;
  const visible = !inCreatorStudio && isLow && !dismissed && balance.monthlyAllowance > 0;

  const handleBuyCredits = (packId: string) => {
    setDismissed(true);
    window.location.href = `/creator/billing/credits?pack=${encodeURIComponent(packId)}`;
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          className="fixed right-4 top-16 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[20px] border-2 border-[#e4ddff] bg-white/95 p-3.5 shadow-[0_24px_60px_-20px_rgba(40,25,120,0.45)] backdrop-blur-xl"
        >
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss low credit warning"
            className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-[#7c7899] transition-colors hover:bg-[#f3efff] hover:text-[#1e1b4b]"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-2.5 pr-7">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border border-[#f0d28a] bg-[#fff3d1]">
              <CreditCoin className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[13px] font-extrabold text-[#1e1b4b]">AI credits running low</h3>
              <p className="mt-0.5 text-[11px] font-medium text-[#5b5780]">
                You have{" "}
                <span className="font-bold text-[#1e1b4b]">
                  {balance.remaining.toLocaleString("en-IN")}
                </span>{" "}
                credits left this month.
              </p>
            </div>
          </div>

          {recommended && (
            <div className="mt-3 rounded-[14px] border border-[#f0d28a] bg-[#fffaf0] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#1e1b4b]">
                    <CreditCoin className="h-4 w-4 shrink-0" />
                    <span className="truncate">{recommended.name}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-[#6b5a2b]">
                    {recommended.credits.toLocaleString("en-IN")} AI credits
                  </div>
                </div>
                <div className="shrink-0 text-[17px] font-extrabold text-[#1e1b4b]">
                  {formatPricingAmount(recommended.price)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleBuyCredits(recommended.id)}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-[linear-gradient(135deg,#8b6cff,#5b3fe8)] px-3 py-2 text-[11.5px] font-bold !text-white shadow-[0_8px_20px_-10px_rgba(123,92,255,0.9)] transition-all hover:brightness-110 active:translate-y-px"
              >
                Buy credits now
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              window.location.href = "/creator/billing/credits";
            }}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[10px] px-2 py-1.5 text-[11px] font-bold text-[#5b3fe8] transition-colors hover:bg-[#f3efff]"
          >
            <Sparkles className="h-3 w-3" />
            View all credit packs
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}