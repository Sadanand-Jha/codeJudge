"use client";

import { useState, useCallback } from "react";
import { useAICreditConsumption } from "@/hooks/useAICreditConsumption";
import { toast } from "@/lib/toast";

/* ============================================
   Example: AI Hint Feature with Credit Consumption
   ============================================ */
export default function AIHintExample() {
  const { consume, refund, completeRequest, balance, isLowCredit, recommendedPack } = useAICreditConsumption();
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const generateHash = useCallback((text: string) => {
    // Simple hash for demo purposes
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }, []);

  const handleGetHint = async () => {
    setLoading(true);
    setHint(null);

    // Generate a simple hash of the prompt for abuse detection
    const promptHash = generateHash("two sum problem hint");

    // Consume credits before making the request
    const result = await consume("ai-hint", {
      promptHash,
      onInsufficientCredits: () => {
        toast.error("Not enough AI credits", {
          description: recommendedPack 
            ? `We recommend the ${recommendedPack.name} pack (${recommendedPack.credits} credits for ₹${recommendedPack.price})`
            : "Please purchase a credit pack to continue.",
        });
      },
      onError: (reason, message) => {
        if (reason === "abuse_detected") {
          toast.warning("Slow down", { description: message });
        } else {
          toast.error("Failed to get hint", { description: message });
        }
      },
    });

    if (!result.allowed) {
      setLoading(false);
      return;
    }

    try {
      // Simulate AI API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate successful hint generation
      const hints = [
        "Try using a hash map to store the complement of each number.",
        "Think about the two-pointer technique for sorted arrays.",
        "Consider the time complexity - can you do better than O(n²)?",
        "What if you sort the array first? How would that help?",
      ];

      setHint(hints[Math.floor(Math.random() * hints.length)]);
      toast.success("Hint generated!", { description: "1 credit consumed" });
    } catch (error) {
      // Refund credits on failure
      await refund("ai-hint");
      toast.error("Failed to generate hint. Credits refunded.");
    } finally {
      completeRequest();
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">AI Hint</h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            Get a progressive hint without revealing the solution
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-text-muted">Cost</div>
          <div className="text-sm font-bold text-accent">1 Credit</div>
        </div>
      </div>

      {/* Credit status */}
      <div className="flex items-center gap-2 rounded-xl bg-card-hover px-3 py-2">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-text-secondary">Your Balance</span>
            <span className={`font-semibold ${isLowCredit ? "text-[#EF4444]" : "text-text-primary"}`}>
              {balance.remaining} / {balance.monthlyAllowance}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-card-hover overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isLowCredit ? "bg-gradient-to-r from-[#EF4444] to-[#F59E0B]" : "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899]"}`}
              style={{ width: `${balance.monthlyAllowance > 0 ? (balance.remaining / balance.monthlyAllowance) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Low credit warning */}
      {isLowCredit && (
        <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2">
          <p className="text-[10px] text-[#EF4444] font-medium">
            You're running low on credits. Consider purchasing more.
          </p>
        </div>
      )}

      {/* Hint display */}
      {hint && (
        <div className="rounded-xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-4 py-3">
          <div className="flex items-start gap-2">
            <div className="text-[#8B5CF6] mt-0.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <p className="text-[11px] text-text-primary flex-1">{hint}</p>
          </div>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={handleGetHint}
        disabled={loading || !balance.hasActiveSubscription}
        className="w-full rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] transition-all hover:shadow-[0_6px_24px_rgba(236,72,153,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating hint...
          </span>
        ) : (
          "Get AI Hint"
        )}
      </button>

      {/* Buy credits button when low */}
      {isLowCredit && (
        <button
          onClick={() => {
            toast.info("Coming soon!", { description: "Credit pack purchase will be available shortly." });
          }}
          className="w-full rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-[12px] font-bold text-accent transition-all hover:bg-accent/20"
        >
          Buy Credits
        </button>
      )}
    </div>
  );
}