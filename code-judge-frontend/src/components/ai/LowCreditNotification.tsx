"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Sparkles, ShoppingCart, X } from "lucide-react";
import { useAICreditsStore, checkLowCreditWarning, getRecommendedPack } from "@/store/aiCreditsStore";
import { CREDIT_PACKS } from "@/config/aiCredits";

export default function LowCreditNotification() {
  const { balance, purchasePack } = useAICreditsStore();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isLow = checkLowCreditWarning(balance.remaining, balance.monthlyAllowance);
  const recommended = getRecommendedPack(balance.remaining, balance.monthlyAllowance);

  useEffect(() => {
    // Show notification if low credits and not dismissed
    if (isLow && !dismissed && balance.monthlyAllowance > 0) {
      setVisible(true);
    }
  }, [isLow, dismissed, balance.monthlyAllowance]);

  const handleBuyCredits = async (packId: string) => {
    await purchasePack(packId);
    setVisible(false);
    setDismissed(true);
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-16 right-4 z-50 w-80 rounded-2xl border border-[#EF4444]/30 bg-gradient-to-br from-[#EF4444]/10 to-[#F59E0B]/10 p-4 shadow-2xl backdrop-blur-xl"
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 rounded-full p-1 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Icon and title */}
          <div className="flex items-start gap-3 mb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EF4444]/20">
              <AlertTriangle className="h-5 w-5 text-[#EF4444]" />
            </div>
            <div className="flex-1 pr-6">
              <h3 className="text-[12px] font-bold text-text-primary">Low AI Credits</h3>
              <p className="text-[10px] text-text-secondary mt-0.5">
                You have <span className="font-bold text-text-primary">{balance.remaining}</span> credits left
              </p>
            </div>
          </div>

          {/* Recommended pack */}
          {recommended && (
            <div className="rounded-xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 p-3 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-text-primary">{recommended.name}</div>
                  <div className="text-[10px] text-text-muted">{recommended.credits} credits</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-text-primary">₹{recommended.price}</div>
                </div>
              </div>
              <button
                onClick={() => handleBuyCredits(recommended.id)}
                className="mt-2 w-full rounded-lg bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-3 py-1.5 text-[11px] font-bold text-white shadow-[0_2px_10px_rgba(236,72,153,0.3)] transition-all hover:shadow-[0_4px_16px_rgba(236,72,153,0.45)]"
              >
                Buy Now
              </button>
            </div>
          )}

          {/* View all packs link */}
          <button
            onClick={() => {
              window.location.href = "/pricing";
            }}
            className="text-[10px] font-semibold text-accent hover:text-accent-secondary transition-colors flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" />
            View all credit packs
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}